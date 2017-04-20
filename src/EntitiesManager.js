import EJSON from 'ejson';
import {
  EventEmitter,
} from '@theclinician/toolbelt';
import { debounceKey } from './debounce.js';

function asObject(map) {
  const object = {};
  for (const [key, value] of map.entries()) {
    object[key] = value;
  }
  return object;
}

class EntitiesManager extends EventEmitter {
  constructor({
    models,
    updateDelay = 50,
  }) {
    super();

    this.models = models;
    this.collections = {};
    this.afterFlushCallbacks = [];

    this.on('added', ({ collection, id, fields }) => {
      const {
        toInsert,
        toUpdate,
        toRemove,
      } = this.ensure(collection);
      const ejson = EJSON.fromJSONValue(fields);
      toInsert.set(id, ejson);
      toUpdate.delete(id);
      toRemove.delete(id);
      this.flush(collection);
    });

    this.on('changed', ({ collection, id, fields }) => {
      const {
        toInsert,
        toUpdate,
        toRemove,
      } = this.ensure(collection);
      if (!toRemove.has(id)) {
        const ejson = EJSON.fromJSONValue(fields);
        if (toInsert.has(id)) {
          toInsert.set(id, {
            ...toInsert.get(id),
            ...ejson,
          });
        } else if (toUpdate.has(id)) {
          toUpdate.set(id, {
            ...toUpdate.get(id),
            ...ejson,
          });
        } else {
          toUpdate.set(id, ejson);
        }
      }
      this.flush(collection);
    });

    this.on('removed', ({ collection, id }) => {
      const {
        toInsert,
        toUpdate,
        toRemove,
      } = this.ensure(collection);
      toRemove.set(id, true);
      toUpdate.delete(id);
      toInsert.delete(id);
      this.flush(collection);
    });

    this.on('flush', () => {
      if (!this.hasPendingUpdates()) {
        this.afterFlushCallbacks.forEach(action => action());
        this.afterFlushCallbacks = [];
      }
    });

    this.flush = debounceKey(this.flush.bind(this), {
      ms: updateDelay,
    });
  }

  hasPendingUpdates() {
    return Object.keys(this.collections).some(name =>
      this.collections[name].toInsert.size > 0 ||
      this.collections[name].toUpdate.size > 0 ||
      this.collections[name].toRemove.size > 0,
    );
  }

  afterFlush(action) {
    if (this.hasPendingUpdates()) {
      this.afterFlushCallbacks.push(action);
    } else {
      action();
    }
  }

  ensure(name) {
    if (!this.collections[name]) {
      this.collections[name] = {
        toInsert: new Map(),
        toUpdate: new Map(),
        toRemove: new Map(),
      };
    }
    return this.collections[name];
  }

  flush(collection) {
    const {
      toInsert,
      toUpdate,
      toRemove,
    } = this.ensure(collection);
    const Model = this.models[collection];
    if (toInsert.size > 0) {
      this.emit('insert entities', { collection, Model, entities: asObject(toInsert) });
      toInsert.clear();
    }
    if (toUpdate.size > 0) {
      this.emit('update entities', { collection, Model, entities: asObject(toUpdate) });
      toUpdate.clear();
    }
    if (toRemove.size > 0) {
      this.emit('remove entities', { collection, entities: asObject(toRemove) });
      toRemove.clear();
    }
    this.emit('flush');
  }
}

export default EntitiesManager;
