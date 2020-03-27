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
import useReconcile from './useReconcile';
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

const useDDPSubscription = (request) => {
  const ddpConnector = useContext(DDPContext);
  const currentRequest = useReconcile(request);
  const selectSubscription = useMemo(
    () => createSubscriptionSelector(currentRequest),
    [
      currentRequest,
    ],
  );
  useEffect(
    () => {
      const {
        resource,
      } = ddpConnector
        .subsManager
        .getOrCreateResource(currentRequest);
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
