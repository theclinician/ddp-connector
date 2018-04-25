/* eslint-env jest */

import {
  createEntitiesSelectors,
} from './selectors.js';

describe('Test selectors', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.selectors = createEntitiesSelectors('collection');
    testContext.store1 = {
      ddp: {
        entities: {
          collection: {
            1: { _id: '1', flag: false },
            2: { _id: '2', flag: true },
          },
        },
      },
    };
    testContext.store2 = {
      ddp: {
        entities: {
          collection: {
            ...testContext.store1.ddp.entities.collection,
            3: { _id: '3', flag: false },
          },
        },
      },
    };
    testContext.store3 = {
      ddp: {
        entities: {
          collection: {
            ...testContext.store2.ddp.entities.collection,
            3: { _id: '3', flag: true },
          },
        },
      },
    };
    testContext.store4 = {
      ddp: {
        entities: {
          collection: {
            ...testContext.store3.ddp.entities.collection,
            2: {
              ...testContext.store3.ddp.entities.collection[2],
              letter: 'x',
            },
          },
        },
      },
    };
  });
  describe('createEntitiesSelectors.find()', () => {
    beforeEach(() => {
      //--------------------------------------------------
      const find = testContext.selectors.find(doc => !!doc.flag);
      //--------------------------------------------------
      testContext.result1 = find(testContext.store1);
      testContext.result2 = find(testContext.store2);
      testContext.result3 = find(testContext.store3);
      testContext.result4 = find(testContext.store4);
    });
    test('should find one flagged document', () => {
      expect(testContext.result1).toEqual(expect.arrayContaining([
        testContext.store1.ddp.entities.collection[2],
      ]));
    });
    test('should return the same value on second try', () => {
      expect(testContext.result1).toBe(testContext.result2);
    });
    test('should update result when new element is added', () => {
      expect(testContext.result3).toEqual(expect.arrayContaining([
        testContext.store3.ddp.entities.collection[2],
        testContext.store3.ddp.entities.collection[3],
      ]));
    });
    test('should update result when an element is changed', () => {
      expect(testContext.result4).toEqual(expect.arrayContaining([
        testContext.store4.ddp.entities.collection[2],
        testContext.store4.ddp.entities.collection[3],
      ]));
    });
  });
});
