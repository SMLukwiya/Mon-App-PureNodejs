// Library for storing and manipulating data

// Node Deps
const fs = require('node:fs');
const path = require('node:path');
const helpers = require('./helpers');

// Container
let lib = {}

// Base Dir
lib.baseDir = path.join(__dirname, '/../.data');

// Writing data to a file
lib.create = function (dir, filename, data, callback) {
    // Open file for writing
    fs.open(`${lib.baseDir}/${dir}/${filename}.json`, 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert data to string
            let stringData = JSON.stringify(data);
            
            // Write to file
            fs.writeFile(fileDescriptor, stringData, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing new file');
                        }
                    })
                } else {
                    callback('Error writing to new file');
                }
            })
        } else {
            callback('Could not create new file, it may already exist');
        }
    })
}

// Read data from file
lib.read = function (dir, filename, callback) {
    fs.readFile(`${lib.baseDir}/${dir}/${filename}.json`, 'utf-8', (err, fileData) => {
        if (!err && fileData) {
            let parsedFileData = helpers.parseJSONToObject(fileData);
            callback(false, parsedFileData);
        } else {
            callback(err, fileData);
        }
    })
}

// Update file
lib.update = function (dir, filename, data, callback) {
    // Open file for writing
    fs.open(`${lib.baseDir}/${dir}/${filename}.json`, 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert data to string
            let stringData = JSON.stringify(data);

            // Truncate file
            fs.ftruncate(fileDescriptor, (err) => {
                if (!err) {
                    // Write to file
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, (err) => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('Error closing the file');
                                }
                            })
                        } else {
                            callback('Error updating the file');
                        }
                    })
                } else {
                    callback('Error truncating file');
                }
            })
        } else {
            callback('Could not open the file for updating, It may not exist');
        }
    })
}

// Delete file
lib.delete = function (dir, filename, callback) {
    // Unlink the file
    fs.unlink(`${lib.baseDir}/${dir}/${filename}.json`, (err) => {
        if (!err) {
            callback(false);
        } else {
            callback('Error deleting file');
        }
    })
}

// 
module.exports = lib;