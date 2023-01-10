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

// Export 
module.exports = lib;