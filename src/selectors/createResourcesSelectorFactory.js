import createTree from 'functional-red-black-tree';
import {
  createSelector,
} from 'reselect';
import forEach from 'lodash/forEach';
import compare from '../utils/compare';
import memoizeMapValues from '../utils/memoizeMapValues';

const identity = x => x;

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

  return (selectResources, mapValue = identity) => createSelector(
    createSelector(
      selectResourcesDb,
      resourcesDb => memoizeMapValues((params) => {
        const resource = resourcesTree.get(params);
        if (resource) {
          return mapValue(resourcesDb[resource.id], resource.id);
        }
        return mapValue(null);
      }),
    ),
    selectResources,
    (mapValues, resources) => mapValues(resources),
  );
}

export default createResourcesSelectorFactory;
