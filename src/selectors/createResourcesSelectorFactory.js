import createTree from 'functional-red-black-tree';
import {
  createSelector,
} from 'reselect';
import memoizeMapValues from '@theclinician/selectors/lib/memoizeMapValues';
import forEach from 'lodash/forEach';
import compare from '../utils/compare';

const identity = x => x;

function createResourcesSelectorFactory(storageKey) {
  let resourcesTree = createTree(compare);

  // TODO: Alternatively we could use custom middleware to capture
  //       actions that are mutation the corresponding branch of state tree.
  const selectResourcesDb = (state) => {
    const resourcesDb = state.ddp && state.ddp[storageKey];
    resourcesTree.forEach((key, resource) => {
      if (!resourcesDb || !resourcesDb[resource.id]) {
        resourcesTree = resourcesTree.remove(key);
      }
    });
    forEach(resourcesDb, (resource, id) => {
      if (!resourcesTree.get(resource.request)) {
        resourcesTree = resourcesTree.insert(resource.request, { id });
      }
    });
    return resourcesDb;
  };

  return (selectRequests, mapValue = identity) => createSelector(
    createSelector(
      selectResourcesDb,
      resourcesDb => memoizeMapValues((request) => {
        if (!request) {
          return mapValue({
            // NOTE: If resource is not required, we consider it "ready".
            //       We use this to distinguish between situation when
            //       resource is not present in storage yet vs. resource
            //       was never requested in the first place.
            ready: true,
          });
        }
        const resource = resourcesTree.get(request);
        if (resource) {
          return mapValue(resourcesDb[resource.id], resource.id);
        }
        return mapValue(null);
      }),
    ),
    selectRequests,
    (mapValues, resources) => mapValues(resources),
  );
}

export default createResourcesSelectorFactory;
