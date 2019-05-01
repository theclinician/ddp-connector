import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import every from 'lodash/every';
import forEach from 'lodash/forEach';
import isPlainObject from 'lodash/isPlainObject';
import map from 'lodash/map';
import isArray from 'lodash/isArray';
import mapValues from 'lodash/mapValues';
import isEmpty from 'lodash/isEmpty';
import {
  debounce,
} from '@theclinician/toolbelt';
import {
  toSelector,
  createDeepEqualSelector,
  createShallowEqualSelector,
} from '@theclinician/selectors';
import DDPConnector from './DDPConnector';
import { DDPContext } from './DDPProvider';
import createResourcesSelectorFactory from './selectors/createResourcesSelectorFactory';
import {
  createIdGenerator,
  wrapMapState,
} from './utils';

const uniqueId = createIdGenerator('listener.');
const constant = x => () => x;
const increase = (key, value) => prevState => ({
  ...prevState,
  [key]: (prevState[key] || 0) + value,
});

const createSubscriptionsSelector = createResourcesSelectorFactory('subscriptions');
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
    loader,
    renderLoader = defaultComponent => React.createElement(defaultComponent),
    queriesUpdateDelay,
    subscriptionsUpdateDelay,
  } = {
    ...ddpOptions,
    ...ddpOptionsMore, // this is here to support legacy style, when options were split into two groups
  };

  if (!isEmpty(ddpOptionsMore)) {
    console.warn('Please specify ddp options in a single object only; ddp({}, {}) syntax is deprecated.');
  }

  const collection = PropTypes.oneOfType([
    PropTypes.objectOf(
      PropTypes.any,
    ),
    PropTypes.arrayOf(
      PropTypes.any,
    ),
  ]);

  const propTypes = {
    ddpConnector: PropTypes.instanceOf(DDPConnector).isRequired,
    requestedSubscriptions: collection,
    requestedQueries: collection,
    subscriptionsReady: PropTypes.bool,
    queriesReady: PropTypes.bool,
  };

  const defaultProps = {
    subscriptionsReady: true,
    queriesReady: true,
  };

  class Container extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        numberOfPendingMutations: 0,
      };
      const mutate = (request, options) => {
        const {
          ddpConnector,
        } = this.props;
        if (request) {
          const { name, params } = request;
          this.beginMutation();
          return ddpConnector.apply(name, params, options)
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
      const {
        ddpConnector,
      } = this.props;
      this.id = uniqueId();

      this.updateSubscriptions = debounce(
        (subscriptions) => {
          if (!this.unmounted) {
            ddpConnector.subsManager.updateRequests(this.id, subscriptions);
          }
        },
        {
          ms: subscriptionsUpdateDelay !== undefined ? subscriptionsUpdateDelay : ddpConnector.resourceUpdateDelay,
        },
      );

      this.updateQueries = debounce(
        (queries) => {
          if (!this.unmounted) {
            ddpConnector.queryManager.updateRequests(this.id, queries);
          }
        },
        {
          ms: queriesUpdateDelay !== undefined ? queriesUpdateDelay : ddpConnector.resourceUpdateDelay,
        },
      );

      this.messagesListeners = map(
        this.messageHandlers,
        (messageHandler, channel) => ddpConnector.on(`messages.${channel}`, messageHandler),
      );

      this.updateSubscriptions(this.props.requestedSubscriptions);
      this.updateQueries(this.props.requestedQueries);
    }

    componentDidUpdate() {
      this.updateSubscriptions(this.props.requestedSubscriptions);
      this.updateQueries(this.props.requestedQueries);
    }

    componentWillUnmount() {
      const {
        ddpConnector,
      } = this.props;
      ddpConnector.subsManager.updateRequests(this.id, []);
      ddpConnector.queryManager.updateRequests(this.id, []);
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
      const {
        numberOfPendingMutations,
      } = this.state;
      const {
        ddpConnector,
        subscriptionsReady,
        queriesReady,
        requestedSubscriptions,
        requestedQueries,
        ...other
      } = this.props;
      const mutationsReady = numberOfPendingMutations <= 0;
      const Loader = loader === undefined ? ddpConnector.getLoaderComponent() : loader;
      if (
        Loader &&
        renderLoader &&
        (
          !subscriptionsReady ||
          !mutationsReady ||
          !queriesReady
        )
      ) {
        return renderLoader(Loader, {
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

  if (process.env.NODE_ENV !== 'production') {
    Container.displayName = `ddp(${Inner.displayName})`;
  }

  const defaultValue = x => y => y || x;
  const setResourceId = (resource, id) => ({ id, ...resource });

  return connect(
    () => {
      const selectRequestedSubscriptions = wrapMapState(makeMapStateToSubscriptions);
      const selectRequestedQueries = wrapMapState(makeMapStateToQueries);

      const selectSubscriptions = createSubscriptionsSelector(selectRequestedSubscriptions, setResourceId);
      const selectQueries = createQueriesSelector(selectRequestedQueries, setResourceId);

      const getSubscriptionsReady = createShallowEqualSelector(
        selectSubscriptions,
        subscriptions => every(subscriptions, 'ready'),
      );
      const getQueriesReady = createShallowEqualSelector(
        selectQueries,
        queries => every(queries, 'ready'),
      );
      const getQueriesValues = createShallowEqualSelector(
        selectQueries,
        (queries) => {
          if (isArray(queries)) {
            return {
              queries: map(queries, 'value'),
            };
          }
          return mapValues(queries, 'value');
        },
      );
      //-----------------------------------------------
      const getSubscriptions = createDeepEqualSelector(
        selectRequestedSubscriptions,
        defaultValue([]),
      );
      const getQueries = createDeepEqualSelector(
        selectRequestedQueries,
        defaultValue({}),
      );
      const getOtherValues = createSelectors
        ? toSelector(createSelectors({
          subscriptions: selectSubscriptions,
          queries: selectQueries,
        }))
        : constant({});
      return (state, ownProps) => {
        const requestedSubscriptions = getSubscriptions(state, ownProps);
        const requestedQueries = getQueries(state, ownProps);
        const queriesValues = getQueriesValues(state, ownProps);
        return {
          ...getOtherValues(state, ownProps),
          ...isPlainObject(queriesValues) && queriesValues, // it can be an array as well
          requestedSubscriptions,
          requestedQueries,
          subscriptionsReady: getSubscriptionsReady(state, ownProps),
          queriesReady: getQueriesReady(state, ownProps),
        };
      };
    },
  )(props => (
    <DDPContext.Consumer>
      {ddpConnector => (
        <Container
          {...props}
          ddpConnector={ddpConnector}
        />
      )}
    </DDPContext.Consumer>
  ));
};

export default ddp;
