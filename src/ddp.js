import React from 'react';
import EJSON from 'ejson';
import { connect } from 'react-redux';
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
import {
  debounce,
} from './debounce.js';

const uniqueId = createIdGenerator('listener.');

const ddp = ({
  subscriptions: makeMapStateToSubscriptions,
  queries: makeMapStateToQueries,
  mutations = {},
}, {
  onMutationError,
  getResourceId = params => EJSON.stringify(params),
  getLoaderComponent = defaultComponent => defaultComponent,
} = {}) => (Inner) => {
  const propTypes = {
    subscriptions: React.PropTypes.array,
    queries: React.PropTypes.object,
    subscriptionsReady: React.PropTypes.bool,
    queriesReady: React.PropTypes.bool,
  };

  const defaultProps = {
    subscriptions: [],
    queries: {},
    subscriptionsReady: true,
    queriesReady: true,
  };

  const contextTypes = {
    ddpConnector: React.PropTypes.instanceOf(DDPConnector),
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
        this.handlers[key] = (...args) => {
          mutations[key]({
            ...this.props,
            mutate,
          })(...args);
        };
      });
    }

    componentWillMount() {
      this.id = uniqueId();
      this.ddpConnector = this.context.ddpConnector;

      this.updateSubscriptions = debounce(subscriptions =>
        this.ddpConnector.subsManager.updateRequests(this.id, subscriptions),
        {
          ms: this.ddpConnector.resourceUpdateDelay,
        },
      );

      this.updateQueries = debounce(queries =>
        this.ddpConnector.queryManager.updateRequests(this.id, Object.keys(queries).map(key => queries[key])),
        {
          ms: this.ddpConnector.resourceUpdateDelay,
        },
      );
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
    }

    beginMutation() {
      this.setState({
        numberOfPendingMutations: this.state.numberOfPendingMutations + 1,
      });
    }

    endMutation(result) {
      this.setState({
        numberOfPendingMutations: this.state.numberOfPendingMutations - 1,
      });
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
      if (getLoaderComponent &&
        (
          !subscriptionsReady ||
          !mutationsReady ||
          !queriesReady
        )
      ) {
        return React.createElement(getLoaderComponent(ddpConnector.getLoaderComponent()));
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
  Container.displayName = `ddp(${Inner.displayName})`;

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
