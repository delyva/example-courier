/*
  Cancel shipment
*/

const logger = require('logger');

const customError = require('./custom-error');
const getToken = require('./get-token');

/**
 * Cancel an order #
 * @param {String} consignmentNo
 * @return {Object}
 */
async function cancelOrder(consignmentNo, retryCount = 0) {
  // get auth token
  this.axios.defaults.headers.common.Authorization = await getToken(this.config);

  try {
    // EDIT HERE: CALL COURIER API
    const cancel = await this.axios.delete();

    return ({
      success: true, // or false
    });
  } catch (err) {
    // if token expired, retry
    if (err.response.status === 401 && retryCount === 0) {
      await getToken(this.config, true);
      return this.cancelOrder(consignmentNo, 1);
    }

    const errInstance = await customError(err);
    return Promise.reject(new Error(errInstance));
  }
}

module.exports = cancelOrder;
