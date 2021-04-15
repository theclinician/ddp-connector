import omit from 'lodash/omit';
import mapValues from 'lodash/mapValues';
import { handleActions } from 'redux-actions';
import { shallowEqual } from 'recompose';
import { reconcile } from '@theclinician/selectors';
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

export const ddpReducer = (state = {
  entities: {},
}, action) => {
  let nextState = state;
  switch (action.type) {
    case '@@DDP/REPLACE_ENTITIES': {
      // NOTE: If _entities is present, it means we are currently
      //       in "restoring" mode, so we update _entities rather than entities.
      // eslint-disable-next-line no-underscore-dangle
      if (nextState._entities) {
        nextState = {
          ...nextState,
          _entities: action.payload,
        };
      } else {
        nextState = {
          ...nextState,
          entities: action.payload,
        };
      }
      break;
    }
    case '@@DDP/SET_RESTORING': {
      // NOTE: Only replace original entities if the _entities object exists.
      //       For example, this will not happen on initial load, before the
      //       client lost connection for the first time.
      const isRestoring = !!action.payload;
      // eslint-disable-next-line no-underscore-dangle
      if (isRestoring) {
        // NOTE: We don't modify _entities if it is already present because
        //       this field will be typically set to an empty object on disconnect,
        //       and it the meantime it may already accumulate some data.
        nextState = {
          ...nextState,
          _entities: nextState._entities || {},
        };
      } else {
        nextState = {
          ...nextState,
          // NOTE: We reconcile because we don't want objects that hasn't changed
          //       to be replaced. This is because sometimes there is an assumption
          //       that if noting changes then selector returns exactly the same
          //       document, which is important for performance optimizations.
          // eslint-disable-next-line no-underscore-dangle
          entities: reconcile(nextState.entities, nextState._entities || {}),
        };
        // eslint-disable-next-line no-underscore-dangle
        delete nextState._entities;
      }
      break;
    }
    case '@@DDP/SET_CONNECTED': {
      const isConnected = !!action.payload;
      if (!isConnected) {
        nextState = {
          ...nextState,
          _entities: {},
        };
      } else if (!nextState.status || !nextState.status.restoring) {
        // NOTE: If restoring flag is set, the entities will be reconciled after restoring is finished.
        nextState = {
          ...nextState,
          // eslint-disable-next-line no-underscore-dangle
          entities: reconcile(nextState.entities, nextState._entities || {}),
        };
        // eslint-disable-next-line no-underscore-dangle
        delete nextState._entities;
      }
      break;
    }
    default:
      // ...
  }
  // apply child reducers
  nextState = mapValues({
    status: statusReducer,
    entities: identity,
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
