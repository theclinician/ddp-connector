import { createAction } from 'redux-actions';

export const setConnected = createAction('@@DDP/SET_CONNECTED');

export const createSubscription = createAction('@@DDP/CREATE_SUBSCRIPTION');
export const deleteSubscription = createAction('@@DDP/DELETE_SUBSCRIPTION');
export const updateSubscription = createAction('@@DDP/UPDATE_SUBSCRIPTION');

export const createQuery = createAction('@@DDP/CREATE_QUERY');
export const deleteQuery = createAction('@@DDP/DELETE_QUERY');
export const updateQuery = createAction('@@DDP/UPDATE_QUERY');

export const insertEntities = createAction('@@DDP/INSERT_ENTITIES');
export const updateEntities = createAction('@@DDP/UPDATE_ENTITIES');
export const removeEntities = createAction('@@DDP/REMOVE_ENTITIES');
export const clearEntities = createAction('@@DDP/CLEAR_ENTITIES');

export const setLoggingIn = createAction('@@DDP/SET_LOGGING_IN');
export const setUser = createAction('@@DDP/SET_USER');
export const clearUser = createAction('@@DDP/CLEAR_USER');
export const setRestoring = createAction('@@DDP/SET_RESTORING');
export const setEntitiesCopy = createAction('@@DDP/SET_ENTITIES_COPY');

export const startRestoring = () => (dispatch, getState) => {
  dispatch(setRestoring(true));
  dispatch(setEntitiesCopy(getState().ddp.entities));
  dispatch(clearEntities());
};

export const finishRestoring = () => (dispatch) => {
  dispatch(setRestoring(false));
  dispatch(setEntitiesCopy({}));
};
