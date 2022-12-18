/**
 * Request handlers
 */

// Deps

// Handlers
let handlers = {}

// Ping handler
handlers.ping = function(data, callback) {
    callback(200);
}

// 404
handlers.notFound = function (data, callback) {
    callback(404);
}

module.exports = handlers;