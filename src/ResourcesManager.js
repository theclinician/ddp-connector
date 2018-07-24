import forEach from 'lodash/forEach';
import isEmpty from 'lodash/isEmpty';
import keys from 'lodash/keys';
import has from 'lodash/has';
import { EventEmitter } from '@theclinician/toolbelt';
import createTree from 'functional-red-black-tree';
import SharedResource from './SharedResource.js';
import { once } from './utils.js';
import compare from './utils/compare';

class ResourcesManager extends EventEmitter {
  constructor({
    resourcesFactory,
    cleanupDelay,
  } = {}) {
    super();

    this.counter = 0;
    this.resourcesTree = createTree(compare);
    this.listeners = {};

    this.resourcesFactory = resourcesFactory;
    this.cleanupDelay = cleanupDelay;
  }

  nextUniqueId() {
    this.counter += 1;
    return this.counter.toString();
  }

  cleanupResources() {
    this.resourcesTree.forEach((params, resource) => {
      resource.maybeCleanup();
    });
  }

  getCleanupDelay(params) {
    if (typeof this.cleanupDelay === 'function') {
      return this.cleanupDelay(params);
    } else if (typeof this.cleanupDelay === 'number') {
      return this.cleanupDelay;
    }
    return 0;
  }

  getOrCreateResource(params) {
    let resource = this.resourcesTree.get(params);
    if (!resource) {
      const id = this.nextUniqueId();
      this.emit('create', { id, params });
      resource = new SharedResource({
        create: (cb) => {
          let handle = this.resourcesFactory(params, once((error, value) => {
            if (!error) {
              this.emit('ready', { id, value });
            } else {
              this.emit('error', { id, error });
            }
            cb(error, value);
          }));
          return () => {
            if (handle) {
              handle.stop();
              handle = null;
            }
            this.resourcesTree = this.resourcesTree.remove(params);
            this.emit('delete', { id, params });
          };
        },
        cleanupDelay: this.getCleanupDelay(params),
      });
      resource.id = id;
      resource.params = params;
      this.resourcesTree = this.resourcesTree.insert(params, resource);
    }
    return { id: resource.id, resource };
  }

  getOrCreateListener(id) {
    const listener = this.listeners[id] || {
      byResourceId: {},
    };
    if (!this.listeners[id]) {
      this.listeners[id] = listener;
    }
    return listener;
  }

  updateRequests(listenerId, requests) {
    const promises = {};
    const listener = this.getOrCreateListener(listenerId);

    forEach(requests, (params) => {
      if (!params) {
        return;
      }
      const { id, resource } = this.getOrCreateResource(params);
      if (!listener.byResourceId[id]) {
        listener.byResourceId[id] = resource.require();
      }
      const promise = listener.byResourceId[id].promise;
      promise.catch((err) => {
        console.error(`While requesting resource id ${id}`, params, err);
      });
      promises[id] = promise;
    });

    forEach(listener.byResourceId, ({ release }, id) => {
      if (!has(promises, id)) {
        release();
        delete listener.byResourceId[id];
      }
    });

    if (isEmpty(promises)) {
      delete this.listeners[listenerId];
    }

    return keys(promises);
  }
}

export default ResourcesManager;
