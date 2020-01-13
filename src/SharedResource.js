import { once } from './utils.js';

const defaultGetDate = () => new Date();

class SharedResource {
  constructor({
    create,
    cleanupDelay = 5000,
    cleanupDelayOnError = 1000,
    getDate = defaultGetDate,
  } = {}) {
    this.create = create;
    this.nUsers = 0;

    this.destroy = null;
    this.promise = null;

    this.error = null;
    this.errorAt = null;

    this.getDate = getDate;
    this.cleanupHandle = null;
    this.cleanupDelay = cleanupDelay;
    this.cleanupDelayOnError = cleanupDelayOnError;
  }

  scheduleCleanup() {
    if (this.cleanupHandle) {
      clearTimeout(this.cleanupHandle);
    }
    const delayMs = this.error
      ? this.cleanupDelayOnError
      : this.cleanupDelay;
    this.cleanupHandle = setTimeout(() => {
      this.maybeCleanup();
    }, delayMs);
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

  cleanup(refreshOnly = false) {
    if (this.cleanupHandle) {
      clearTimeout(this.cleanupHandle);
      this.cleanupHandle = null;
    }
    if (typeof this.destroy === 'function') {
      this.destroy(refreshOnly);
    }
    this.destroy = null;
    this.promise = null;
    this.error = null;
    this.errorAt = null;
  }

  refresh() {
    // NOTE: By passing "true" we indicate that we don't want to destroy the
    //       resource completely. Instead, we just want to stop the related
    //       handlers (if any), e.g. call sub.stop().
    this.cleanup(true);

    this.promise = new Promise((resolve) => {
      this.destroy = this.create(once((err, res) => {
        if (err) {
          this.error = err;
          this.errorAt = this.getDate();
          resolve(null);
        } else {
          resolve(res);
        }
      }));
    });

    return {
      promise: this.promise,
    };
  }

  require() {
    const dateNow = this.getDate();
    if (!this.promise || (this.error && dateNow - this.errorAt >= this.cleanupDelayOnError)) {
      this.promise = this.refresh().promise;
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
      promise: this.promise,
      release,
    };
  }
}

export default SharedResource;
