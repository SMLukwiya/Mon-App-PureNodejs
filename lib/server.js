/**
 * SERVER
 */

// Node Dep
const http = require('node:http');
const https = require('node:https');
const { StringDecoder } = require('node:string_decoder');
const url = require('node:url');
const fs = require('node:fs');
const path = require('node:path');

// Dep
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

// Server Container Object
let server = {}

// Unified server
server.unifiedServer = function(req, res) {
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
        let choosenHandler = typeof(server.router[trimmedPath]) != 'undefined' ? server.router[trimmedPath] : handlers.notFound

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
server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);
})

// Instantiate HTTPS server
server.httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '../https/rootCA.key')),
    cert: fs.readFileSync(path.join(__dirname, '../https/rootCA.crt'))
}
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
    server.unifiedServer(req, res);
})

// Request Router
server.router = {
    ping: handlers.ping,
    users: handlers.users,
    tokens: handlers.tokens,
    checks: handlers.checks,
}

// Init function
server.init = function () {
    // start HTTP server
    server.httpServer.listen(config.httpPort, () => {
        console.log('\x1b[36m%s\x1b[0m', "Listening on port "+config.httpPort);
    })

    // start HTTPS server
    server.httpsServer.listen(config.httpsPort, () => {
        console.log('\x1b[35m%s\x1b[0m', "Listening on port "+config.httpPort);
    });
}

// Export
module.exports = server;