/* eslint-env mocha */

import {
  createEntitiesSelectors,
} from './selectors.js';

describe('Test selectors', () => {
  beforeEach(function () {
    this.selectors = createEntitiesSelectors('collection');
    this.store1 = {
      ddp: {
        entities: {
          collection: {
            1: { _id: '1', flag: false },
            2: { _id: '2', flag: true },
          },
        },
      },
    };
    this.store2 = {
      ddp: {
        entities: {
          collection: {
            ...this.store1.ddp.entities.collection,
            3: { _id: '3', flag: false },
          },
        },
      },
    };
    this.store3 = {
      ddp: {
        entities: {
          collection: {
            ...this.store2.ddp.entities.collection,
            3: { _id: '3', flag: true },
          },
        },
      },
    };
    this.store4 = {
      ddp: {
        entities: {
          collection: {
            ...this.store3.ddp.entities.collection,
            2: {
              ...this.store3.ddp.entities.collection[2],
              letter: 'x',
            },
          },
        },
      },
    };
  });
  describe.only('createEntitiesSelectors.find()', () => {
    beforeEach(function () {
      //--------------------------------------------------
      const find = this.selectors.find(doc => !!doc.flag);
      //--------------------------------------------------
      this.result1 = find(this.store1);
      this.result2 = find(this.store2);
      this.result3 = find(this.store3);
      this.result4 = find(this.store4);
    });
    it('should find one flagged document', function () {
      this.result1.should.have.members([
        this.store1.ddp.entities.collection[2],
      ]);
    });
    it('should return the same value on second try', function () {
      this.result1.should.equal(this.result2);
    });
    it('should update result when new element is added', function () {
      this.result3.should.have.members([
        this.store3.ddp.entities.collection[2],
        this.store3.ddp.entities.collection[3],
      ]);
    });
    it('should update result when an element is changed', function () {
      this.result4.should.have.members([
        this.store4.ddp.entities.collection[2],
        this.store4.ddp.entities.collection[3],
      ]);
    });
  });
});
