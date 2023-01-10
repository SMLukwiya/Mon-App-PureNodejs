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

// Compress contents of a log file to .gz.b64 file in the same directory
lib.compress = function (logId, newFileId, callback) {
    let sourceFile = logId+'.log';
    let destFile = newFileId + '.gz.b64';

    // Read the source file
    fs.readFile(`${lib.baseDir}/${sourceFile}`, 'utf-8', (err, inputString) => {
        if (!err && inputString) {
            // Compress log file data using gzib
            zlib.gzip(inputString, (err, buffer) => {
                if (!err && buffer) {
                    // Send compressed data to dest file
                    fs.open(`${lib.baseDir}/${destFile}`, 'wx', (err, fileDescriptor) => {
                        if (!err && fileDescriptor) {
                            // Write to dest file
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                                if (!err) {
                                    // Close dest file
                                    fs.close(fileDescriptor, (err) => {
                                        if (!err) {
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    })
                                } else {
                                    callback(err);
                                }
                            })
                        } else {
                            callback(err);
                        }
                    })
                } else {
                    callback(err);
                }
            })
        } else {
            callback(err)
        }
    })
}

// De-compress the contents of a .gz.b64 file into string
lib.decompress = function (fileId, callback) {
    let fileName = `${fileId}.gz.b64`;
    fs.readFile(`${lib.baseDir}/${fileName}`, 'utf-8', (err, str) => {
        if (!err && str) {
            // Decompress data
            let inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, (err, outputBuffer) => {
                if (!err && outputBuffer) {
                    let str = outputBuffer.toString();
                    callback(false, str);
                } else {
                    callback(err);
                }
            })
        } else {
            callback(err);
        }
    })
}

// Export 
module.exports = lib;