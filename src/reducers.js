import omit from 'lodash/omit';
import mapValues from 'lodash/mapValues';
import { handleActions } from 'redux-actions';
import { shallowEqual } from 'recompose';
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

export const ddpReducer = (state = {}, action) => {
  let nextState = state;
  switch (action.type) {
    case '@@DDP/REPLACE_ENTITIES': {
      // eslint-disable-next-line no-underscore-dangle
      if (nextState._entities) {
        return {
          ...nextState,
          _entities: action.payload,
        };
      }
      break;
    }
    case '@@DDP/SET_RESTORING': {
      // NOTE: Only replace original entities if the _entities object exists.
      //       For example, this will not happen on initial load, before the
      //       client lost connection for the first time.
      if (!action.payload && nextState._entities) { // eslint-disable-line no-underscore-dangle
        nextState = {
          ...nextState,
          // eslint-disable-next-line no-underscore-dangle
          entities: nextState._entities,
        };
        // eslint-disable-next-line no-underscore-dangle
        delete nextState._entities;
      }
      break;
    }
    case '@@DDP/SET_CONNECTED': {
      if (!action.payload) {
        nextState = {
          ...nextState,
          _entities: {},
        };
      }
      break;
    }
    default:
      // ...
  }
  // apply child reducers
  nextState = mapValues({
    status: statusReducer,
    entities: entitiesReducer,
    _entities: identity,
    queries: queriesReducer,
    subscriptions: subscriptionsReducer,
    currentUser: currentUserReducer,
  }, (reducer, key) => reducer(nextState[key], action));
  if (shallowEqual(nextState, state)) {
    return state;
  }
  return nextState;
};
