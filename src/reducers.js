import { combineReducers } from 'redux';
import { handleActions } from 'redux-actions';
import {
  setConnected,

  createSubscription,
  deleteSubscription,
  updateSubscription,

  createQuery,
  updateQuery,
  deleteQuery,

  insertEntities,
  updateEntities,
  removeEntities,
  clearEntities,

  setUser,
  setLoggingIn,
  clearUser,
  setRestoring,
  setEntitiesCopy,
} from './actions.js';
import {
  insert,
  update,
  remove,
} from './modifiers.js';

class User {
  constructor(doc) {
    Object.assign(this, doc);
  }
}

export const statusReducer = handleActions({
  [setConnected]: (state, { payload }) => ({
    ...state,
    connected: !!payload,
  }),
  [setRestoring]: (state, { payload }) => ({
    ...state,
    restoring: !!payload,
  }),
  [setEntitiesCopy]: (state, { payload }) => ({
    ...state,
    entities: payload,
  }),
}, {
  connected: true,
});

export const currentUserReducer = handleActions({
  [setLoggingIn]: (state, { payload = true }) => ({
    ...state,
    isLoggingIn: !!payload,
  }),

  [setUser]: (state, { payload }) => ({
    ...state,
    isLoggingIn: false,
    userId: payload._id,
    user: new User({
      ...state.user,
      ...payload,
    }),
  }),

  [clearUser]: state => ({
    ...state,
    isLoggingIn: false,
    userId: '',
    user: null,
  }),
}, {
  userId: '',
  user: null,
  isLoggingIn: false,
});

export const entitiesReducer = handleActions({
  [insertEntities]: (state, { payload: { collection, entities, Model } }) => ({
    ...state,
    [collection]: insert({
      Model,
      entities,
      collection: state[collection],
    }),
  }),
  [updateEntities]: (state, { payload: { collection, entities, Model } }) => ({
    ...state,
    [collection]: update({
      Model,
      entities,
      collection: state[collection],
    }),
  }),
  [removeEntities]: (state, { payload: { collection, entities } }) => ({
    ...state,
    [collection]: remove({
      entities,
      collection: state[collection],
    }),
  }),
  [clearEntities]: () => ({}),
}, {});

export const subscriptionsReducer = handleActions({
  [createSubscription]: (state, { payload: { id, ...fields } }) => ({
    ...state,
    [id]: fields,
  }),

  [updateSubscription]: (state, { payload: { id, ...fields } }) => ({
    ...state,
    [id]: {
      ...state[id],
      ...fields,
    },
  }),

  [deleteSubscription]: (state, { payload: { id } }) => remove({ collection: state, entities: { [id]: true } }),
}, {});

export const queriesReducer = handleActions({
  [createQuery]: (state, { payload: { id, ...fields } }) => ({
    ...state,
    [id]: fields,
  }),

  [updateQuery]: (state, { payload: { id, ...fields } }) => ({
    ...state,
    [id]: {
      ...state[id],
      ...fields,
    },
  }),

  [deleteQuery]: (state, { payload: { id } }) => remove({ collection: state, entities: { [id]: true } }),
}, {});

export const ddpReducer = combineReducers({
  status: statusReducer,
  entities: entitiesReducer,
  queries: queriesReducer,
  subscriptions: subscriptionsReducer,
  currentUser: currentUserReducer,
});
