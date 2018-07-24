import createEntitiesSelectors from './createEntitiesSelectors';
import createCurrentUserSelectors from './createCurrentUserSelectors';

export {
  createEntitiesSelectors,
  createCurrentUserSelectors,
};

// subscriptions & queries

export const getIsConnected = state => !!state.ddp.status && state.ddp.status.connected;
export const getIsRestoring = state => !!state.ddp.status && state.ddp.status.restoring;
