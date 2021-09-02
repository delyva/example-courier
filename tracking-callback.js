/*
  To process incoming webhook callback

  It should return object as below

  response = {
    timeline: {
      companyId,
      consignmentNo: consignment no/ tracking no - required,
      statusCode: delyva status code - required,
      description: event description - optional,
      location: event location - optional,
      createdAt: event time - required,
      podName: pod name - if available,
      podMobile: pod name - if available,
      podNRIC: pod name - if available,
      orderId: delyva order id - if available,
    };
  },

  // Response to callback
  response: {
    body: 'OK',
    header: 'application/json'
  }
*/

const axios = require('axios');
const logger = require('logger');

const doSpaces = require('../../libs/dospaces');

async function fetchAndUpload(originUrl, newfileName) {
  logger.debug(`Uploading POD ${newfileName}`);
  try {
    const downloadedFile = await axios.get(originUrl, {
      responseType: 'arrayBuffer',
      responseEncoding: 'binary',
    });

    const buffer = Buffer.from(downloadedFile.data, 'binary');
    await doSpaces
      .upload(
        buffer,
        newfileName,
        'image/jpeg',
      )
      .catch((err) => {
        logger.error(`${newfileName} upload FAILED`, err);
      })
      .then(() => logger.debug(`${newfileName} upload SUCCESS`));
  } catch (err) {
    logger.error('Failed to upload file', err);
  }
}

const GrabDelyvaxStatusMap = {
  ALLOCATING: 100,
  QUEUING: 100,
  PICKING_UP: 400,
  IN_DELIVERY: 600,
  IN_RETURN: 661,
  COMPLETED: 700,
  CANCELED: 655,
  RETURNED: 701,
  FAILED: 655,
};

/**
 * Tracking Webhook #
 * @param {Object} callback data from courier
 * @return {Object} formatted data
 */
async function trackingCallback(shipment) {
  const {
    status,
    deliveryID,
    timestamp,
    driver,
    dropoffProofURL,
    pickupProofURL,
  } = shipment;

  const timeline = [];
  const personnel = {};
  let coord;
  if (driver && typeof driver === 'object') {
    if (driver.name) personnel.name = driver.name;
    if (driver.phone) personnel.phone = driver.phone;
    if (driver.licensePlate) personnel.vehicleRegNo = driver.licensePlate;
    if (driver.photoURL) personnel.photo = driver.photoURL;
    if (driver.currentLat && driver.currentLng) {
      coord = {
        lat: driver.currentLat,
        lon: driver.currentLng,
      };
    }
  }

  if (GrabDelyvaxStatusMap[status]) {
    const track = {
      consignmentNo: String(deliveryID),
      statusCode: GrabDelyvaxStatusMap[status],
      location: '',
      dateTime: new Date(timestamp * 1000).toISOString(),
      personnel,
      coord,
    };

    // Save POD
    if (status === 'COMPLETED' && dropoffProofURL) {
      const podUrl = `pod_img/${deliveryID}_d${doSpaces.random()}.jpeg`;
      fetchAndUpload(dropoffProofURL, podUrl); // NO AWAIT
      track.podPicture = [podUrl];
    }

    // Save proof of pickup
    if (status === 'IN_DELIVERY' && pickupProofURL) {
      const podUrl = `pod_img/${deliveryID}_p${doSpaces.random()}.jpeg`;
      fetchAndUpload(pickupProofURL, podUrl); // NO AWAIT
      track.podPicture = [podUrl];
    }

    timeline.push(track);
  }

  return Promise.resolve({
    timeline,
    response: { body: 'OK', header: 'application/json' }, // response to the
  });
}

module.exports = trackingCallback;
