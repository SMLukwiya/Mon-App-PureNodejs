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
    get: function (data, callback) {
        // Check phone number
        let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

        if (phone) {
            // Get token from header
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            // Verify token validity
            handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid) {
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
                    callback(403, { Error: 'Missing required token in header, or token is invalid' });
                }
            });
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
    delete: function (data, callback) {
        // Check phone number
        let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 10 ? data.queryStringObject.phone.trim() : false;

        if (phone) {
            // Get token from header
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            // Verify token validity
            handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid) {
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
                        } else {
                            callback(400, { Error: 'Could not find the specified user' }) // User not found
                        }
                    });
                } else {
                    callback(403, { Error: 'Missing required token in header, or token is invalid' });
                }
            });
        } else {
            callback(400, { Error: 'Missing required fields' });
        }

    }
}

/**
 * 
 * TOKEN SERVICE
 */
// Token Handler
handlers.tokens = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];

    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data,callback);
    } else {
        callback(405);
    }
}

// Container sub-methods token
handlers._tokens = {
    // Tokens create
    // Required data: phone, password
    // Optional data: none
    post: function (data, callback) {
        let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
        let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

        if (phone && password) {
            // Look up user
            _dataAPI.read('users', phone, (err, userFileData) => {
                if (!err && userFileData) {
                    // Hash received password - compare to password stored
                    let hashedPassword = helpers.hash(password);

                    if (hashedPassword == userFileData.hashedPassword) {
                        // Create a new token - set expiration 1 hour from now
                        let tokenId = helpers.createRandomString(20);
                        let expires = Date.now() + 1000 * 60 * 60;

                        let tokenObject = {
                            phone,
                            id: tokenId,
                            expires
                        }

                        // Save token
                        _dataAPI.create('tokens', tokenId, tokenObject, (err) => {
                            if (!err) {
                                callback(200, tokenObject)
                            } else {
                                callback(500, { Error: 'Could not create new token' });
                            }
                        })
                    } else {
                        callback(400, { Error: 'Password did not match user\'s password' });
                    }
                } else {
                    callback(400, { Error: 'Could not find the specific user'});
                }
            })
        } else {
            callback(400, { Error: 'Missing required field(s)'});
        }
    },

    // Tokens GET
    // Required data: Id
    // Optional data: None
    get: function (data, callback) {
        let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

        if (id) {
            // Look up token
            _dataAPI.read('tokens', id, (err, tokenFileData) => {
                if (!err && tokenFileData) {
                    callback(200, tokenFileData);
                } else [
                    callback(404) // Token not found
                ]
            })

        } else {
            callback(400, { Error: 'Missing required fields' });
        }
    },

    // Tokens create
    // Required data: id, extend
    // optional data: None
    put: function (data, callback) {
        let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
        let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

        if (id && extend) {
            // Look up token
            _dataAPI.read('tokens', id, (err, tokenFileData) => {
                if (!err && tokenFileData) {
                    // Check if token is not expired
                    if (tokenFileData.expires > Date.now()) {
                        // Extend token expiration
                        tokenFileData.expires = Date.now() + 1000 * 60 * 60;

                        // Save token
                        _dataAPI.update('tokens', id, tokenFileData, (err) => {
                            if (!err) {
                                callback(200)
                            } else {
                                callback(500, { Error: 'Could not update the token expiration' });
                            }
                        })
                    } else {
                        callback(400, { Error: 'Token has expired, please login!'})
                    }
                } else {
                    callback(400, { Error: 'Specified token does not exist' });
                }
            })
        } else {
            callback(400, { Error: ' Missing required field(s) or Invalid fields' });
        }
    },

    // Tokens create
    // Required data: id
    // Optional data: None
    delete: function (data, callback) {
        let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

        if (id) {
            // Look up token
            _dataAPI.read('tokens', id, (err, tokenFileData) => {
                if (!err && tokenFileData) {
                    // Delete token
                    _dataAPI.delete('tokens', id, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(500, { Error: 'Could not delete the specified token' });
                        }
                    })
                } else [
                    callback(400, { Error: 'Could not find the specified token' })
                ]
            })

        } else {
            callback(400, { Error: 'Missing required fields' });
        }
    },

    // VERIFY TOKEN of a given user
    verifyToken: function (tokenId, phone, callback) {
        // Look up token
        _dataAPI.read('tokens', tokenId, (err, tokenFileData) => {
            if (!err && tokenFileData) {
                // Is token still valid
                if (tokenFileData.phone == phone && tokenFileData.expires > Date.now()) {
                    callback(true);
                } else {
                    callback(false);
                }
            } else {
                callback(false);
            }
        })
    }
}

/**
 * 
 * CHECK SERVICE
 */
// Check Handler
handlers.checks = function (data, callback) {
    const acceptableMethods = ['post', 'get', 'put', 'delete'];

    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data,callback);
    } else {
        callback(405);
    }
}

// Container sub-methods checks
handlers._checks = {
    
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