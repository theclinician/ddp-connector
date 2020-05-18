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

const noop = () => {};

const useDDPQuery = (request, options = {}) => {
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
  const selectQuery = useMemo(
    () => createQuerySelector(nextRequest),
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
        throw new Error('Query request must be a plain object');
      }
      const {
        resource,
      } = ddpConnector
        .queryManager
        .getOrCreateResource(currentRequest);
      let handle = resource.require();
      if (onReady || onError) {
        handle.promise.then(onReady, onError);
      }
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
