const logger = require('logger');

function customError(err) {
  if (err.response) {
    if (err.response.data) {
      logger.debug('[EXAMPLE-PLUGIN]: err response data', err.response.data);
      return `[${err.response.status}] - ${JSON.stringify(err.response.data)}`;
    }
    return `[${err.response.status}] - ${err.response}`;
  }

  if (err.request) {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('[EXAMPLE-PLUGIN] err request', err.request);
    }
    return err.request;
  }

  return err.message;
}

module.exports = customError;
