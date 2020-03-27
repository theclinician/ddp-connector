import isEqual from 'lodash/isEqual';
import {
  useRef,
} from 'react';

const useReconcile = (value) => {
  const memo = useRef();
  if (!isEqual(memo.current, value)) {
    memo.current = value;
  }
  return memo.current;
};

export default useReconcile;
