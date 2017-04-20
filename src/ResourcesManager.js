import EJSON from 'ejson';
import { EventEmitter } from '@theclinician/toolbelt';
import SharedResource from './SharedResource.js';
import { once } from './utils.js';

class ResourcesManager extends EventEmitter {
  constructor({
    getResourceId = params => EJSON.stringify(params),
    resourcesFactory,
    cleanupDelay,
  } = {}) {
    super();

    this.resources = new Map();
    this.listeners = new Map();

    this.resourcesFactory = resourcesFactory;
    this.getResourceId = getResourceId;
    this.cleanupDelay = cleanupDelay;
  }

  cleanupResources() {
    for (const resource of this.resources.values()) {
      resource.maybeCleanup();
    }
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
    const id = this.getResourceId(params);
    let resource = this.resources.get(id);
    if (!resource) {
      this.emit('create', { id });
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
            this.resources.delete(id);
            this.emit('delete', { id });
          };
        },
        cleanupDelay: this.getCleanupDelay(params),
      });
      this.resources.set(id, resource);
    }
    return { id, resource };
  }

  getOrCreateListener(id) {
    const listener = this.listeners.get(id) || {
      byResourceId: new Map(),
    };
    if (!this.listeners.has(id)) {
      this.listeners.set(id, listener);
    }
    return listener;
  }

  updateRequests(listenerId, requests = []) {
    const promises = new Map();
    const listener = this.getOrCreateListener(listenerId);
    requests.forEach((params) => {
      if (!params) {
        return;
      }
      const { id, resource } = this.getOrCreateResource(params);
      if (!listener.byResourceId.has(id)) {
        listener.byResourceId.set(id, resource.require());
      }
      const promise = listener.byResourceId.get(id).promise;
      promise.catch((err) => {
        console.error(`While requesting resource ${id}`, err);
      });
      promises.set(id, promise);
    });

    for (const [id, { release }] of listener.byResourceId.entries()) {
      if (!promises.has(id)) {
        release();
        listener.byResourceId.delete(id);
      }
    }
    if (promises.size === 0) {
      this.listeners.delete(listenerId);
    }

    return promises.values();
  }
}

export default ResourcesManager;
