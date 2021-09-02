/*
  Example implementation auth using JWT 
*/
const logger = require('logger');
const Redis = require('ioredis');
const Axios = require('axios');

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: {},
  connectTimeout: 30000,
};

if (process.env.NODE_ENV !== 'production') {
  delete redisConfig.tls;
}

const redis = new Redis(redisConfig);

module.exports = async (config, renew = false) => {
  const key = `plugin-example-${config.client_id}${config.client_secret}`;
  let token = await redis.get(key);

  if (!token || renew === true) {
    const authUrl = config.sandbox
      ? 'https://api.stg-myteksi.com/grabid/v1/oauth2/token'
      : 'https://partner-api.grab.com/grabid/v1/oauth2/token';

    token = await Axios
      .post(authUrl, {
        client_id: config.client_id,
        client_secret: config.client_secret,
        grant_type: 'client_credentials',
        scope: 'grab_express.partner_deliveries',
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      })
      .then((response) => {
        const auth = response.data;
        logger.debug('[GRAB-EXPRESS]: auth RESPONSE', auth);
        const authToken = `${auth.token_type} ${auth.access_token}`;
        redis.setex(key, Number(auth.expires_in) - 300, authToken);
        return authToken;
      })
      .catch((err) => {
        logger.error('[GRAB-EXPRESS]: auth ERR', err);
        return undefined;
      });
  }

  logger.debug('grab-express getToken', token);

  return token;
};
