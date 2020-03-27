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

const createQueriesSelector = createResourcesSelectorFactory('query');

const constant = x => () => x;
const createQuerySelector = request => createSelector(
  createQueriesSelector(
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

const useDDPQuery = (request, options) => {
  const ddpConnector = useContext(DDPContext);
  const [
    currentRequest,
    nextRequest,
  ] = useDebounce(
    request,
    options && options.debounceMs,
  );
  const selectQuery = useMemo(
    () => createQuerySelector(nextRequest),
    [
      nextRequest,
    ],
  );
  useEffect(
    () => {
      const {
        resource,
      } = ddpConnector
        .queryManager
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
  return useSelector(selectQuery);
};

export default useDDPQuery;
