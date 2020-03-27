import {
  useState,
  useContext,
  useCallback,
} from 'react';
import {
  DDPContext,
} from './DDPProvider';

const add = x => y => x + y;

const useDDPCall = ({
  onFailure,
  onSuccess,
} = {}) => {
  const ddpConnector = useContext(DDPContext);
  const [
    totalPending,
    setTotalPending,
  ] = useState(0);
  const ddpCall = useCallback(
    (request, options) => {
      if (!request) {
        return Promise.resolve();
      }
      const {
        name,
        params,
      } = request;
      setTotalPending(add(1));
      return ddpConnector.apply(name, params, options)
        .then((result) => {
          setTotalPending(add(-1));
          if (onSuccess) {
            return onSuccess(result);
          }
          return result;
        })
        .catch((err) => {
          setTotalPending(add(-1));
          if (onFailure) {
            return onFailure(err);
          }
          throw err;
        });
    },
    [
      setTotalPending,
      onFailure,
      onSuccess,
    ],
  );
  return {
    ddpCall,
    ddpIsPending: totalPending > 0,
  };
};

export default useDDPCall;
