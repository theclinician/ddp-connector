import forEach from 'lodash/forEach';
import isEmpty from 'lodash/isEmpty';
import keys from 'lodash/keys';
import has from 'lodash/has';
import EventEmitter from 'eventemitter3';
import createTree from 'functional-red-black-tree';
import SharedResource from './SharedResource.js';
import { once } from './utils.js';
import compare from './utils/compare';

class ResourcesManager extends EventEmitter {
  constructor({
    resourcesFactory,
    cleanupDelay,
    cleanupDelayOnError,
  } = {}) {
    super();

    this.counter = 0;
    this.resourcesTree = createTree(compare);
    this.listeners = {};

    this.resourcesFactory = resourcesFactory;
    this.cleanupDelay = cleanupDelay;
    this.cleanupDelayOnError = cleanupDelayOnError;
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

  getCleanupDelay(request) {
    if (typeof this.cleanupDelay === 'function') {
      return this.cleanupDelay(request);
    }
    if (typeof this.cleanupDelay === 'number') {
      return this.cleanupDelay;
    }
    return 0;
  }

  getCleanupDelayOnError(request) {
    if (typeof this.cleanupDelayOnError === 'function') {
      return this.cleanupDelayOnError(request);
    }
    if (typeof this.cleanupDelayOnError === 'number') {
      return this.cleanupDelayOnError;
    }
    return 0;
  }

  getOrCreateResource(request) {
    let resource = this.resourcesTree.get(request);
    if (!resource) {
      const id = this.nextUniqueId();
      const requestMeta = { id };
      this.emit('create', { id, request });
      resource = new SharedResource({
        create: (cb) => {
          let handle = this.resourcesFactory(request, requestMeta, once((error, value) => {
            if (!error) {
              this.emit('ready', { id, value });
            } else {
              console.error(`While requesting resource id ${id}`, request, error);
              this.emit('error', { id, error });
            }
            cb(error, value);
          }));
          return (refreshOnly) => {
            if (handle) {
              handle.stop();
              handle = null;
            }
            if (!refreshOnly) {
              this.resourcesTree = this.resourcesTree.remove(request);
              this.emit('delete', { id, request });
            }
          };
        },
        cleanupDelay: this.getCleanupDelay(request),
        cleanupDelayOnError: this.getCleanupDelayOnError(request),
      });
      resource.id = id;
      resource.request = request;
      this.resourcesTree = this.resourcesTree.insert(request, resource);
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

  refresh(request) {
    const resource = this.resourcesTree.get(request);
    if (!resource) {
      return Promise.reject(new Error(`Unknown resource ${request ? request.name : '[NO_NAME]'}`));
    }
    return resource.refresh();
  }

  updateRequests(listenerId, requests) {
    const nextResources = {};
    const listener = this.getOrCreateListener(listenerId);

    forEach(requests, (request) => {
      if (!request) {
        return;
      }
      const { id, resource } = this.getOrCreateResource(request);
      if (!listener.byResourceId[id]) {
        listener.byResourceId[id] = resource.require();
        listener.byResourceId[id].promise.catch(() => {
          // we are only catching the promise here to prevent uncaught promise warning
        });
      }
      nextResources[id] = listener.byResourceId[id];
    });

    forEach(listener.byResourceId, ({ release }, id) => {
      if (!has(nextResources, id)) {
        release();
        delete listener.byResourceId[id];
      }
    });

    if (isEmpty(nextResources)) {
      delete this.listeners[listenerId];
    }

    return keys(nextResources);
  }
}

export default ResourcesManager;
