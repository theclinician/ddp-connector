/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off", no-unused-expressions: "off" */
import chai from 'chai';
import sinon from 'sinon';
import chaiAsPromised from 'chai-as-promised';
import SharedResource from './SharedResource.js';

chai.use(chaiAsPromised);
chai.should();

describe('Test SharedResource', function () {
  describe('Given the resource initialized but not yet requested', function () {
    beforeEach(function () {
      this.clock = sinon.useFakeTimers();
      this.resource = new SharedResource({
        cleanupDelay: 1000,
        create:       cb => setTimeout(cb, 1000),
      });
    });

    afterEach(function () {
      this.clock.restore();
    });

    it('the number of users should be 0', function () {
      this.resource.getNumberOfUsers().should.equal(0);
    });

    it('should report that it is clean', function () {
      this.resource.isClean().should.be.true;
    });

    it('even after a couple of seconds, should still be clean', function () {
      this.clock.tick(5000);
      this.resource.isClean().should.be.true;
    });
  });

  describe('Given the resource is broken', function () {
    beforeEach(function () {
      this.clock = sinon.useFakeTimers();
      this.resource = new SharedResource({
        cleanupDelay: 1000,
        create:       (() => {
          let counter = 0;
          return cb => setTimeout(() => {
            counter += 1;
            if (counter % 2 === 1) {
              cb(new Error('Broken.'));
            } else {
              cb(null, 1234);
            }
          }, 1000);
        })(),
      });
      this.users = [this.resource.require()];
    });

    afterEach(function () {
      this.clock.restore();
    });

    it('the promise should fail after 1 sec.', function () {
      this.clock.tick(1000);
      this.clock.restore();
      return this.users[0].promise.should.be.rejectedWith(Error, 'Broken.');
    });

    describe('after the second try', function () {
      beforeEach(function () {
        this.clock.tick(1000); // first wait until it breaks ...
        // return this.users[0].promise.should.be.rejectedWith(Error, 'Broken.');
      });

      beforeEach(function () {
        this.users[1] = this.resource.require();
      });

      it('the promise should resolve', function () {
        this.clock.tick(1000);
        this.clock.restore();
        return this.users[1].promise.should.eventually.equal(1234);
      });

      it('the number of users should be 2', function () {
        this.resource.getNumberOfUsers().should.equal(2);
      });
    });
  });

  describe('Given the resource was requested by a single user', function () {
    beforeEach(function () {
      this.clock = sinon.useFakeTimers();
      this.resource = new SharedResource({
        cleanupDelay: 10000,
        create:       cb => setTimeout(cb, 10000),
      });
      this.users = [this.resource.require()];
    });

    afterEach(function () {
      this.clock.restore();
    });

    it('the number of users should be 1', function () {
      this.resource.getNumberOfUsers().should.equal(1);
    });

    it('the promise should resolve after 10 sec.', function () {
      this.clock.tick(10000);
      return this.users[0].promise;
    });

    describe('and the resource was released', function () {
      beforeEach(function () {
        this.users[0].release();
      });

      it('the number of users should drop to 0', function () {
        this.resource.getNumberOfUsers().should.equal(0);
      });

      it('the resource should not be removed immediatelly', function () {
        this.resource.isClean().should.be.false;
      });

      describe('after subsequent release()', function () {
        beforeEach(function () {
          this.users[0].release();
        });

        it('the number of users should still be 0', function () {
          this.resource.getNumberOfUsers().should.equal(0);
        });
      });

      describe('after waiting for 5 sec.', function () {
        beforeEach(function () {
          this.clock.tick(5000);
        });

        it('the resource should be removed', function () {
          this.resource.isClean().should.be.false;
        });
      });

      describe('after waiting for 10 sec.', function () {
        beforeEach(function () {
          this.clock.tick(10000);
        });

        it('the resource should be removed', function () {
          this.resource.isClean().should.be.true;
        });
      });

      describe('but if it was requested by another user after 5 sec', function () {
        beforeEach(function () {
          this.clock.tick(5000);
          this.users[1] = this.resource.require();
        });

        describe('after waiting for another 1/2 sec', function () {
          beforeEach(function () {
            this.clock.tick(5000);
          });

          it('the resource should not be removed', function () {
            this.resource.isClean().should.be.false;
          });
        });
      });
    });
  });

  describe('Given the resource was requested by two users', function () {
    beforeEach(function () {
      this.clock = sinon.useFakeTimers();
      this.resource = new SharedResource({
        cleanupDelay: 10000,
        create:       cb => setTimeout(cb, 10000),
      });
      this.users = [0, 1].map(() => this.resource.require());
    });

    afterEach(function () {
      this.clock.restore();
    });

    it('the number of users should be 2', function () {
      this.resource.getNumberOfUsers().should.equal(2);
    });

    it('both promises should resolve after 10 sec.', function () {
      this.clock.tick(10000);
      return Promise.all(this.users.map(u => u.promise));
    });

    describe('and the resource was released by one of the users', function () {
      beforeEach(function () {
        this.users[0].release();
      });

      it('the number of users should drop to 1', function () {
        this.resource.getNumberOfUsers().should.equal(1);
      });

      it('the resource should not be removed immediatelly', function () {
        this.resource.isClean().should.be.false;
      });

      describe('after subsequent release()', function () {
        beforeEach(function () {
          this.users[0].release();
        });

        it('the number of users should still be 1', function () {
          this.resource.getNumberOfUsers().should.equal(1);
        });
      });

      describe('after waiting for 10 sec.', function () {
        beforeEach(function () {
          this.clock.tick(10000);
        });

        it('the resource should not be removed', function () {
          this.resource.isClean().should.be.false;
        });
      });
    });

    describe('and the resource was released by both users', function () {
      beforeEach(function () {
        this.users[0].release();
        this.users[1].release();
      });

      it('the number of users should drop to 0', function () {
        this.resource.getNumberOfUsers().should.equal(0);
      });

      it('the resource should not be removed immediatelly', function () {
        this.resource.isClean().should.be.false;
      });

      describe('after subsequent release()', function () {
        beforeEach(function () {
          this.users[0].release();
          this.users[1].release();
        });

        it('the number of users should still be 0', function () {
          this.resource.getNumberOfUsers().should.equal(0);
        });
      });

      describe('after waiting for 1 sec.', function () {
        beforeEach(function () {
          this.clock.tick(10000);
        });

        it('the resource should be removed', function () {
          this.resource.isClean().should.be.true;
        });
      });
    });
  });
});

