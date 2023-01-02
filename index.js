/**
 * Entry File
 */

// Node Dep
const http = require('node:http');
const https = require('node:https');
const { StringDecoder } = require('node:string_decoder');
const url = require('node:url');
const fs = require('node:fs');

// Dep
const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Unified server
let unifiedServer = function(req, res) {
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
            payload: helpers.parseJSONToObject(buffer)
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
}

// Instantiate HTTP server
const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
})

// Instantiate HTTPS server
let httpsServerOptions = {
    key: fs.readFileSync('./https/rootCA.key'),
    cert: fs.readFileSync('./https/rootCA.crt')
}
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res);
})

// start HTTP server
httpServer.listen(config.httpPort, () => {
    console.log("Listening on port ", config.httpPort);
})

// start HTTPS server
httpsServer.listen(config.httpsPort, () => {
    console.log("Listening on port ", config.httpsPort);
});

// Request Router
let router = {
    ping: handlers.ping,
    users: handlers.users,
    tokens: handlers.tokens,
    checks: handlers.checks,
}