import React from 'react';
import {
  EventEmitter,
  SHA256,
} from '@theclinician/toolbelt';
import ResourcesManager from './ResourcesManager.js';
import {
  setConnected,

  setLoggingIn,
  setUser,
  clearUser,
  startRestoring,
  finishRestoring,

  createQuery,
  deleteQuery,
  updateQuery,

  createSubscription,
  deleteSubscription,
  updateSubscription,

  replaceEntities,
} from './actions.js';

const identity = x => x;

class DDPConnector extends EventEmitter {
  constructor({
    debug,
    ddpClient,
    cleanupDelay = 60 * 1000,
    entitiesUpdateDelay = 100,
    resourceUpdateDelay = 100,
    getMessageChannel = null,
    defaultLoaderComponent = () => React.createElement('div', {}, ['Loading ...']),
    transformRequest = identity,
  }) {
    super();

    this.resourceUpdateDelay = resourceUpdateDelay;
    this.entitiesUpdateDelay = entitiesUpdateDelay;
    this.defaultLoaderComponent = defaultLoaderComponent;

    this.ddp = ddpClient;

    // NOTE: This is not a nice solution. Will need to fix it.
    this.ddp.models = this.constructor.models;

    this.endpoint = ddpClient.endpoint;

    this.ddp.on('dataUpdated', (newCollections) => {
      this.scheduleUpdates(newCollections, entitiesUpdateDelay);
    });

    // Trigger flush right after receiving a DDP "updated" message.
    this.ddp.on('updated', () => {
      this.flushUpdates();
    });

    this.ddp.pipe([
      'loginError',
      'resumeLoginError',
      'logoutError',
      'error',
    ], this);

    // NOTE: If there are not explicit handlers for these errors,
    //       they will at least be printed into the console.
    this.captureUnhandledErrors([
      'resumeLoginError',
      'logoutError',
      'error',
    ]);

    this.subsManager = new ResourcesManager({
      cleanupDelay,
      resourcesFactory: (request, requestMeta, cb) => {
        const {
          name,
          params,
        } = transformRequest(request, {
          type: DDPConnector.REQUEST_TYPE__SUBSCRIPTION,
          ...requestMeta,
        });
        let handle = this.ddp.subscribe(name, params, {
          onReady: () => cb(),
          // NOTE: This is problematic because onStop can also be called
          //       when subscription is stopped with "handle.stop()"!
          //       but there will be no error in such case
          onStop: err => cb && err && cb(err),
        });
        return {
          stop: () => {
            if (handle) {
              handle.stop();
              handle = null;
              cb = null; // eslint-disable-line no-param-reassign
            }
          },
        };
      },
    });

    this.queryManager = new ResourcesManager({
      cleanupDelay,
      resourcesFactory: (request, requestMeta, cb) => {
        const {
          name,
          params,
        } = transformRequest(request, {
          type: DDPConnector.REQUEST_TYPE__QUERY,
          ...requestMeta,
        });
        // NOTE: In this particular case we don't really need to wait until flush,
        //       so we call "apply" on ddp object directly.
        this.ddp.apply(name, params, {}, cb);
        return {
          stop: () => {
            cb = null; // eslint-disable-line no-param-reassign
          },
        };
      },
    });

    this.ddp.on('loggedOut', () => {
      this.subsManager.cleanupResources();
      this.queryManager.cleanupResources();
    });

    if (getMessageChannel) {
      const handleCollectionMessage = ({ collection, id, fields }) => {
        const channel = getMessageChannel(collection);
        if (channel) {
          this.emit(`messages.${channel}`, id, fields);
        }
      };
      this.ddp.on('added', handleCollectionMessage);
      this.ddp.on('changed', handleCollectionMessage);
    }

    if (debug) {
      this.ddp.socket.on('message:out', message => console.warn('DDP/OUT', message));
      this.ddp.socket.on('message:in', message => console.warn('DDP/IN', message));
    }
  }

  getLoaderComponent() {
    return this.defaultLoaderComponent;
  }

  // accounts

  static hashPassword(password) {
    return {
      digest: SHA256(password),
      algorithm: 'sha-256',
    };
  }

  // models

  static registerModel(Model) {
    if (!Model.collection) {
      throw Error(`No collection name assigned to model ${Model.name}`);
    }
    this.models[Model.collection] = Model;
  }

  // map events to redux actions
  bindToStore(store) {
    const dispatch = store.dispatch.bind(store);

    this.ddp.on('connected', () => dispatch(setConnected(true)));
    this.ddp.on('disconnected', () => dispatch(setConnected(false)));

    // subscriptions
    this.subsManager.on('create', ({ id, request }) => dispatch(createSubscription({ id, request })));
    this.subsManager.on('delete', ({ id }) => dispatch(deleteSubscription({ id })));

    this.subsManager.on('ready', ({ id }) => {
      this.flushUpdates();
      dispatch(updateSubscription({ id, ready: true }));
    });
    this.subsManager.on('error', ({ id }) => dispatch(updateSubscription({ id, error: true })));

    // queries
    this.queryManager.on('create', ({ id, request }) => dispatch(createQuery({ id, request })));
    this.queryManager.on('delete', ({ id }) => dispatch(deleteQuery({ id })));

    this.queryManager.on('ready', ({ id, value }) => {
      this.flushUpdates();
      dispatch(updateQuery({ id, value, ready: true }));
    });
    this.queryManager.on('error', ({ id }) => dispatch(updateQuery({ id, error: true })));

    // entities
    this.on('flush', entities => dispatch(replaceEntities(entities)));

    // currentUser
    this.ddp.on('loggingIn', () => dispatch(setLoggingIn()));
    this.ddp.on('loginError', () => dispatch(setLoggingIn(false)));
    this.ddp.on('resumeLoginError', () => dispatch(setLoggingIn(false)));
    this.ddp.on('loggedIn', userId => dispatch(setUser({ _id: userId })));
    this.ddp.on('loggedOut', () => dispatch(clearUser()));

    this.ddp.on('restoring', () => dispatch(startRestoring()));
    this.ddp.on('restored', () => {
      this.flushUpdates();
      dispatch(finishRestoring());
    });
  }

  scheduleUpdates(newCollections, delay = this.entitiesUpdateDelay) {
    if (this.schedule) {
      clearTimeout(this.schedule.handle);
    }
    const handle = setTimeout(() => {
      this.flushUpdates();
    }, delay);
    this.scheduled = {
      handle,
      newCollections,
    };
  }

  flushUpdates() {
    if (this.scheduled) {
      const {
        handle,
        newCollections,
      } = this.scheduled;
      clearTimeout(handle);
      this.emit('flush', newCollections);
      delete this.scheduled;
    }
  }

  apply(name, params, options) {
    return this.ddp.apply(name, params, options);
  }

  refreshQuery(request) {
    return this.queryManager.refresh(request);
  }

  login(...args) {
    return this.ddp.login(...args);
  }

  logout(...args) {
    return this.ddp.logout(...args);
  }

  loginWithPassword({ username, email, password }) {
    const options = {
      password: this.constructor.hashPassword(password),
      user: { username, email },
    };
    return this.login(options);
  }

  createUser({ password, ...rest }) {
    const params = [{
      password: this.constructor.hashPassword(password),
      ...rest,
    }];
    return this.ddp.executeLoginRoutine('createUser', params);
  }

  resetPassword({ token, newPassword }) {
    const params = [token, this.constructor.hashPassword(newPassword)];
    return this.ddp.executeLoginRoutine('resetPassword', params);
  }
}

DDPConnector.models = {};
DDPConnector.REQUEST_TYPE__SUBSCRIPTION = 'subscription';
DDPConnector.REQUEST_TYPE__QUERY = 'query';

export default DDPConnector;
