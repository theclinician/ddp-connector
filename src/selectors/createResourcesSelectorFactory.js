import createTree from 'functional-red-black-tree';
import {
  createSelector,
} from 'reselect';
import forEach from 'lodash/forEach';
import compare from '../utils/compare';
import stableMapValues from '../utils/stableMapValues';

function createResourcesSelectorFactory(storageKey) {
  let resourcesTree = createTree(compare);

  const selectResourcesDb = (state) => {
    const resourcesDb = state.ddp && state.ddp[storageKey];
    resourcesTree.forEach((key, resource) => {
      if (!resourcesDb || !resourcesDb[resource.id]) {
        resourcesTree = resourcesTree.remove(key);
      }
    });
    forEach(resourcesDb, (resource, id) => {
      if (!resourcesTree.get(resource.params)) {
        resourcesTree = resourcesTree.insert(resource.params, { id });
      }
    });
    return resourcesDb;
  };

  return selectResources => createSelector(
    selectResourcesDb,
    selectResources,
    (resourcesDb, resources) => stableMapValues(resources, (params) => {
      if (!params) {
        return null;
      }
      const resource = resourcesTree.get(params);
      if (resource) {
        return resourcesDb[resource.id];
      }
      return null;
    }),
  );
}

export default createResourcesSelectorFactory;
