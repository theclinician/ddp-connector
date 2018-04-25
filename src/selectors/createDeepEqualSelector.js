import isEqual from 'lodash/isEqual';
import {
  defaultMemoize,
  createSelectorCreator,
} from 'reselect';

const createDeepEqualSelector = createSelectorCreator(
  defaultMemoize,
  isEqual,
);

export default createDeepEqualSelector;
