import isNil from 'lodash/isNil';
import isPlainObject from 'lodash/isPlainObject';
import {
  useMemo,
  useEffect,
  useContext,
} from 'react';
import {
  useSelector,
} from 'react-redux';
import {
  createSelector,
} from 'reselect';
import {
  DDPContext,
} from './DDPProvider';
import useDebounce from './useDebounce';
import createResourcesSelectorFactory from './selectors/createResourcesSelectorFactory';

const createSubscriptionsSelector = createResourcesSelectorFactory('subscriptions');

const constant = x => () => x;
const createSubscriptionSelector = request => createSelector(
  createSubscriptionsSelector(
    constant([
      request,
    ]),
    (state, id) => ({
      id,
      ...state,
    }),
  ),
  subscriptions => subscriptions[0],
);

const noop = () => {};

const useDDPSubscription = (request, options = {}) => {
  const {
    onReady,
    onError,
    debounceMs,
  } = options;
  const ddpConnector = useContext(DDPContext);
  const [
    currentRequest,
    nextRequest,
  ] = useDebounce(
    request,
    debounceMs,
  );
  const selectSubscription = useMemo(
    () => createSubscriptionSelector(nextRequest),
    [
      nextRequest,
    ],
  );
  useEffect(
    () => {
      if (isNil(currentRequest)) {
        return noop;
      }
      if (!isPlainObject(currentRequest)) {
        throw new Error('Subscription request must be a plain object');
      }
      const {
        resource,
      } = ddpConnector
        .subsManager
        .getOrCreateResource(currentRequest, {
          onReady,
          onError,
        });
      let handle = resource.require();
      return () => {
        if (handle) {
          handle.release();
          handle = null;
        }
      };
    },
    [
      currentRequest,
    ],
  );
  return useSelector(selectSubscription);
};

export default useDDPSubscription;
