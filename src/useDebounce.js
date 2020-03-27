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
      if (debounceMs > 0 && !isEqual(value, memo.current)) {
        handle = setTimeout(() => {
          setValue(memo.current);
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
      memo.current,
      value,
      setValue,
    ],
  );
  return [
    debounceMs > 0 ? value : memo.current,
    memo.current,
  ];
};

export default useDebounce;
