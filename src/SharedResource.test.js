/* eslint-env jest */
/* eslint prefer-arrow-callback: "off", no-unused-expressions: "off" */
import SharedResource from './SharedResource.js';

jest.useFakeTimers();

describe('Test SharedResource', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  describe('Given the resource initialized but not yet requested', () => {
    beforeEach(() => {
      testContext.resource = new SharedResource({
        cleanupDelay: 1000,
        create: cb => setTimeout(cb, 1000),
      });
    });

    test('the number of users should be 0', () => {
      expect(testContext.resource.getNumberOfUsers()).toBe(0);
    });

    test('should report that it is clean', () => {
      expect(testContext.resource.isClean()).toBe(true);
    });

    test('even after a couple of seconds, should still be clean', () => {
      jest.advanceTimersByTime(5000);
      expect(testContext.resource.isClean()).toBe(true);
    });
  });

  describe('Given the resource is broken', () => {
    let ts = Date.now();
    beforeEach(() => {
      testContext.resource = new SharedResource({
        getDate: () => new Date(ts),
        cleanupDelay: 1000,
        cleanupDelayOnError: 500,
        create: (() => {
          let counter = 0;
          return cb => setTimeout(() => {
            counter += 1;
            if (counter % 2 === 1) {
              cb(new Error('Resource is broken [test].'));
            } else {
              cb(null, 1234);
            }
          }, 1000);
        })(),
      });
      testContext.users = [testContext.resource.require()];
    });

    test('the promise should fail after 1 sec.', () => {
      jest.advanceTimersByTime(1000);
      return expect(testContext.users[0].promise).rejects.toThrow(Error, 'Broken.');
    });

    describe('after the second try', () => {
      beforeEach(() => {
        jest.advanceTimersByTime(1000); // first wait until it breaks ...
        return testContext.users[0].promise.catch(() => {
          // ignore error ...
        });
      });

      beforeEach(() => {
        ts += 1000;
        testContext.users[1] = testContext.resource.require();
      });

      test('the promise should resolve', () => {
        jest.advanceTimersByTime(1000);
        return expect(testContext.users[1].promise).resolves.toBe(1234);
      });

      test('the number of users should be 2', () => {
        expect(testContext.resource.getNumberOfUsers()).toBe(2);
      });
    });
  });

  describe('Given the resource was requested by a single user', () => {
    beforeEach(() => {
      testContext.resource = new SharedResource({
        cleanupDelay: 10000,
        create:       cb => setTimeout(cb, 10000),
      });
      testContext.users = [testContext.resource.require()];
    });

    test('the number of users should be 1', () => {
      expect(testContext.resource.getNumberOfUsers()).toBe(1);
    });

    test('the promise should resolve after 10 sec.', () => {
      jest.advanceTimersByTime(10000);
      return testContext.users[0].promise;
    });

    describe('and the resource was released', () => {
      beforeEach(() => {
        testContext.users[0].release();
      });

      test('the number of users should drop to 0', () => {
        expect(testContext.resource.getNumberOfUsers()).toBe(0);
      });

      test('the resource should not be removed immediately', () => {
        expect(testContext.resource.isClean()).toBe(false);
      });

      describe('after subsequent release()', () => {
        beforeEach(() => {
          testContext.users[0].release();
        });

        test('the number of users should still be 0', () => {
          expect(testContext.resource.getNumberOfUsers()).toBe(0);
        });
      });

      describe('after waiting for 5 sec.', () => {
        beforeEach(() => {
          jest.advanceTimersByTime(5000);
        });

        test('the resource should be removed', () => {
          expect(testContext.resource.isClean()).toBe(false);
        });
      });

      describe('after waiting for 10 sec.', () => {
        beforeEach(() => {
          jest.advanceTimersByTime(10000);
        });

        test('the resource should be removed', () => {
          expect(testContext.resource.isClean()).toBe(true);
        });
      });

      describe('but if it was requested by another user after 5 sec', () => {
        beforeEach(() => {
          jest.advanceTimersByTime(5000);
          testContext.users[1] = testContext.resource.require();
        });

        describe('after waiting for another 1/2 sec', () => {
          beforeEach(() => {
            jest.advanceTimersByTime(5000);
          });

          test('the resource should not be removed', () => {
            expect(testContext.resource.isClean()).toBe(false);
          });
        });
      });
    });
  });

  describe('Given the resource was requested by two users', () => {
    beforeEach(() => {
      testContext.resource = new SharedResource({
        cleanupDelay: 10000,
        create:       cb => setTimeout(cb, 10000),
      });
      testContext.users = [0, 1].map(() => testContext.resource.require());
    });

    test('the number of users should be 2', () => {
      expect(testContext.resource.getNumberOfUsers()).toBe(2);
    });

    test('both promises should resolve after 10 sec.', () => {
      jest.advanceTimersByTime(10000);
      return Promise.all(testContext.users.map(u => u.promise));
    });

    describe('and the resource was released by one of the users', () => {
      beforeEach(() => {
        testContext.users[0].release();
      });

      test('the number of users should drop to 1', () => {
        expect(testContext.resource.getNumberOfUsers()).toBe(1);
      });

      test('the resource should not be removed immediately', () => {
        expect(testContext.resource.isClean()).toBe(false);
      });

      describe('after subsequent release()', () => {
        beforeEach(() => {
          testContext.users[0].release();
        });

        test('the number of users should still be 1', () => {
          expect(testContext.resource.getNumberOfUsers()).toBe(1);
        });
      });

      describe('after waiting for 10 sec.', () => {
        beforeEach(() => {
          jest.advanceTimersByTime(10000);
        });

        test('the resource should not be removed', () => {
          expect(testContext.resource.isClean()).toBe(false);
        });
      });
    });

    describe('and the resource was released by both users', () => {
      beforeEach(() => {
        testContext.users[0].release();
        testContext.users[1].release();
      });

      test('the number of users should drop to 0', () => {
        expect(testContext.resource.getNumberOfUsers()).toBe(0);
      });

      test('the resource should not be removed immediately', () => {
        expect(testContext.resource.isClean()).toBe(false);
      });

      describe('after subsequent release()', () => {
        beforeEach(() => {
          testContext.users[0].release();
          testContext.users[1].release();
        });

        test('the number of users should still be 0', () => {
          expect(testContext.resource.getNumberOfUsers()).toBe(0);
        });
      });

      describe('after waiting for 1 sec.', () => {
        beforeEach(() => {
          jest.advanceTimersByTime(10000);
        });

        test('the resource should be removed', () => {
          expect(testContext.resource.isClean()).toBe(true);
        });
      });
    });
  });
});
