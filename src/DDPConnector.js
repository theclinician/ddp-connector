import React from 'react';
import {
  EventEmitter,
  SHA256,
} from '@theclinician/toolbelt';
import ResourcesManager from './ResourcesManager.js';
import EntitiesManager from './EntitiesManager.js';
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

  insertEntities,
  updateEntities,
  removeEntities,
} from './actions.js';

class DDPConnector extends EventEmitter {
  constructor({
    debug,
    ddpClient,
    cleanupDelay = 60 * 1000,
    entitiesUpdateDelay = 100,
    resourceUpdateDelay = 100,
    defaultLoaderComponent = () => React.createElement('div', {}, ['Loading ...']),
  }) {
    super();

    this.resourceUpdateDelay = resourceUpdateDelay;
    this.defaultLoaderComponent = defaultLoaderComponent;

    this.ddp = ddpClient;
    this.endpoint = ddpClient.endpoint;

    this.entitiesManager = new EntitiesManager({
      models: this.constructor.models,
      updateDelay: entitiesUpdateDelay,
    });

    this.ddp.pipe([
      'added',
      'changed',
      'removed',
    ], this.entitiesManager);

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
      resourcesFactory: ({ name, params }, cb) => {
        let handle = this.ddp.subscribe(name, params, {
          onReady: () => cb && this.afterFlush(cb),
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
      resourcesFactory: ({ name, params }, cb) => {
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
    this.subsManager.on('create', ({ id }) => dispatch(createSubscription({ id })));
    this.subsManager.on('delete', ({ id }) => dispatch(deleteSubscription({ id })));

    this.subsManager.on('ready', ({ id }) => dispatch(updateSubscription({ id, ready: true })));
    this.subsManager.on('error', ({ id }) => dispatch(updateSubscription({ id, error: true })));

    // queries
    this.queryManager.on('create', ({ id }) => dispatch(createQuery({ id })));
    this.queryManager.on('delete', ({ id }) => dispatch(deleteQuery({ id })));

    this.queryManager.on('ready', ({ id, value }) => dispatch(updateQuery({ id, value, ready: true })));
    this.queryManager.on('error', ({ id }) => dispatch(updateQuery({ id, error: true })));

    // entities
    this.entitiesManager.on('insert entities', params => dispatch(insertEntities(params)));
    this.entitiesManager.on('update entities', params => dispatch(updateEntities(params)));
    this.entitiesManager.on('remove entities', params => dispatch(removeEntities(params)));

    // currentUser
    this.ddp.on('loggingIn', () => dispatch(setLoggingIn()));
    this.ddp.on('loginError', () => dispatch(setLoggingIn(false)));
    this.ddp.on('resumeLoginError', () => dispatch(setLoggingIn(false)));
    this.ddp.on('loggedIn', userId => dispatch(setUser({ _id: userId })));
    this.ddp.on('loggedOut', () => dispatch(clearUser()));

    this.ddp.on('restoring', () => dispatch(startRestoring()));
    this.ddp.on('restored', () => this.afterFlush(() => dispatch(finishRestoring())));
  }

  afterFlush(action) {
    return this.entitiesManager.afterFlush(action);
  }

  resolveAfterFlush(value) {
    return new Promise(resolve => this.afterFlush(() => resolve(value)));
  }

  rejectAfterFlush(error) {
    return new Promise((resolve, reject) => this.afterFlush(() => reject(error)));
  }

  delayUntilFlush(promise) {
    return promise
      .then(this.resolveAfterFlush.bind(this))
      .catch(this.rejectAfterFlush.bind(this));
  }

  apply(name, params, options) {
    return this.delayUntilFlush(this.ddp.apply(name, params, options));
  }

  login(...args) {
    return this.delayUntilFlush(this.ddp.login(...args));
  }

  logout(...args) {
    return this.delayUntilFlush(this.ddp.logout(...args));
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
    return this.delayUntilFlush(
      this.ddp.executeLoginRoutine('createUser', params),
    );
  }

  resetPassword({ token, newPassword }) {
    const params = [token, this.constructor.hashPassword(newPassword)];
    return this.delayUntilFlush(
      this.ddp.executeLoginRoutine('resetPassword', params),
    );
  }
}

DDPConnector.models = {};

export default DDPConnector;
