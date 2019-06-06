import { createAction } from 'redux-actions';

export const setConnected = createAction('@@DDP/SET_CONNECTED');

export const createSubscription = createAction('@@DDP/CREATE_SUBSCRIPTION');
export const deleteSubscription = createAction('@@DDP/DELETE_SUBSCRIPTION');
export const updateSubscription = createAction('@@DDP/UPDATE_SUBSCRIPTION');

export const createQuery = createAction('@@DDP/CREATE_QUERY');
export const deleteQuery = createAction('@@DDP/DELETE_QUERY');
export const updateQuery = createAction('@@DDP/UPDATE_QUERY');

export const replaceEntities = createAction('@@DDP/REPLACE_ENTITIES');

export const setLoggingIn = createAction('@@DDP/SET_LOGGING_IN');
export const setUser = createAction('@@DDP/SET_USER');
export const clearUser = createAction('@@DDP/CLEAR_USER');
export const setRestoring = createAction('@@DDP/SET_RESTORING');
