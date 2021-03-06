/* eslint-env jest */
import createResourcesSelectorFactory from './createResourcesSelectorFactory';

const constant = x => () => x;

describe('Test createResourcesSelectorFactory', () => {
  let factory = null;

  const state = {
    ddp: {
      queries: {
        q1: {
          request: {
            x: 1,
            y: 1,
          },
        },
        q2: {
          request: {
            x: 2,
            y: 2,
          },
        },
      },
    },
  };

  const state2 = {
    ddp: {
      queries: {
        q1: state.ddp.queries.q1,
        q3: {
          request: {
            x: 3,
            y: 3,
          },
        },
      },
    },
  };

  beforeEach(() => {
    factory = createResourcesSelectorFactory('queries');
  });

  test('accepts null and returns null', () => {
    expect(factory(constant(null))(state)).toEqual(null);
  });

  test('accepts an empty array', () => {
    expect(factory(constant([]))(state)).toEqual([]);
  });

  test('accepts an empty object', () => {
    expect(factory(constant({}))(state)).toEqual({});
  });

  test('selects "ready" if nothing is requested', () => {
    expect(factory(constant([null]))(state)).toEqual([{
      ready: true,
    }]);
  });

  test('selects query based on params', () => {
    expect(factory(constant([{
      x: 1,
      y: 1,
    }]))(state)).toEqual([{
      request: {
        x: 1,
        y: 1,
      },
    }]);
  });

  test('returns values in requested format', () => {
    expect(factory(constant({
      query: {
        x: 1,
        y: 1,
      },
    }))(state)).toEqual({
      query: {
        request: {
          x: 1,
          y: 1,
        },
      },
    });
  });

  test('properly processes successive selections', () => {
    expect(factory(constant([{
      x: 2,
      y: 2,
    }]))(state)).toEqual([{
      request: {
        x: 2,
        y: 2,
      },
    }]);

    expect(factory(constant([{
      x: 2,
      y: 2,
    }]))(state2)).toEqual([null]);
  });
});
