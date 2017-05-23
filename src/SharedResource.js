import { debounce } from '@theclinician/toolbelt';
import { once } from './utils.js';

class SharedResource {
  constructor({
    create,
    cleanupDelay = 5000,
  } = {}) {
    this.create = create;
    this.nUsers = 0;

    this.destroy = null;
    this.promise = null;

    this.scheduleCleanup = debounce(() => {
      this.maybeCleanup();
    }, { ms: cleanupDelay });
  }

  getNumberOfUsers() {
    return this.nUsers;
  }

  isClean() {
    return !this.promise;
  }

  maybeCleanup() {
    if (this.nUsers === 0) {
      this.cleanup();
    }
  }

  cleanup() {
    if (typeof this.destroy === 'function') {
      this.destroy();
    }
    this.destroy = null;
    this.promise = null;
  }

  require() {
    let promise = this.promise;
    if (!promise) {
      this.promise = new Promise((resolve, reject) => {
        this.destroy = this.create(once((err, res) => {
          if (err) {
            // NOTE: Because if this "cleanup" a resource will be requested again on next try
            //       after a failure. Though, in general, this may not be an optimal strategy.
            //       Instead we should probably throttle calls and limit the number of retires.
            this.cleanup();
            reject(err);
          } else {
            resolve(res);
          }
        }));
      });
      promise = this.promise;
    }

    const release = once(() => {
      this.nUsers = Math.max(0, this.nUsers - 1);
      if (this.nUsers === 0) {
        this.scheduleCleanup();
      }
    });

    this.nUsers += 1;
    return {
      // NOTE: At this point, this.promise can already be "null" (if create erred immediately),
      //       but we still return a valid promise because the user will rely on it.
      promise,
      release,
    };
  }
}

export default SharedResource;
