const util = require('util');
const debug = util.debuglog('server');

let router = {};

const _handlers = {
    default: async data => {
        if (data.method !== 'get') {
            return {
                statusCode: 404,
                error: 'The path required does not exist.'
            };
        }
        return {
            statusCode: 404,
            error: 'The path required does not exist.'
        };
    }
};

router.add = (method, path, handler) => {
    if (!_handlers[method]) {
        _handlers[method] = {};
    }
    if(_handlers[method][path]) {
        throw new Error('Attempt to add the same route twice.');
    }
    _handlers[method][path] = handler;
};

/**
 * Function to add CRUD handlers to the router.
 * @param {string} path 
 * The path set to the handler.
 * @param {object} handlers 
 * An object containing a function that handles the CRUD routes. 
 * Allows POST, GET, PUT and DELETE
 */
router.addCRUD = (path, handlers) => {
    if (handlers.post) {
        router.add('post', path, handlers.post);
    }
    if (handlers.post) {
        router.add('get', path, handlers.get);
    }
    if (handlers.post) {
        router.add('put', path, handlers.put);
    }
    if (handlers.post) {
        router.add('delete', path, handlers.delete);
    }
};

/**
 * Override the default handler.
 * @param {function} handler The handler to override the default one.
 */
router.overrideDefault = handler => {
    _handlers.default = handler;
};

/**
 * Route the current request to the handler.
 * @param { string } path The trimmed path used to identify the route.
 * @param { object } data An object containing info about the request and the original node http request object.
 * @param { object } res The original node http response object
 */
router.routeReq = async (path, data, res) => {
    const pathReq = `${data.method.toUpperCase()}/${path}`;
    if (_handlers[data.method] && _handlers[data.method][path]) {
        const { statusCode, payload, contentType, error } = await _handlers[data.method][path](data);
        return response(res, statusCode, payload, contentType, error, pathReq);
    }
    const { statusCode, payload, contentType, error } = await _handlers.default(data);
    return response(res, statusCode, payload, contentType, error, pathReq);
}

response = async (res, statusCode = 200, payload = {}, contentType = 'json', error, pathReq) => {
        console.log(statusCode, payload, contentType);

        if (error) {
            error = typeof(error) === 'string' ? error : '';
            errorObj = {
                statusCode,
                error: error,
            }
            errorString = JSON.stringify(errorObj);
            debug('\x1b[31m%s\x1b[0m', `${pathReq} ${statusCode}`);
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(errorString);
            return;
        }

        // Return the response-parts that are content-specific
        let payloadString = '';

        if (contentType == 'json') {
            res.setHeader('Content-Type', 'application/json');
            payload = typeof(payload) == 'object' ? payload : {};
            payloadString = JSON.stringify(payload);
        }
        if (contentType == 'html') {
            res.setHeader('Content-Type', 'text/html');
            payloadString = typeof(payload) == 'string' ? payload : '';
        }
        if (contentType == 'favicon') {
            res.setHeader('Content-Type', 'image/x-icon');
            payloadString = typeof(payload) == 'string' ? payload : '';
        }
        if (contentType == 'css') {
            res.setHeader('Content-Type', 'text/css');
            payloadString = typeof(payload) == 'string' ? payload : '';
        }
        if (contentType == 'png') {
            res.setHeader('Content-Type', 'image/png');
            payloadString = typeof(payload) == 'string' ? payload : '';
        }
        if (contentType == 'jpg') {
            res.setHeader('Content-Type', 'image/jpeg');
            payloadString = typeof(payload) == 'string' ? payload : '';
        }
        if (contentType == 'plan') {
            res.setHeader('Content-Type', 'text/plan');
            payloadString = typeof(payload) == 'string' ? payload : '';
        }

        debug('\x1b[32m%s\x1b[0m', `${pathReq} ${statusCode}`);

        // Return the response-parts that are common to all content-types
        res.writeHead(statusCode);
        res.end(payloadString);
    }

module.exports = router;
