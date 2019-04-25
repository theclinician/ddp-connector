/* eslint-env jest */
import createEntitiesSelectors from './createEntitiesSelectors';

const constant = x => () => x;
const argument = i => (...args) => args[i];

const empty = {};
const state = {
  ddp: {
    status: {
    },
    entities: {
      collection: {
        1: {
          id: 1,
          value: 1,
        },
        2: {
          id: 2,
          value: 1,
        },
        3: {
          id: 3,
          value: 2,
        },
        4: {
          id: 4,
          value: 0,
        },
      },
    },
  },
};

const state1 = state;
const state2 = {
  ...state,
  ddp: {
    ...state.ddp,
    entities: {
      ...state.ddp.entities,
      collection: {
        ...state.ddp.entities.collection,
        4: {
          id: 4,
          value: 3,
        },
      },
    },
  },
};

const selectors = createEntitiesSelectors('collection', {
  plugins: {
    nLargest: (n, sortOptions) => select => select.sort(sortOptions).limit(n),
    whereValueEquals: value => select => select.where({ value }),
  },
});

test('all().byId() selects empty object if state is empty', () => {
  expect(selectors.all().byId()(empty)).toEqual({});
});

test('all() selects empty array if state is empty', () => {
  expect(selectors.all()(empty)).toEqual([]);
});

test('one().byId() selects empty object if state is empty', () => {
  expect(selectors.one().byId()(empty)).toEqual({});
});

test('one() selects nothing if state is empty', () => {
  expect(selectors.one()(empty)).toEqual(null);
});

test('one().whereIdEquals() selects a document by id', () => {
  expect(selectors.one().whereIdEquals(constant('1'))(state)).toEqual({ id: 1, value: 1 });
});

test('one().byId() selects an object with one key', () => {
  expect(selectors.one().byId()(state)).toEqual({
    1: {
      id: 1,
      value: 1,
    },
  });
});

test('all().limit(2).byId() selects at most two documents', () => {
  expect(selectors.all().limit(2).byId()(state)).toEqual({
    1: {
      id: 1,
      value: 1,
    },
    2: {
      id: 2,
      value: 1,
    },
  });
});

test('all().sort({ value: -1 }).limit(2) selects two top values', () => {
  expect(selectors.all().sort({ value: -1, id: 1 }).limit(2)(state)).toEqual([
    { id: 3, value: 2 },
    { id: 1, value: 1 },
  ]);
});

test('all().nLargest(2, { value: -1, id: 1 }) selects two top values', () => {
  expect(selectors.all().nLargest(2, { value: -1, id: 1 })(state)).toEqual([
    { id: 3, value: 2 },
    { id: 1, value: 1 },
  ]);
});

test('whereValueEquals() selects an element with the given value', () => {
  expect(selectors.one().whereValueEquals(0)(state)).toEqual({
    id: 4,
    value: 0,
  });
});

test('selects a document by id using legacy api', () => {
  expect(selectors.getOne(constant('1'))(state)).toEqual({ id: 1, value: 1 });
});

test('selects one document by criteria', () => {
  expect(selectors.one.where({ id: argument(1) })(state, 1)).toEqual({ id: 1, value: 1 });
});

test('selects one document by criteria using legacy api', () => {
  expect(selectors.findOne((doc, id) => doc.id === id, argument(1))(state, 1)).toEqual({ id: 1, value: 1 });
});

test('selects all documents by id', () => {
  expect(selectors.all().byId()(state)).toEqual({
    1: { id: 1, value: 1 },
    2: { id: 2, value: 1 },
    3: { id: 3, value: 2 },
    4: { id: 4, value: 0 },
  });
});

test('selects all documents by id using legacy api', () => {
  expect(selectors.getAllById(state)).toEqual({
    1: { id: 1, value: 1 },
    2: { id: 2, value: 1 },
    3: { id: 3, value: 2 },
    4: { id: 4, value: 0 },
  });
});

test('selects all documents', () => {
  expect(selectors.all()(state)).toEqual([
    { id: 1, value: 1 },
    { id: 2, value: 1 },
    { id: 3, value: 2 },
    { id: 4, value: 0 },
  ]);
});

test('selects all documents using legacy api', () => {
  expect(selectors.getAll(state)).toEqual([
    { id: 1, value: 1 },
    { id: 2, value: 1 },
    { id: 3, value: 2 },
    { id: 4, value: 0 },
  ]);
});

test('selects all documents by criteria', () => {
  expect(selectors.where({ value: argument(1) })(state, 1)).toEqual([
    { id: 1, value: 1 },
    { id: 2, value: 1 },
  ]);
});

test('selects all documents by criteria using legacy api', () => {
  expect(selectors.find((doc, value) => doc.value === value, argument(1))(state, 1)).toEqual([
    { id: 1, value: 1 },
    { id: 2, value: 1 },
  ]);
});

test('selects all documents by criteria and sorts them', () => {
  const selector = selectors.where({ value: argument(1) }).sort({ id: -1 });
  expect(selector(state, 1)).toEqual([
    { id: 2, value: 1 },
    { id: 1, value: 1 },
  ]);
});

test('sorts documents using explicit compare function', () => {
  const compare = (a, b) => b.id - a.id;
  const selector = selectors.all().withCompare(compare);
  expect(selector(state, 1)).toEqual([
    { id: 4, value: 0 },
    { id: 3, value: 2 },
    { id: 2, value: 1 },
    { id: 1, value: 1 },
  ]);
});

test('composes multiple sorting criteria', () => {
  const selector = selectors.all()
    .withCompare((a, b) => a.value - b.value)
    .sort({ id: -1 });
  expect(selector(state, 1)).toEqual([
    { id: 4, value: 0 },
    { id: 2, value: 1 },
    { id: 1, value: 1 },
    { id: 3, value: 2 },
  ]);
});

test('composes multiple sorting criteria using object notation', () => {
  const selector = selectors.all().sort({ value: 1, id: -1 });
  expect(selector(state, 1)).toEqual([
    { id: 4, value: 0 },
    { id: 2, value: 1 },
    { id: 1, value: 1 },
    { id: 3, value: 2 },
  ]);
});

test('selects and map all documents by criteria using legacy api', () => {
  expect(selectors.findAndMap((doc, value) => doc.value === value, doc => doc.id, argument(1))(state, 1)).toEqual([1, 2]);
});

test('persists value if result is the same', () => {
  const selector = selectors.where({ value: argument(1) });
  const result1 = selector(state1, 1);
  const result2 = selector(state2, 1);
  expect(result1).toBe(result2);
});
