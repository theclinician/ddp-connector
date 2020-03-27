import isEqual from 'lodash/isEqual';
import {
  useRef,
  useEffect,
  useState,
} from 'react';

const useDebounce = (newValue, debounceMs = 0) => {
  const [
    value,
    setValue,
  ] = useState(newValue);
  const memo = useRef();
  if (!isEqual(memo.current, newValue)) {
    memo.current = newValue;
  }
  useEffect(
    () => {
      let handle;
      if (debounceMs > 0 && !isEqual(value, newValue)) {
        handle = setTimeout(() => {
          setValue(newValue);
        }, debounceMs);
      }
      return () => {
        if (handle) {
          clearTimeout(handle);
          handle = null;
        }
      };
    },
    [
      newValue,
      value,
      setValue,
    ],
  );
  if (debounceMs > 0) {
    return value;
  }
  return memo.current;
};

export default useDebounce;
