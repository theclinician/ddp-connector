
class ValidationError extends Error {
  constructor(errors, reason) {
    super(reason);
    this.error = 'ValidationError';
    this.reason = reason;
    this.details = errors;
  }
}

export const callMethod = (apiSpec, params) => (dispatch, getState, { ddpConnector }) =>
  apiSpec.callMethod(params, { client: ddpConnector, ValidationError });

export const refreshQuery = (apiSpec, params) => (dispatch, getState, { ddpConnector }) => {
  const request = apiSpec.withParams(params);
  return ddpConnector.refreshQuery(request);
}
