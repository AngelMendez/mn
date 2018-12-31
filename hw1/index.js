// Homework #1 - API that returns a message when posted to /hello

const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

const httpServer = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');
    const queryString = parsedUrl.query;
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', data => {
        buffer += decoder.write(data);
    });

    req.on('end', () => {
        buffer += decoder.end();
        const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        const data = {
            'payload': buffer,
        };

        chosenHandler(data, (statusCode, payload) => {
            statusCode = typeof(statusCode) === 'number' ? statusCode : 200;
            payload = typeof(payload) == 'object' ? payload : {};

            const payloadString = JSON.stringify(payload);

            res.setHeader('Content-type', 'application-json');
            res.writeHead(statusCode);
            res.end(payloadString);
        });
    });
});

httpServer.listen(1234, () => {
    console.log('Server is now running!');
})

let handlers = {};

handlers.hello = (data, callback) => {
    callback(200, {'message': 'anything you want.'});
}

handlers.notFound = (data, callback) => {
    callback(404);
};

// Define a request router
const router = {
    'hello': handlers.hello,
};
