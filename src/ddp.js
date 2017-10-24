import React from 'react';
import PropTypes from 'prop-types';
import EJSON from 'ejson';
import { connect } from 'react-redux';
import {
  debounce,
} from '@theclinician/toolbelt';
import DDPConnector from './DDPConnector.js';
import {
  makeGetSubscriptionsReady,
  makeGetQueriesValues,
  makeGetQueriesReady,
} from './selectors.js';
import {
  createIdGenerator,
  wrapMapState,
} from './utils.js';

const uniqueId = createIdGenerator('listener.');
const increase = (key, value) => prevState => ({
  ...prevState,
  [key]: (prevState[key] || 0) + value,
});

const ddp = ({
  subscriptions: makeMapStateToSubscriptions,
  queries: makeMapStateToQueries,
  messages = {},
  mutations = {},
}, {
  onMutationError,
  renderLoader = defaultComponent => React.createElement(defaultComponent),
  getResourceId = params => EJSON.stringify(params),
  queriesUpdateDelay,
  subscriptionsUpdateDalay,
} = {}) => (Inner) => {
  const propTypes = {
    subscriptions: PropTypes.array,
    queries: PropTypes.object,
    subscriptionsReady: PropTypes.bool,
    queriesReady: PropTypes.bool,
  };

  const defaultProps = {
    subscriptions: [],
    queries: {},
    subscriptionsReady: true,
    queriesReady: true,
  };

  const contextTypes = {
    ddpConnector: PropTypes.instanceOf(DDPConnector),
  };

  class Container extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        numberOfPendingMutations: 0,
      };
      const mutate = (request) => {
        if (request) {
          const { name, params } = request;
          this.beginMutation();
          return this.ddpConnector.apply(name, params, {})
            .then(res => this.endMutation(res))
            .catch((err) => {
              this.endMutation();
              if (onMutationError) {
                onMutationError(err);
              } else {
                throw err;
              }
            });
        }
        return Promise.resolve();
      };

      this.handlers = {};
      Object.keys(mutations).forEach((key) => {
        this.handlers[key] = (...args) => mutations[key]({
          ...this.props,
          mutate,
        })(...args);
      });

      this.messageHandlers = {};
      Object.keys(messages).forEach((key) => {
        this.messageHandlers[key] = (...args) => messages[key](this.props)(...args);
      });
    }

    componentWillMount() {
      this.id = uniqueId();
      this.ddpConnector = this.context.ddpConnector;

      this.updateSubscriptions = debounce(subscriptions =>
        this.ddpConnector.subsManager.updateRequests(this.id, subscriptions),
        {
          ms: subscriptionsUpdateDalay !== undefined ? subscriptionsUpdateDalay : this.ddpConnector.resourceUpdateDelay,
        },
      );

      this.updateQueries = debounce(queries =>
        this.ddpConnector.queryManager.updateRequests(this.id, Object.keys(queries).map(key => queries[key])),
        {
          ms: queriesUpdateDelay !== undefined ? queriesUpdateDelay : this.ddpConnector.resourceUpdateDelay,
        },
      );

      this.messagesListeners = Object.keys(this.messageHandlers)
        .map(channel => this.ddpConnector.on(`messages.${channel}`, this.messageHandlers[channel]));
    }

    componentDidMount() {
      this.updateSubscriptions(this.props.subscriptions);
      this.updateQueries(this.props.queries);
    }

    componentWillReceiveProps(newProps) {
      this.updateSubscriptions(newProps.subscriptions);
      this.updateQueries(newProps.queries);
    }

    componentWillUnmount() {
      this.updateSubscriptions([]);
      this.updateQueries([]);
      if (this.messagesListeners) {
        this.messagesListeners.forEach(stop => stop());
        this.messagesListeners = null;
      }
    }

    beginMutation() {
      this.setState(increase('numberOfPendingMutations', 1));
    }

    endMutation(result) {
      this.setState(increase('numberOfPendingMutations', -1));
      return result;
    }

    render() {
      const { ddpConnector } = this.context;
      const {
        numberOfPendingMutations,
      } = this.state;
      const {
        subscriptionsReady,
        queriesReady,
        queries,
        subscriptions,
        ...other
      } = this.props;
      const mutationsReady = numberOfPendingMutations <= 0;
      if (renderLoader &&
        (
          !subscriptionsReady ||
          !mutationsReady ||
          !queriesReady
        )
      ) {
        return renderLoader(ddpConnector.getLoaderComponent(), {
          ...other,
          subscriptionsReady,
          mutationsReady,
          queriesReady,
        });
      }
      return React.createElement(Inner, {
        ...other,
        ...this.handlers,
        queriesReady,
        mutationsReady,
        subscriptionsReady,
      });
    }
  }

  Container.propTypes = propTypes;
  Container.defaultProps = defaultProps;
  Container.contextTypes = contextTypes;

  if (process.env.NODE_ENV !== 'production') {
    Container.displayName = `ddp(${Inner.displayName})`;
  }

  const wrappedMapStateToSubscriptions = wrapMapState(makeMapStateToSubscriptions);
  const wrappedMapStateToQueries = wrapMapState(makeMapStateToQueries);

  return connect(
    () => {
      const getSubscriptionsReady = makeGetSubscriptionsReady((_, x) => getResourceId(x));
      const getQueriesValues = makeGetQueriesValues((_, x) => getResourceId(x));
      const getQueriesReady = makeGetQueriesReady((_, x) => getResourceId(x));
      //----------------------------------------------------------------------
      return (state, ownProps) => {
        const subscriptions = wrappedMapStateToSubscriptions(state, ownProps) || [];
        const queries = wrappedMapStateToQueries(state, ownProps) || {};
        return {
          ...getQueriesValues(state, queries),
          subscriptions,
          queries,
          subscriptionsReady: getSubscriptionsReady(state, { subscriptions }),
          queriesReady: getQueriesReady(state, { queries }),
        };
      };
    },
  )(Container);
};

export default ddp;
