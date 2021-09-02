/*
  Create shipment
*/

const logger = require('logger');
const Unit = require('units-converter');
// const Joda = require('@js-joda/core');
// const moment = require('moment-timezone');
// require('@js-joda/timezone');

const customError = require('./custom-error');
const getToken = require('./get-token');

// convert delyva address object to courier address object/format
/**
 * Create an order
 * @param {Object} delyva contact object
 * @return {Object} courier contact object
 */
function buildAddress(contact) {
  const ADDR = {
    Line1: null,
    Line2: null,
    Line3: null,
    City: null,
    StateOrProvinceCode: null,
    PostCode: null,
    CountryCode: contact.country,
  };

  ADDR.Line1 = contact.unitNo;
  ADDR.Line2 = contact.address1;
  ADDR.Line3 = contact.address2;

  if (!ADDR.Line1 || ADDR.Line1 === '') {
    ADDR.Line1 = `${ADDR.Line2}`;
    ADDR.Line2 = ADDR.Line3 ? `${ADDR.Line3}` : null;
    ADDR.Line3 = null;
  }

  if (contact.city) ADDR.City = contact.city;
  if (contact.state) ADDR.StateOrProvinceCode = contact.state;
  if (contact.postcode) ADDR.PostCode = contact.postcode;

  return ADDR;
}

/**
 * Create an order
 * @param {Object} Delyva order object
 * @return {Object}
 */
async function createShipment(delyvaOrder, serviceCode, retryCount = 0) {
  // get auth token
  this.axios.defaults.headers.common.Authorization = await getToken(this.config);

  try {
    if (!Array.isArray(delyvaOrder.waypoint)) {
      if (!Array.isArray(delyvaOrder.waypoint)) {
        throw new Error('[EXAMPLE-PLUGIN] Order has no waypoint, expecting exactly 2 waypoints');
      }
      throw new Error(`[EXAMPLE-PLUGIN] Order has ${delyvaOrder.waypoint.length} waypoint, expecting exactly 2 waypoints`);
    }

    const sender = delyvaOrder.waypoint.find(x => x.type === 'PICKUP');
    const receiver = delyvaOrder.waypoint.find(x => x.type === 'DROPOFF');

    if (!sender) throw new Error('[EXAMPLE-PLUGIN] PICKUP waypoint not found.');
    if (!receiver) throw new Error('[EXAMPLE-PLUGIN] DROPOFF waypoint not found.');

    if (!sender.contact || !sender.contact.coord
      || !sender.contact.coord.lat || !sender.contact.coord.lon) {
      throw new Error('[EXAMPLE-PLUGIN] Sender coordinate is required.');
    }

    if (!receiver.contact || !receiver.contact.coord
      || !receiver.contact.coord.lat || !receiver.contact.coord.lon) {
      throw new Error('[EXAMPLE-PLUGIN] Receiver coordinate is required.');
    }

    // get list of inventory
    const quotedPackages = sender.inventory.map(inv => ({
      name: inv.name,
      description: inv.description || '-',
      quantity: inv.quantity,
      price: delyvaOrder.price.amount,
      dimensions: {
        height: delyvaOrder.dimension ? Unit.length(delyvaOrder.dimension.height).from(delyvaOrder.dimension.unit).to('cm').value : 0,
        width: delyvaOrder.dimension ? Unit.length(delyvaOrder.dimension.width).from(delyvaOrder.dimension.unit).to('cm').value : 0,
        depth: delyvaOrder.dimension ? Unit.length(delyvaOrder.dimension.length).from(delyvaOrder.dimension.unit).to('cm').value : 0,
        weight: delyvaOrder.dimension ? Unit.mass(delyvaOrder.weight.value).from(delyvaOrder.weight.unit).to('g').value : 0,
      },
    }));

    // details to be sent to 3rd party API
    const order = {
      origin: buildAddress(sender),
      destination: buildAddress(receiver),
      weight_value: delyvaOrder.weight.value,
      weight_unit: delyvaOrder.weight.unit,
      pickupDateTime: sender.scheduledAt,
      listOfItem: quotedPackages,
    };

    logger.info(order);

    // EDIT HERE: CALL COURIER API
    const responseFromApi = await this.axios.post();

    return Promise.resolve({
      orderId: delyvaOrder.id, // required
      consignmentNo: String(responseFromApi.trackingNo), // required
      response: responseFromApi, // optional
    });
  } catch (err) {
    // if token expired, retry
    if (err.response.status === 401 && retryCount === 0) {
      await getToken(this.config, true);
      return createShipment(delyvaOrder, serviceCode, 1);
    }

    const errInstance = await customError(err);
    return Promise.reject(new Error(errInstance));
  }
}

module.exports = createShipment;
