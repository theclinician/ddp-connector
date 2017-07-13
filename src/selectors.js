import { createSelector, createSelectorCreator } from 'reselect';
import { defaultMemoize } from './memoize.js';

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

const makeGetAllById = (collection, prefix) => (state) => {
  if (state[prefix].status &&
      state[prefix].status.restoring) {
    return state[prefix].status.entities &&
           state[prefix].status.entities[collection];
  }
  return state[prefix].entities[collection];
};

export const createEntitiesSelectors = (collection, { prefix = 'ddp' } = {}) => {
  const getAllById = makeGetAllById(collection, prefix);

  const getOne = (
    getId = (state, props) => props.id,
  ) => createSelector(
    getAllById,
    getId,
    (entities, id) => (entities && entities[id]) || undefined,
  );

  const getAll = createSelector(
    getAllById,
    entities => (entities ? Object.keys(entities).map(id => entities[id]) : []),
  );

  const find = (
    accept = constant(true),
    ...optionSelectors
  ) => createArraySelector(
    getAll,
    ...optionSelectors,
    (entities, ...options) => entities.filter(entity => accept(entity, ...options)),
  );

  const findAndMap = (
    accept = constant(true),
    transform = x => x,
    ...optionSelectors
  ) => createArraySelector(
    find(accept, ...optionSelectors),
    ...optionSelectors,
    (entities, ...options) => entities.map(entity => transform(entity, ...options)),
  );

  const findOne = (
    accept = constant(true),
    getOptions = constant(null),
  ) => createSelector(
    getAll,
    getOptions,
    (entities, options) => entities.find(answersSheet => accept(answersSheet, options)),
  );

  return {
    find,
    findAndMap,
    findOne,
    getOne,
    getAll,
    getAllById,
  };
};

export const createCurrentUserSelectors = (collection, { Model, prefix = 'ddp' } = {}) => {
  const getCurrentId = state => state[prefix].currentUser.userId;
  const getIsLoggingIn = state => state[prefix].currentUser.isLoggingIn;

  const getUserEntity = createSelector(
    makeGetAllById(collection, prefix),
    getCurrentId,
    (users, userId) => users && users[userId],
  );

  const wrap = doc => (Model ? new Model(doc) : doc);
  const getCurrent = createSelector(
    state => state[prefix].currentUser.user,
    getUserEntity,
    (currentUser, userEntity) => currentUser && wrap({
      ...currentUser,
      ...userEntity,
    }),
  );

  return {
    getIsLoggingIn,
    getCurrent,
    getCurrentId,
  };
};

