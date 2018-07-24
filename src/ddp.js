import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import every from 'lodash/every';
import values from 'lodash/values';
import forEach from 'lodash/forEach';
import isPlainObject from 'lodash/isPlainObject';
import map from 'lodash/map';
import {
  debounce,
} from '@theclinician/toolbelt';
import DDPConnector from './DDPConnector';
import createResourcesSelectorFactory from './selectors/createResourcesSelectorFactory';
import {
  createIdGenerator,
  wrapMapState,
} from './utils';
import createDeepEqualSelector from './selectors/createDeepEqualSelector';
import createStructuredSelector from './selectors/createStructuredSelector';
import createShallowEqualSelector from './selectors/createShallowEqualSelector';

const uniqueId = createIdGenerator('listener.');
const constant = x => () => x;
const increase = (key, value) => prevState => ({
  ...prevState,
  [key]: (prevState[key] || 0) + value,
});

const createSeubscriptionsSelector = createResourcesSelectorFactory('subscriptions');
const createQueriesSelector = createResourcesSelectorFactory('queries');

const ddp = ({
  subscriptions: makeMapStateToSubscriptions,
  queries: makeMapStateToQueries,
  selectors: createSelectors,
  messages = {},
  mutations = {},
  ...ddpOptions
}, ddpOptionsMore) => (Inner) => {
  const {
    onMutationError,
    renderLoader = defaultComponent => React.createElement(defaultComponent),
    queriesUpdateDelay,
    subscriptionsUpdateDelay,
  } = {
    ...ddpOptions,
    ...ddpOptionsMore, // this is here to support legacy style, when options were split into two groups
  };

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
      const mutate = (request, options) => {
        if (request) {
          const { name, params } = request;
          this.beginMutation();
          return this.ddpConnector.apply(name, params, options)
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
      forEach(mutations, (mutation, key) => {
        this.handlers[key] = (...args) => mutation({
          ...this.props,
          ...this.handlers,
          mutate,
        })(...args);
      });

      this.messageHandlers = {};
      forEach(messages, (handleMessage, key) => {
        this.messageHandlers[key] = (...args) => handleMessage(this.props)(...args);
      });
    }

    componentDidMount() {
      this.id = uniqueId();
      this.ddpConnector = this.context.ddpConnector;

      this.updateSubscriptions = debounce(
        subscriptions => this.ddpConnector.subsManager.updateRequests(this.id, subscriptions),
        {
          ms: subscriptionsUpdateDelay !== undefined ? subscriptionsUpdateDelay : this.ddpConnector.resourceUpdateDelay,
        },
      );

      this.updateQueries = debounce(
        queries => this.ddpConnector.queryManager.updateRequests(this.id, values(queries)),
        {
          ms: queriesUpdateDelay !== undefined ? queriesUpdateDelay : this.ddpConnector.resourceUpdateDelay,
        },
      );

      this.messagesListeners = map(this.messageHandlers, (messageHandler, channel) =>
        this.ddpConnector.on(`messages.${channel}`, messageHandler));

      this.updateSubscriptions(this.props.subscriptions);
      this.updateQueries(this.props.queries);
    }

    componentDidUpdate() {
      this.updateSubscriptions(this.props.subscriptions);
      this.updateQueries(this.props.queries);
    }

    componentWillUnmount() {
      this.ddpConnector.subsManager.updateRequests(this.id, []);
      this.ddpConnector.queryManager.updateRequests(this.id, []);
      if (this.messagesListeners) {
        this.messagesListeners.forEach(stop => stop());
        this.messagesListeners = null;
      }
      this.unmounted = true;
    }

    beginMutation() {
      if (!this.unmounted) {
        this.setState(increase('numberOfPendingMutations', 1));
      }
    }

    endMutation(result) {
      if (!this.unmounted) {
        this.setState(increase('numberOfPendingMutations', -1));
      }
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

  const defaultValue = x => y => y || x;

  return connect(
    () => {
      const selectSubscriptions = wrapMapState(makeMapStateToSubscriptions);
      const selectQueries = wrapMapState(makeMapStateToQueries);
      const getSubscriptionsReady = createShallowEqualSelector(
        createSeubscriptionsSelector(selectSubscriptions),
        subscriptions => every(subscriptions, sub => sub && sub.ready),
      );
      const getQueriesReady = createShallowEqualSelector(
        createQueriesSelector(selectQueries),
        queries => every(queries, query => query && query.ready),
      );
      const getQueriesValues = createShallowEqualSelector(
        createQueriesSelector(selectQueries),
        queries => map(queries, query => query && query.value),
      );
      //-----------------------------------------------
      const getSubscriptions = createDeepEqualSelector(
        selectSubscriptions,
        defaultValue([]),
      );
      const getQueries = createDeepEqualSelector(
        selectQueries,
        defaultValue({}),
      );
      const getOtherValues = createSelectors
        ? createStructuredSelector(createSelectors())
        : constant({});
      return (state, ownProps) => {
        const subscriptions = getSubscriptions(state, ownProps);
        const queries = getQueries(state, ownProps);
        const queriesValues = getQueriesValues(state);
        return {
          ...getOtherValues(state, ownProps),
          ...isPlainObject(queriesValues) && queriesValues, // it can be an array as well
          subscriptions,
          queries,
          subscriptionsReady: getSubscriptionsReady(state, ownProps),
          queriesReady: getQueriesReady(state, ownProps),
        };
      };
    },
  )(Container);
};

export default ddp;
