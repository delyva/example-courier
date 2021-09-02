/*
  Get delivery partner location and/or their details
*/

// const logger = require('logger');

const customError = require('./custom-error');
const getToken = require('./get-token');

async function getDriverLocation(consignmentNo) {
  // get auth token
  this.axios.defaults.headers.common.Authorization = await getToken(this.config);

  try {
    // EDIT HERE: CALL COURIER API
    const response = await this.axios.post();

    const personnel = {
      id: '',
      name: response.name,
      phone: response.phone,
      vehicleRegNo: response.plateNumber || '',
      vehicleType: response.vehicleType || '',
      vehicleName: response.vehicleName || '',
      photo: response.pictureURL || '',
      coord: {
        lat: response.coordinates.latitude,
        lon: response.coordinates.longitude,
      },
    };

    return Promise.resolve(personnel);
  } catch (err) {
    const errInstance = await customError(err);
    return Promise.reject(new Error(errInstance));
  }
}

module.exports = getDriverLocation;
