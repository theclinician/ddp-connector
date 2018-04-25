/* eslint-env jest */
/* eslint no-unused-expressions: "off" */

import createValuesMappingSelector from './createValuesMappingSelector';

const constant = x => () => x;
const identity = x => x;

let textContext;

describe('Test utility - createValuesMappingSelector', () => {
  beforeEach(() => {
    textContext = {};
    textContext.object = {};
    textContext.identity = createValuesMappingSelector(identity, identity);
    textContext.constant = createValuesMappingSelector(identity, constant(textContext.object));
  });

  describe('Given an empty object', () => {
    it('should not be changed by identity mapping', () => {
      const x = {};
      expect(textContext.identity(x)).toEqual(x);
    });

    it('should not be changed by constant mapping', () => {
      const x = {};
      expect(textContext.constant(x)).toEqual(x);
    });

    it('should return the same result when called with similar argument', () => {
      const x = {};
      const y = {};
      expect(textContext.constant(x)).toEqual(textContext.constant(y));
    });
  });

  describe('Given a non-empty object', () => {
    it('should not be changed by identity mapping', () => {
      const x = {
        a: {},
        b: {},
      };
      expect(textContext.identity(x)).toEqual(x);
    });
    it('should be changed by constant mapping', () => {
      const x = {
        a: {},
        b: {},
      };
      expect(textContext.constant(x)).not.toBe(x);
    });
    it('should return the same result when called with similar argument', () => {
      const x = {
        a: {},
        b: {},
      };
      const y = {
        ...x,
      };
      expect(textContext.constant(x)).toEqual(textContext.constant(y));
    });
  });
});
