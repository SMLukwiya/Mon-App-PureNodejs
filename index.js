/**
 * Entry File
 */

// Node Dep
const http = require('node:http');
const { StringDecoder } = require('node:string_decoder');
const url = require('node:url');

// Dep
const config = require('./config');

const server = http.createServer((req, res) => {
    // Parse URL
    let parsedUrl = url.parse(req.url, true);

    // Trim path
    let path = parsedUrl.pathname;
    let trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Query string
    let queryStringObject = parsedUrl.query;

    // Method
    let method = req.method.toLowerCase();

    // Headers
    let headers = req.headers;

    // Get payload
    let decoder = new StringDecoder('utf-8');
    let buffer = '';
    req.on('data', (data) => {
        buffer += decoder.write(data);
    })
    req.on('end', () => {
        buffer += decoder.end();

        // Handle Incoming request
        let choosenHandler = typeof(router[trimmedPath]) != 'undefined' ? router[trimmedPath] : handlers.notFound

        // Construct data object
        let data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: buffer
        }

        // Route to handler
        choosenHandler(data, (statusCode, payload) => {
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            payload = typeof(payload) == 'object' ? payload : {};
            let payloadString = JSON.stringify(payload);

            // Send response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // log path
            console.log(statusCode, payloadString)
        })
    })
})

// start server
server.listen(config.port, () => {
    console.log("Listening on port ", config.port);
})

// handlers
let handlers = {}

// sample
handlers.sample = function(data, callback) {
    callback(406, {'name': 'Sample handler'});
}

// 404
handlers.notFound = function (data, callback) {
    callback(404);
}

// Request Router
let router = {
    'sample': handlers.sample
}