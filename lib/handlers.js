/**
 * Request handlers
 */

// Deps
const _dataAPI = require('./data');
const helpers = require('./helpers');
const config = require('./config')

// Handlers
let handlers = {}

// User handler
handlers.users = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];

    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data,callback);
    } else {
        callback(405); // Method not allowed
    }
}

// Users sub-methods container
handlers._users = {
    // Users create
    // Required data: firstName, lastName, phone, password, tosAgreement
    // Optional data: None
    post: function (data, callback) {
        // Check for required fields
        let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
        let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
        let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
        let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
        let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

        if (firstName && lastName && phone && password && tosAgreement) {
            // Ensure user does not exist yet
            _dataAPI.read('users', phone, (err) => {
                if (err) {
                    // Hash user password
                    let hashedPassword = helpers.hash(password);

                    // User object
                    if (hashedPassword) {
                        let userObject = {
                            firstName,
                            lastName,
                            phone,
                            hashedPassword,
                            tosAgreement: true
                        }
    
                        // Store user
                        _dataAPI.create('users', phone, userObject, (err) => {
                            if (!err) {
                                callback(200)
                            } else {
                                console.log(err)
                                callback(500, { Error: 'Could not create new user' });
                            }
                        })
                    } else {
                        callback(500, { Error: 'Could not hash the user\'s password' })
                    }
                    
                } else {
                    callback(400, { Error: 'User with given phone number already exists' })
                }
            })
        } else {
            callback(400, {Error : 'Missing required fields'})
        }
    },

    // Users get
    // Required data: phone
    // Optional data: None
    // TODO: only authenticated access object
    get: function (data, callback) {
        // Check phone number
        let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

        if (phone) {
            // Get user
            _dataAPI.read('users', phone, (err, userFileData) => {
                if (!err && userFileData) {
                    // Remove hashed password
                    delete userFileData.hashedPassword;
                    callback(200, userFileData);
                } else [
                    callback(404) // User not found
                ]
            })

        } else {
            callback(400, { Error: 'Missing required fields' });
        }
    },

    // Users put
    // Required data: phone
    // Optional data: firstName, lastName, password (at least one required)
    // TODO: only authenticated update object
    put: function (data, callback) {
        // Check for phone
        let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;

        // Check Optional fields
        let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
        let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
        let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

        if (phone) {
            if (firstName || lastName || password) {
                // Get user
                _dataAPI.read('users', phone, (err, userFileData) => {
                    if (!err && userFileData) {
                        // Update user
                        if (firstName) {
                            userFileData.firstName = firstName;
                        }

                        if (lastName) {
                            userFileData.lastName = lastName;
                        }

                        if (password) {
                            userFileData.hashedPassword = helpers.hash(password);
                        }

                        // Save user
                        _dataAPI.update('users', phone, userFileData, (err) => {
                            if (!err) {
                                callback(200);
                            } else {
                                console.log(err);
                                callback(500, { Error: 'Could not update the user' });
                            }
                        })
                    } else {
                        callback(400, { Error: 'The specified user does not exist' });
                    }
                })
            } else {
                callback(400, { Error: 'Missing minimum number of fields to udpate'})
            }
        } else {
            callback(400, { Error: 'Missing required field' })
        }
    },

    // Users delete
    // Required data: phone
    // TODO: only authenticated update object, Clean up associated user data
    delete: function (data, callback) {
        // Check phone number
        let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

        if (phone) {
            // Get user
            _dataAPI.read('users', phone, (err, userFileData) => {
                if (!err && userFileData) {
                    // Delete user
                    _dataAPI.delete('users', phone, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, { Error: 'Could not delete the specified user' });
                        }
                    })
                } else [
                    callback(400, { Error: 'Could not find the specified user' }) // User not found
                ]
            })

        } else {
            callback(400, { Error: 'Missing required fields' });
        }

    }
}

// Ping handler
handlers.ping = function(data, callback) {
    callback(200);
}

// 404
handlers.notFound = function (data, callback) {
    callback(404);
}

module.exports = handlers;