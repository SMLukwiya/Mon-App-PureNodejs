/**
 * WORKERS
 */

// Node Deps
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const URL = require('node:url');

// Deps
const _dataAPI = require('./data');
const helpers = require('./helpers');
const _logs = require('./logs');

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
    console.log(originalCheckData)
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : {};
    originalCheckData.ID = typeof(originalCheckData.ID) == 'string' && originalCheckData.ID.trim().length == 20 ? originalCheckData.ID : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // Set missing keys incase workers are processing for the first time
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // If all checks pass, pass to next
    if (originalCheckData.ID &&
        originalCheckData.userPhone &&
        originalCheckData.protocol && 
        originalCheckData.method &&
        originalCheckData.url && 
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds
    ) {
        workers.performCheck(originalCheckData);
    } else {
        console.log("Error: One of the checks formats failed")
    }
}

// Perform check, Pass originalCheckData and Outcome to the next
workers.performCheck = function (originalCheckData) {
    // Prepare intial check outcome to override
    let checkOutcome = {
        error: false,
        responseCode: false
    }

    // Mark check outcome as "not sent"
    let outComeSent = false;

    // Parse hostname and path from originalCheckData
    let parsedUrl = URL.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
    let hostname = parsedUrl.hostname;
    let path = parsedUrl.path; // use path and not pathname, to preserve querystring

    // Construct the request
    let requestDetails = {
        protocol: originalCheckData.protocol + ':',
        hostname,
        path,
        method: originalCheckData.method,
        timeout: originalCheckData.timeoutSeconds * 1000 // ms
    };

    // Instantiate request object using protocol
    let _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    let req = _moduleToUse.request(requestDetails, (res) => {
        // Get status of req
        let status = res.statusCode;

        // Update check outcome
        checkOutcome.responseCode = status;

        if (!outComeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outComeSent = true;
        }
    });

    // Bind to error to stop throwing error
    req.on('error', (err) => {
        // Update check outcome
        checkOutcome.error = {
            error: true,
            value: err
        };

        if (!outComeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outComeSent = true;
        }
    });

    // Bind to the timeout event
    req.on('timeout', (err) => {
        checkOutcome = {
            error: true,
            value: 'timeout'
        };

        if (!outComeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outComeSent = true;
        }
    });

    // End the request
    req.end();
}

// Process checkout and update check data, and sent alert
// Special logic if check is being tested for the first time
workers.processCheckOutcome = function (originalCheckData, checkOutcome) {
    // Determine if check is up or down
    let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    // Determine if alert should be sent
    let alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Log outcome
    let timeOfCheck = Date.now()
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck)

    // Update check data
    let newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    // Save update
    _dataAPI.update('checks', newCheckData.ID, newCheckData, (err) => {
        if (!err) {
            // Send new check data to next
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log('Check outcome has not changed, no alert needed');
            }
        } else {
            console.log("Error trying to save update to check")
        }
    })
}

// Alert User to change in check status
workers.alertUserToStatusChange = function (newCheckData) {
    let msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
    // helpers.sendSMS(newCheckData.userPhone, msg, (err) => {
    //     if (!err) {
    //         console.log("Success: Alert was sent to User with msg ", msg);
    //     } else {
    //         console.log("Error: Could not send alert to User");
    //     }
    // })
}

workers.log = function (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
    // Form the log data object
    let logData = {
        check: originalCheckData,
        outcome: checkOutcome,
        state: state,
        alert: alertWarranted,
        time: timeOfCheck
    };

    // Stringify log data
    let logString = JSON.stringify(logData);

    // Determine name of log file to use
    let logFileName = originalCheckData.ID;

    // Append log string to file
    _logs.append(logFileName, logString, (err) => {
        if (!err) {
            console.log("Logging to file succeeded")
        } else {
            console.log("Logging to file failed")
        }
    })
}

// Timer for worker process per minute
workers.loop = function () {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 60)
}

// Rotate/Compress the log files
workers.rotateLogs = function () {
    // List all non-compressed log files
    _logs.list(false, (err, logs) => {
        if (!err && logs && logs.length) {
            logs.forEach(logName => {
                // Compress data to a different file
                let logId = logName.replace('.log', ''); // strip .log from file name
                let newFileId = `${logId}-${Date.now()}`;
                _logs.compress(logId, newFileId, (err) => {
                    if (!err) {
                        // Truncate the log
                        _logs.truncate(logId, (err) => {
                            if (!err) {
                                console.log("Success truncating log files");
                            } else {
                                console.log("Error truncating logFile");
                            }
                        })
                    } else {
                        console.log("Error compressing one of the log files", err);
                    }
                })
            })
        } else {
            console.log('Error: Could not find any logs to rotate')
        }
    })
}

// Timer to execute log rotation once a day
workers.logRotationLoop = function () {
    setInterval(() => {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24)
}

// Init function
workers.init = function () {

    // Send to console in yellow
    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');
    // Execute all checks
    workers.gatherAllChecks()

    // Call loop so check contines at an interval
    workers.loop()

    // Rotate logs (compress all logs immediately)
    workers.rotateLogs();

    // Compression loop to compress file later
    workers.logRotationLoop()
}

// Export
module.exports = workers