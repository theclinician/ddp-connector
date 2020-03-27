import {
  useState,
  useContext,
  useCallback,
} from 'react';
import {
  DDPContext,
} from './DDPProvider';

const useDDPMutation = ({
  onError,
} = {}) => {
  const ddpConnector = useContext(DDPContext);
  const [
    isReady,
    setIsReady,
  ] = useState(true);
  const mutate = useCallback(
    (request, options) => {
      if (!request) {
        return Promise.resolve();
      }
      const {
        name,
        params,
      } = request;
      setIsReady(false);
      return ddpConnector.apply(name, params, options)
        .then((result) => {
          setIsReady(true);
          return result;
        })
        .catch((err) => {
          setIsReady(true);
          if (onError) {
            onError(err);
          } else {
            throw err;
          }
        });
    },
    [
      setIsReady,
    ],
  );
  return {
    ready: !!isReady,
    mutate,
  };
};

export default useDDPMutation;
