const Hapi = require('@hapi/hapi');
const perlin = require('perlin-noise');
const schema = require('validate');

const paramsSchema = schema({
  height: {
    type: 'number',
    required: true,
    message: 'height of the noise array is required.'
  },
  width: {
    type: 'number',
    required: true,
    message: 'width of the noise array is required.'
  },
  octaveCount: {
    type: 'number',
    required: false,
    message: 'octaveCount must be a number. defaults to 4.'
  },
  amplitude: {
    type: 'number',
    required: false,
    message: 'amplitude must be a number. defaults to 0.1.'
  },
  persistence: {
    type: 'number',
    required: false,
    message: 'persistence must be a number. defaults to 0.2.'
  },
  jsonp: {
    type: 'string',
    match: /[a-zA-Z0-9_]+/,
    required: false
  }
}, { typecast: true });

// Create a server with a host and port

const server = Hapi.server({ address: '0.0.0.0', port: process.env.PORT || 3500, load: { sampleInterval: 1000 } });

/**
 * Validate params from the url parts and the querystring
 * @param  {Object} params Hapi.js params and querystring merged
 * @return {Object}        Array of error objects
 */
const validateParams = params => {
  const errors = paramsSchema.validate(params);

  // extra bounds validation
  if (params.width < 1 || params.width > 10000) {
    errors.push({
      path: 'width',
      message: 'width of the noise array must be in the range 1 - 10,000'
    });
  }

  if (params.height < 1 || params.height > 10000) {
    errors.push({
      path: 'height',
      message: 'height of the noise array must be in the range 1 - 10,000'
    });
  }

  if (params.height * params.width > 1000000) {
    errors.push({
      path: 'width',
      message: 'Total noise elements must be < 1,000,000'
    });
  }

  return errors;
};


server.route({ method: 'GET', path: '/status', handler: () => 'ok' });

server.route({
  method: 'GET',
  path: '/',
  handler: () => 'Try sending a request to /noise/10/1'
});

server.route({
  method: 'GET',
  path: '/noise/{width}',
  config: {
    cors: true
  },
  handler: (request, handler) => handler.redirect(`/noise/${request.params.width}/1`)
});

server.route({
  method: 'GET',
  path: '/noise/{width}/{height}',
  config: {
    cors: true
  },
  handler: (request, h) => {
    // merge params and querystring
    const params = Object.assign(request.params, request.query);

    // validate
    const errors = validateParams(params);

    if (errors && errors.length) {
      // error response code
      return h.response(errors)
        .code(400);
    }
      // extra options, faillback to defaults
    const options = {
      octaveCount: params.octaveCount || 4,
      amplitude: params.amplitude || 0.1,
      persistence: params.persistence || 0.2
    };
      // generate the noise
    const noise = perlin.generatePerlinNoise(params.width, params.height, options);

    if (params.jsonp) {
      return `${params.jsonp}([${noise}]);`;
    }
    return noise;
  }
});

// Start the server
server.start(err => {
  if (err) {
    throw err;
  }
});
