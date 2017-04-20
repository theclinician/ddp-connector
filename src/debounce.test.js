/* eslint-env mocha */
/* eslint prefer-arrow-callback: "off" */
/* eslint no-unused-expressions: "off" */

import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import chai from 'chai';
import { debounce, debounceKey } from './debounce.js';

chai.use(chaiAsPromised);
chai.use(sinonChai);
chai.should();

describe('Test Debounce', function () {
  beforeEach(function () {
    this.clock = sinon.useFakeTimers();
    this.spy1 = sinon.spy();
    this.spy2 = sinon.spy();
    this.debounce = debounce(this.spy1, { ms: 100 });
    this.debounceKey = debounceKey(this.spy2, { ms: 200 });
  });

  afterEach(function () {
    this.clock.restore();
  });

  describe('Given I call a debounced function three times', function () {
    beforeEach(function () {
      this.debounce('1', '2');
      this.debounce('3', '4');
      this.debounce('5', '6');
    });

    describe('and I check results immediately', function () {
      it('should not call the function yet', function () {
        this.spy1.should.not.be.called;
      });
    });

    describe('and I wait 100 ms', function () {
      beforeEach(function () {
        this.clock.tick(100);
      });
      it('should call function exactly once', function () {
        this.spy1.should.be.calledOnce;
      });
      it('should ignore the first call', function () {
        this.spy1.should.not.be.calledWith('1', '2');
      });
      it('should ignore the second call', function () {
        this.spy1.should.not.be.calledWith('3', '4');
      });
      it('should call function with proper arguments', function () {
        this.spy1.should.be.calledWith('5', '6');
      });
    });
  });

  describe('Given I call a (key) debounced function four times with two different keys', function () {
    beforeEach(function () {
      this.debounceKey('A', '1', '2');
      this.debounceKey('A', '3', '4');
      this.debounceKey('A', '5', '6');
      this.debounceKey('B', '7', '8');
    });

    describe('and I check results immediately', function () {
      it('should not call the function yet', function () {
        this.spy2.should.not.be.called;
      });
    });

    describe('and I wait 200 ms', function () {
      beforeEach(function () {
        this.clock.tick(200);
      });
      it('should call function exactly two times', function () {
        this.spy2.should.be.calledTwice;
      });
      it('should ignore the first call', function () {
        this.spy2.should.not.be.calledWith('A', '1', '2');
      });
      it('should ignore the second call', function () {
        this.spy2.should.not.be.calledWith('A', '3', '4');
      });
      it('should call function with proper arguments', function () {
        this.spy2.should.be.calledWith('A', '5', '6');
      });
      it('should call function with proper arguments', function () {
        this.spy2.should.be.calledWith('B', '7', '8');
      });
    });
  });

  describe('Given I call a debounced function four times with small delay', function () {
    beforeEach(function () {
      this.debounce('1', '2');
      this.clock.tick(40);
      this.debounce('3', '4');
      this.clock.tick(40);
      this.debounce('5', '6');
      this.clock.tick(40);
      this.debounce('7', '8');
    });

    describe('and I check results immediately', function () {
      it('should not call the function yet', function () {
        this.spy1.should.not.be.called;
      });
    });

    describe('and I check results after another 100 ms', function () {
      beforeEach(function () {
        this.clock.tick(100);
      });

      it('should call function, but only once', function () {
        this.spy1.should.be.calledOnce;
      });
    });
  });

  describe('Given I have a recursive function which I want to debounce', function () {
    beforeEach(function () {
      this.spy3 = sinon.spy();
      this.recursive = debounce((count) => {
        if (count > 0) {
          this.recursive(count - 1);
        }
        this.spy3(count);
      }, { ms: 10 });
      //----------------
      this.recursive(2);
    });

    describe('and I check immediately', function () {
      it('should not call the function yet', function () {
        this.spy3.should.not.be.called;
      });
    });

    describe('and I check after another 10 ms', function () {
      beforeEach(function () {
        this.clock.tick(10);
      });

      it('should call function once', function () {
        this.spy3.should.be.calledOnce;
      });
      it('should call function with proper arguments', function () {
        this.spy3.should.be.calledWith(2);
      });
    });

    describe('and I check after another 30 ms', function () {
      beforeEach(function () {
        this.clock.tick(30);
      });

      it('should call function exactly 3 times', function () {
        this.spy3.should.be.calledThrice;
      });
      it('should call function with proper arguments', function () {
        this.spy3.should.be.calledWith(2);
        this.spy3.should.be.calledWith(1);
        this.spy3.should.be.calledWith(0);
      });
    });
  });
});

