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
const util = require('node:util');

// Dep
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

const debug = util.debuglog('server');

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
        let choosenHandler = typeof(server.router[trimmedPath]) != 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        // If request is within public dir, use handlers.public
        choosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : choosenHandler;

        // Construct data object
        let data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJSONToObject(buffer)
        }

        // Route to handler
        choosenHandler(data, (statusCode, payload, contentType) => {
            // Determine the type of response (fallback to JSON)
            contentType = typeof(contentType) == 'string' ? contentType : 'json'
            // default status code to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Send content specific response-parts
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
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            if (contentType == 'png') {
                res.setHeader('Content-Type', 'image/png');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            if (contentType == 'jpg') {
                res.setHeader('Content-Type', 'image/jpeg');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            if (contentType == 'plain') {
                res.setHeader('Content-Type', 'text/plain');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }
            
            // Send common response-parts
            res.writeHead(statusCode);
            res.end(payloadString);

            // log path
            // If the response is 200 print green, otherwise print red
            if (statusCode == 200) {
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + '/' + trimmedPath + ' ' + statusCode)
            } else {
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + '/' + trimmedPath + ' ' + statusCode)
            }
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
    '': handlers.index,
    'account/create': handlers.accountCreate,
    'account/edit': handlers.accountEdit,
    'account/deleted': handlers.accountDeleted,
    'session/create': handlers.sessionCreate,
    'session/deleted': handlers.sessionDeleted,
    'checks/all': handlers.checksList,
    'checks/create': handlers.checksCreate,
    'checks/edit': handlers.checksEdit,
    'ping': handlers.ping,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks,
    'favicon.ico': handlers.favicon,
    'public': handlers.public
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