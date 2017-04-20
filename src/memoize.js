/* eslint-disable */

function defaultEqualityCheck(a, b) {
  return a === b;
}

function areArgumentsShallowlyEqual(equalityCheck, prev, next) {
  if (prev === null || next === null || prev.length !== next.length) {
    return false
  }
  const length = prev.length
  for (let i = 0; i < length; i++) {
    if (!equalityCheck(prev[i], next[i])) {
      return false
    }
  }
  return true
}

export function defaultMemoize(func, equalityCheck = defaultEqualityCheck, resultEqualityCheck = defaultEqualityCheck) {
  let lastArgs = null
  let lastResult = null
  // we reference arguments instead of spreading them for performance reasons
  return function () {
    if (!areArgumentsShallowlyEqual(equalityCheck, lastArgs, arguments)) {
      // apply arguments instead of spreading for performance.
      const result = func.apply(null, arguments);
      if (!resultEqualityCheck(lastResult, result)) {
        lastResult = result;
      }
    }
    lastArgs = arguments;
    return lastResult
  }
}
