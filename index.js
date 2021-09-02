// Common Lib
const Joi = require('joi');
const Axios = require('axios').default;
// const logger = require('logger');

// DelyvaX Lib
const bus = require('../../bus');
const f = require('../../libs/formatCotePromise');
const PluginConf = require('./plugin.json');

// Plugin Lib
const createShipment = require('./create-shipment');
const cancelShipment = require('./cancel-shipment');
const getQuotation = require('./get-quotation');
const trackingCallback = require('./tracking-callback');
const getDriverLocation = require('./driver-location');
const customError = require('./custom-error');

function Plugin(config) {
  const axios = Axios.create({
    baseURL: config.sandbox ? 'https://partner-api.stg-myteksi.com/grab-express-sandbox' : 'https://partner-api.grab.com/grab-express',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      charset: 'utf-8',
    },
  });

  this.axios = axios;
  this.config = config;
  this.getQuotation = getQuotation;
  this.createShipment = createShipment;
  this.cancelShipment = cancelShipment;
  this.trackingCallback = trackingCallback;
  this.getDriverLocation = getDriverLocation;
}

async function init(companyId, pluginId) {
  try {
    // DelyvaX Internal START >
    const plugin = await getPluginById(companyId, pluginId);

    if (plugin.companyId !== companyId) {
      const error = `[${PluginConf.name}]: Plugin is not installed. [companyId]: ${plugin.companyId}`;
      throw new Error(error);
    }

    if (plugin.path !== PluginConf.pluginPath) {
      const error = `[${PluginConf.name}]: Plugin is not installed. [pluginPath]: ${plugin.path}`;
      throw new Error(error);
    }

    if (plugin instanceof Error) {
      throw new Error(plugin);
    }
    // Delyvax Internal END <

    // EDIT HERE: DEFINE COURIER REQUIRED CONFIG (api key, username, password etc?)
    // User will need to enter this data when installing this plugin
    const validData = Joi.object().keys({
      client_id: Joi.string().required(), // example
      client_secret: Joi.string().required(), // example

      sandbox: Joi.bool(), // Required
    }).validate(plugin.config, { stripUnknown: true });

    if (validData.error) {
      return Promise.reject(new Error(validData.error.details[0].message));
    }

    const config = validData.value;

    return new Plugin(config);
  } catch (err) {
    const errInstance = await customError(err);
    return Promise.reject(new Error(errInstance));
  }
}

/*
  DON'T TOUCH ANYTHING BELOW THIS LINE
  ====================================
*/

// List of Available plugin service
bus.on(`plugin.${PluginConf.pluginPath}.tracking-callback`, async (req) => {
  const { companyId, pluginId, body } = req.data;
  const plugin = await init(companyId, pluginId).catch(err => err);
  return f(plugin.trackingCallback(body));
});

bus.on(`plugin.${PluginConf.pluginPath}.quotation`, async (req) => {
  const {
    companyId,
    pluginId,
    order,
    serviceCode,
  } = req.data;
  const plugin = await init(companyId, pluginId).catch(err => err);
  return f(plugin.getQuotation(order, serviceCode));
});

bus.on(`plugin.${PluginConf.pluginPath}.create`, async (req) => {
  const {
    companyId,
    pluginId,
    order,
    serviceCode,
  } = req.data;
  const plugin = await init(companyId, pluginId).catch(err => err);
  return f(plugin.createShipment(order, serviceCode));
});

bus.on(`plugin.${PluginConf.pluginPath}.cancel`, async (req) => {
  const { companyId, pluginId, consignmentNo } = req.data;
  const plugin = await init(companyId, pluginId).catch(err => err);
  return f(plugin.cancelShipment(consignmentNo));
});

bus.on(`plugin.${PluginConf.pluginPath}.driver.location`, async (req) => {
  const {
    companyId,
    pluginId,
    consignmentNo,
    driverId,
  } = req.data;
  const plugin = await init(companyId, pluginId).catch(err => err);
  return f(plugin.getDriverLocation(consignmentNo, driverId));
});

bus.on(`plugin.${PluginConf.pluginPath}.driver.info`, async (req) => {
  const {
    companyId,
    pluginId,
    consignmentNo,
    driverId,
  } = req.data;
  const plugin = await init(companyId, pluginId).catch(err => err);
  return f(plugin.getDriverLocation(consignmentNo, driverId));
});


// DelyvaX Internal
bus.on(`plugin.${PluginConf.pluginPath}.available-services`, async req => Promise
  .resolve({
    data: {
      services: ['quotation', 'create', 'track', 'cancel'],
      quotation: {
        required: ['weight', 'price', 'id', 'waypoint', 'dimension', 'note'],
      },
      create: {
        required: ['weight', 'price', 'id', 'waypoint', 'dimension', 'note'],
      },
      cancel: {
        required: ['consignmentNo'],
      },
      track: {
        required: ['consignmentNo'],
      },
    },
  }));
