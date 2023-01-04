/**
 * WORKERS
 */

// Node Deps
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');

// Deps
const _dataAPI = require('./data');

// Worker container
let workers = {}

// Look up all checks, get the data and validate the data
workers.gatherAllChecks = function () {
    // get all check in the system
    _dataAPI.list('checks', (err, checks) => {
        if (!err && checks && checks.length > 0) {

        } else {
            console.log("Error: Could not find any checks to process");
        }
    })
}

// Timer for worker process per minute
workers.loop = function () {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 60)
}

// Init function
workers.init = function () {
    // Execute all checks
    workers.gatherAllChecks()

    // Call loop so check contines at an interval
    workers.loop()
}

// Export
module.exports = workers