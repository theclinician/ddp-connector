/* eslint-env jest */

import {
  createEntitiesSelectors,
} from './selectors';

const constant = x => () => x;

describe('Test selectors - legacy api', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.selectors = createEntitiesSelectors('collection');
    testContext.state1 = {
      ddp: {
        entities: {
          collection: {
            1: { _id: '1', flag: false },
            2: { _id: '2', flag: true },
          },
        },
      },
    };
    testContext.state2 = {
      ddp: {
        entities: {
          collection: {
            ...testContext.state1.ddp.entities.collection,
            3: { _id: '3', flag: false },
          },
        },
      },
    };
    testContext.state3 = {
      ddp: {
        entities: {
          collection: {
            ...testContext.state2.ddp.entities.collection,
            3: { _id: '3', flag: true },
          },
        },
      },
    };
    testContext.state4 = {
      ddp: {
        entities: {
          collection: {
            ...testContext.state3.ddp.entities.collection,
            2: {
              ...testContext.state3.ddp.entities.collection[2],
              letter: 'x',
            },
          },
        },
      },
    };
  });

  beforeEach(() => {
    //---------------------------------------------------------
    const find = testContext.selectors.find(doc => !!doc.flag);
    //---------------------------------------------------------
    testContext.result1 = find(testContext.state1);
    testContext.result2 = find(testContext.state2);
    testContext.result3 = find(testContext.state3);
    testContext.result4 = find(testContext.state4);
  });

  describe('createEntitiesSelectors.find()', () => {
    test('should find one flagged document', () => {
      expect(testContext.result1).toEqual(expect.arrayContaining([
        testContext.state1.ddp.entities.collection[2],
      ]));
    });
    test('should return the same value on second try', () => {
      expect(testContext.result1).toBe(testContext.result2);
    });
    test('should update result when new element is added', () => {
      expect(testContext.result3).toEqual(expect.arrayContaining([
        testContext.state3.ddp.entities.collection[2],
        testContext.state3.ddp.entities.collection[3],
      ]));
    });
    test('should update result when an element is changed', () => {
      expect(testContext.result4).toEqual(expect.arrayContaining([
        testContext.state4.ddp.entities.collection[2],
        testContext.state4.ddp.entities.collection[3],
      ]));
    });
  });
});

describe('Test selectors - "where" api', () => {
  let testContext;

  beforeEach(() => {
    testContext = {};
  });

  beforeEach(() => {
    testContext.selectors = {
      col1: createEntitiesSelectors('col1'),
      col2: createEntitiesSelectors('col2'),
    };
    testContext.entities1 = {
      col1: {
        1: {
          _id: '1',
          a: 1,
          b: 2,
          c: 3,
          d: 4,
        },
      },
      col2: {
        1: {
          _id: '1',
          a: 9,
          b: 2,
        },
      },
    };
    testContext.entities2 = {
      ...testContext.entities1,
      col1: {
        ...testContext.entities1.col1,
        2: {
          _id: '2',
          a: 1,
          b: 2,
        },
      },
    };
    testContext.state1 = { ddp: { entities: testContext.entities1 } };
    testContext.state2 = { ddp: { entities: testContext.entities2 } };
  });

  it('should select a document by id', () => {
    const selector = testContext.selectors.col1.one.id(constant('1'));
    const expected = {
      _id: '1',
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    const doc1 = selector(testContext.state1);
    const doc2 = selector(testContext.state2);
    expect(doc1).toEqual(expected);
    expect(doc2).toBe(doc1);
  });

  it('should find all documents', () => {
    const predicate = constant(true);
    const selector = testContext.selectors.col1.where(() => predicate);
    const doc1 = {
      _id: '1',
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    const doc2 = {
      _id: '2',
      a: 1,
      b: 2,
    };
    const results1 = selector(testContext.state1);
    const results2 = selector(testContext.state2);
    expect(results1).toEqual([
      doc1,
    ]);
    expect(results2).toEqual([
      doc1,
      doc2,
    ]);
  });

  it('should find all matching documents', () => {
    const predicate = x => x.c === 3;
    const selector = testContext.selectors.col1.where(() => predicate);
    const doc1 = {
      _id: '1',
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    const results1 = selector(testContext.state1);
    const results2 = selector(testContext.state2);
    expect(results1).toEqual([
      doc1,
    ]);
    expect(results2).toEqual([
      doc1,
    ]);
  });

  it('should find one matching document', () => {
    const predicate = x => x.c === 3;
    const selector = testContext.selectors.col1.one.where(() => predicate);
    const doc1 = {
      _id: '1',
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    const results1 = selector(testContext.state1);
    const results2 = selector(testContext.state2);
    expect(results1).toEqual(doc1);
    expect(results2).toEqual(doc1);
  });
});

