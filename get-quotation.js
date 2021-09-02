/*
  Get price quotation
*/
// const logger = require('logger');
// const Unit = require('units-converter');

const customError = require('./custom-error');
const getToken = require('./get-token');

/**
 * requests a rate quotation for the delivery.
 * @param {Object}
 * @return {Object} quotation
 */
async function getQuotation(body, serviceCode, retryCount = 0) {
  // get auth token
  this.axios.defaults.headers.common.Authorization = await getToken(this.config);

  try {
    if (!Array.isArray(body.waypoint)) {
      if (!Array.isArray(body.waypoint)) {
        throw new Error('[EXAMPLE-PLUGIN] Order has no waypoint, expecting exactly 2 waypoints');
      }
      throw new Error(`[EXAMPLE-PLUGIN] Order has ${body.waypoint.length} waypoint, expecting exactly 2 waypoints`);
    }

    const sender = body.waypoint.find(x => x.type === 'PICKUP');
    const receiver = body.waypoint.find(x => x.type === 'DROPOFF');

    logger.debug({ sender, receiver });

    // EDIT HERE: CALL COURIER API
    const response = await this.axios.post();;

    return Promise.resolve({
      price: {
        amount: response.amount, // required
        currency: response.currency.symbol, // required
      },
    });
  } catch (err) {
    // if token expired, retry
    if (err.response.status === 401 && retryCount === 0) {
      await getToken(this.config, true);
      return this.getQuotation(body, serviceCode, 1);
    }

    const errInstance = await customError(err);
    return Promise.reject(new Error(errInstance));
  }
}

module.exports = getQuotation;
