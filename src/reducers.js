import omit from 'lodash/omit';
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

  replaceEntities,
  clearEntities,

  setUser,
  setLoggingIn,
  clearUser,
  setRestoring,
  setEntitiesCopy,
} from './actions.js';

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
    // eslint-disable-next-line no-underscore-dangle
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
  [replaceEntities]: (state, { payload: entities }) => ({
    ...entities,
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

  [deleteSubscription]: (state, { payload: { id } }) => omit(state, [id]),
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

  [deleteQuery]: (state, { payload: { id } }) => omit(state, [id]),
}, {});

export const ddpReducer = combineReducers({
  status: statusReducer,
  entities: entitiesReducer,
  queries: queriesReducer,
  subscriptions: subscriptionsReducer,
  currentUser: currentUserReducer,
});
