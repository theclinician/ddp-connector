import omit from 'lodash/omit';
import mapValues from 'lodash/mapValues';
import { handleActions } from 'redux-actions';
import { combineReducers } from 'redux';
import {
  setConnected,
  createSubscription,
  deleteSubscription,
  updateSubscription,
  createQuery,
  updateQuery,
  deleteQuery,
  replaceEntities,
  setUser,
  setLoggingIn,
  clearUser,
  setRestoring,
} from './actions.js';

const identity = x => x;

export const statusReducer = handleActions({
  [setConnected]: (state, { payload }) => ({
    ...state,
    connected: !!payload,
  }),
  [setRestoring]: (state, { payload }) => ({
    ...state,
    restoring: !!payload,
  }),
}, {
  connected: false,
  restoring: false,
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
    user: {
      ...state.user,
      ...payload,
    },
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
  [replaceEntities]: (state, { payload }) => payload,
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

  [setRestoring]: (state, { payload }) => {
    if (payload === false) {
      return mapValues(state, (subscription) => {
        if (subscription.pendingReady) {
          const { pendingReady, ...other } = subscription;
          return {
            ...other,
            ready: true,
          };
        }
        return subscription;
      });
    }
    return state;
  },
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
