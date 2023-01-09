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
            checks.forEach(check => {
                // Read check data
                _dataAPI.read('checks', check, (err, originalCheckData) => {
                    if (!err && originalCheckData) {
                        // Pass to check validator and handle continuation
                        workers.validateCheckData(originalCheckData)
                    } else {
                        console.log("Error reading one of the check data");
                    }
                });
            });
        } else {
            console.log("Error: Could not find any checks to process");
        }
    })
}

// Sanity Check the check-data
workers.validateCheckData = function (originalCheckData) {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCode = typeof(originalCheckData.successCode) == 'object' && originalCheckData.successCode instanceof Array && originalCheckData.successCode.length > 0 ? originalCheckData.successCode : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set missing keys incase workers are processing for the first time
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // If all checks pass, pass to next
    if (originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol && 
        originalCheckData.method &&
        originalCheckData.url && 
        originalCheckData.successCode &&
        originalCheckData.timeoutSeconds
    ) {
        workers.performCheck(originalCheckData);
    } else {
        console.log("Error: One of the checks formats failed")
    }
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