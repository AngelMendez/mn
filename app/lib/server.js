/**
 * Server-related tasks
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

const helpers = require('./helpers');
const config = require('./config');
const router = require('./router');
const _data = require('./data');
const utilsHandlers = require('../handlers/utils.handlers');
const userHandlers = require('../handlers/users.handlers');
const tokensHandlers = require('../handlers/tokens.handlers');
const checksHandlers = require('../handlers/checks.handlers');
const staticHandlers = require('../handlers/static.handlers');

// Instantiate the server module object
let server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);    
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
    server.unifiedServer(req, res);
});

// All the server logic for both the http and https server
server.unifiedServer = (req, res) => {

    // Get the URL and parse it
    const parsedUrl = url.parse(req.url, true);

    // Get the path of the URL
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    const queryStringObject = parsedUrl.query;

    // Get the HTTP method
    const method = req.method.toLowerCase();

    // Get the headers as an object
    const headers = req.headers;

    // Get the payload, if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', data => {
        buffer += decoder.write(data);
    });

    req.on('end', async () => {
        buffer += decoder.end();

        // Construct the data object to send the handler
        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            'payload': helpers.parseJsonToObject(buffer),
            authenticated: false,
            authenticatedUser: null,
        };

        // Authenticate user if a token is provided.
        if (typeof(data.headers.token) !== 'string') {
            // Route the request
            const test = await router.routeReq(trimmedPath, data, res);
            return test;
        }

        const authenticatedUser = authenticateUser(data.headers.token);
        if(!authenticatedUser) {
            const test = await router.routeReq(trimmedPath, data, res);
            return test;
        }

        data.authenticated = true;
        data.authenticatedUser = authenticatedUser;
        debug('\x1b[32m%s\x1b[0m', `Authenticated request by user phone: ${authenticatedUser.phone}`);
        return router.routeReq(trimmedPath, data, res);
    });
};

authenticateUser = async id => {
    const tokenData = await _data.read('tokens', id).catch(error => { return null });
    if (tokenData.expires < Date.now()) {
        return false;
    }
    const userData = await _data.read('users', tokenData.phone).catch(error => { return null });
    return userData;
};

/**
 * Init script
 */
server.init = () => {
    router.add('get', 'ping', utilsHandlers.ping);
    router.add('get', '', staticHandlers.index);
    router.add('get', 'favicon', staticHandlers.favicon);
    router.add('get', 'public', staticHandlers.public);
    router.addCRUD('api/users', userHandlers);
    router.addCRUD('api/tokens', tokensHandlers);
    router.addCRUD('api/checks', checksHandlers);
    // Start the HTTP Sever
    server.httpServer.listen(config.httpPort, () => {
        console.log('\x1b[36m%s\x1b[0m', `The server is listening on port ${config.httpPort} in ${config.envName} mode.`);
    });
    // Start the HTTPS Server
    server.httpsServer.listen(config.httpsPort, () => {
        console.log('\x1b[35m%s\x1b[0m', `The server is listening on port ${config.httpsPort} in ${config.envName} mode.`);
    });
}

// Export the module
module.exports = server;

// Define a request router
// server.router = {
//     '': index,
//     'account/create': accountCreate,
//     'account/edit': accountEdit,
//     'account/deleted': accountDeleted,
//     'session/create': sessionCreate,
//     'session/deleted': sessionDeleted,
//     'checks/all': checksList,
//     'checks/create': checksCreate,
//     'checks/edit': checksEdit,
// };
