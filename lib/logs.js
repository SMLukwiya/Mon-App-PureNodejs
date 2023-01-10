/**
 * Library for storing and rotating logs
 */

// Node Deps
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('zlib');

// Container for the module
let lib = {}

// Base directory of the logs folder
lib.baseDir = path.join(__dirname, '/../.logs');

// Append log string to a file, create file if it doesn't exist
lib.append = function (file, str, callback) {
    // Open the file for appending
    fs.open(`${lib.baseDir}/${file}.log`, 'a', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Append to file and close file
            fs.appendFile(fileDescriptor, str+'\n', (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing file that was being appended');
                        }
                    })
                } else {
                    callback('Error appending to file');
                }
            })
        } else {
            callback('Could not open file for appending');
        }
    })
}

// List all logs and optionally include compressed logs
lib.list = function (includeCompressedLogs, callback) {
    fs.readdir(lib.baseDir, (err, logFileData) => {
        if (!err && logFileData && logFileData.length) {
            let trimmedFileNames = [];
            logFileData.forEach((fileName) => {
                // Add .log files
                if (fileName.indexOf('.log') > -1) {
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }

                // Optionally add uncompressed files(.gz)
                if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            });

            callback(false, trimmedFileNames);
        } else {
            callback(err, logFileData);
        }
    })
}

// Export 
module.exports = lib;