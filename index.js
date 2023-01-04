/**
 * Entry File
 */

// Deps
const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare app
let app = {}

// Init function
app.init = function () {
    // Start server
    server.init()

    // Start workers
    // workers.init()
}

// Execute
app.init()

// Export
module.exports = app;