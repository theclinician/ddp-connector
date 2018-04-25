import { createSelector, createSelectorCreator } from 'reselect';
import createEntitiesSelectors from './createEntitiesSelectors';
import createCurrentUserSelectors from './createCurrentUserSelectors';
import { defaultMemoize } from '../utils/memoize';

export {
  createEntitiesSelectors,
  createCurrentUserSelectors,
};

// subscriptions & queries

const constant = x => () => x;
const identity = x => x;
const property = name => (_, x) => x && x[name];

export const getIsConnected = state => !!state.ddp.status && state.ddp.status.connected;
export const getIsRestoring = state => !!state.ddp.status && state.ddp.status.restoring;

export const createArraySelector = createSelectorCreator(
  defaultMemoize,
  (a, b) => a === b,
  (a, b) => {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((x, i) => x === b[i]);
    }
    return a === b;
  },
);

export const makeGetSubscriptionIsReady = (getSubscriptionId, getSubscriptions) => createSelector(
  getSubscriptionId,
  getSubscriptions || (state => state.ddp.subscriptions),
  (id, subscriptions) => !!(subscriptions[id] && subscriptions[id].ready),
);

export const makeGetSubscriptionError = (getSubscriptionId, getSubscriptions) => createSelector(
  getSubscriptionId,
  getSubscriptions || (state => state.ddp.subscriptions),
  (id, subscriptions) => !!(subscriptions[id] && subscriptions[id].error),
);

export const makeGetSubscriptionsReady = getSubscriptionId => createSelector(
  createSelector(
    createArraySelector(
      identity,
      property('subscriptions'),
      (state, subscriptions) => subscriptions.map(subscription => subscription && getSubscriptionId(state, subscription)),
    ),
    ids => ids.map(id => (id
      ? makeGetSubscriptionIsReady(constant(id), identity)
      : constant(true)),
    ),
  ),
  state => state.ddp.subscriptions,
  (predicates, subscriptions) => predicates.every(isReady => isReady(subscriptions)),
);

export const makeGetQueryIsReady = (getQueryId, getQueries) => createSelector(
  getQueryId,
  getQueries || (state => state.ddp.queries),
  (id, queries) => !!(queries[id] && queries[id].ready),
);

export const makeGetQueryValue = (getQueryId, getQueries) => createSelector(
  getQueryId,
  getQueries || (state => state.ddp.queries),
  (id, queries) => queries[id] && queries[id].value,
);

export const makeGetQueriesReady = getQueryId => createSelector(
  createSelector(
    createArraySelector(
      identity,
      property('queries'),
      (state, queries) => Object.keys(queries).map(key => queries[key] && getQueryId(state, queries[key])),
    ),
    ids => ids.map(id => (id
      ? makeGetQueryIsReady(constant(id), identity)
      : constant(true)),
    ),
  ),
  state => state.ddp.queries,
  (checks, queries) => checks.every(isReady => isReady(queries)),
);

export const makeGetQueriesValues = getQueryId => createSelector(
  (state, requestsMap) => Object.keys(requestsMap).map(key => ({
    key,
    getValue: makeGetQueryValue(constant(getQueryId(state, requestsMap[key])), identity),
  })),
  state => state.ddp.queries,
  (getters, queries) => {
    const object = {};
    getters.forEach(({ key, getValue }) => {
      object[key] = getValue(queries);
    });
    return object;
  },
);
