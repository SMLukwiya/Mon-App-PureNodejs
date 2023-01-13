/**
 * Request handlers
 */

// Deps
const _dataAPI = require('./data');
const helpers = require('./helpers');
const config = require('./config')

// Handlers
let handlers = {}

/**
 * 
 * HTML Handlers
 */

// Index Handlers
handlers.index = function (data, callback) {
    // Reject non GET request
    if (data.method == 'get') {

        // Prepare data for interpolation
        let templateData = {
            'head.title': 'Title',
            'head.description': 'Meta Description',
            'body.title': 'Index templated',
            'body.class': 'index'
        };

        // Read in a template as string
        helpers.getTemplate('index', templateData, (err, indexHTMLStr) => {
            if (!err && indexHTMLStr) {
                // Add universal template
                helpers.addUniversalTemplate(indexHTMLStr, templateData, (err, fullPageHTMLStr) => {
                    if (!err && fullPageHTMLStr) {
                        callback(200, fullPageHTMLStr, 'html');
                    } else {
                        callback(500, undefined, 'html');
                    }
                });
            } else {
                callback(500, undefined, 'html')
            }
        })
    } else {
        callback(405, undefined, 'html')
    }
}

/**
 * 
 * JSON API Handlers 
 */

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
                        } else {
                            callback(404) // User not found
                        }
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
                callback(400, { Error: 'Missing minimum number of fields to update'})
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
                                    // Delete associated user data (checks)
                                    let userChecks = typeof(userFileData.checks) == 'object' && userFileData.checks instanceof Array ? userFileData.checks : [];
                                    let checksToDelete = userChecks.length;

                                    if (checksToDelete > 0) {
                                        let checksDeleted = 0;
                                        let deletionErrors = false;

                                        // Loop and delete checks one at a time
                                        userChecks.forEach(checkId => {
                                            // Delete check
                                            _dataAPI.delete('checks', checkId, (err) => {
                                                if (err) {
                                                    deletionErrors = true;
                                                }
                                                checksDeleted++;
                                                if (checksDeleted == checksToDelete) {
                                                    if (!deletionErrors) {
                                                        callback(200);
                                                    } else {
                                                        callback(500, { Error: 'Errors encountered while attempting to delete all user checks, not all checks were deleted successfully' });
                                                    }
                                                }
                                            })
                                        });
                                    } else {
                                        callback(200);
                                    }
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
    // Check Create
    // Required data: protocol, url, method, successCodes, timeoutSeconds
    // Optional data: none
    post: function (data, callback) {
        // Validate inputs
        let protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
        let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
        let method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
        let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array  && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
        let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

        if (protocol && url && method && successCodes && timeoutSeconds) {
            // Retrieve token from headers
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

            // Lookup user using token
            _dataAPI.read('tokens', token, (err, tokenFileData) => {
                if (!err && tokenFileData) {
                    let userPhone = tokenFileData.phone;

                    // Lookup user data
                    _dataAPI.read('users', userPhone, (err, userFileData) => {
                        if (!err && userFileData) {
                            let userChecks = typeof(userFileData.checks) == 'object' && userFileData.checks instanceof Array ? userFileData.checks : [];
                            // Verify number of max checks
                            if (userChecks.length < config.maxChecks) {
                                // Create random id for a check
                                let checkId = helpers.createRandomString(20);

                                // Check Object with user phone
                                let checkObject = {
                                    ID: checkId,
                                    userPhone,
                                    protocol,
                                    url,
                                    method,
                                    successCodes,
                                    timeoutSeconds
                                }

                                // Save check
                                _dataAPI.create('checks', checkId, checkObject, () => {
                                    if (!err) {
                                        // Add check id to user object
                                        userFileData.checks = userChecks
                                        userFileData.checks.push(checkId);

                                        // Save user data
                                        _dataAPI.update('users', userPhone, userFileData, (err) => {
                                            if (!err) {
                                                // Return data
                                                callback(200, checkObject);
                                            } else {
                                                callback(500, { Error: 'Could not update user object with new check' });
                                            }
                                        })
                                    } else {
                                        callback(500, { Error: 'Could not create a new check' });
                                    }
                                })
                            } else {
                                callback(400, { Error: 'The user already has maximum number of checks' });
                            }
                        } else {
                            callback(403);
                        }
                    })
                } else {
                    callback(403) // Not authorized
                }
            })
        } else {
            callback(400, { Error: 'Missing required Inputs or Inputs are invalid' });
        }
    },
    // Checks get
    // Required data: id
    // Optional data: none
    get: function(data, callback) {
        // validate ID
        let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

        if (id) {
            // Lookup check
            _dataAPI.read('checks', id, (err, checkFileData) => {
                if (!err && checkFileData) {
                    // Get token from header
                    let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                    // Verify token validity for user
                    handlers._tokens.verifyToken(token, checkFileData.userPhone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            // Return check data
                            callback(200, checkFileData);
                        } else {
                            callback(403);
                        }
                    });
                } else {
                    callback(404)
                }
            })
        } else {
            callback(400, { Error: 'Missing required fields' });
        }
    },
    // Check put
    // Required data: id
    // Optional data: protocol, url, methods, successCodes, timeoutSeconds (Atleast one must exist)
    put: function (data, callback) {
        // Check for ID
        let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

        // Check Optional fields
        let protocol = typeof(data.payload.protocol) == 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
        let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
        let method = typeof(data.payload.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
        let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array  && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
        let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

        if (id) {
            // Check for update fields
            if (protocol || url || method || successCodes || timeoutSeconds) {
                // Get Check
                _dataAPI.read('checks', id, (err, checkFileData) => {
                    if (!err && checkFileData) {
                        // Get token from header
                    let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                    // Verify token validity for user
                    handlers._tokens.verifyToken(token, checkFileData.userPhone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            // Update check data
                            if (protocol) {
                                checkFileData.protocol = protocol;
                            }

                            if (url) {
                                checkFileData.url = url;
                            }

                            if (method) {
                                checkFileData.method = method;
                            }

                            if (successCodes) {
                                checkFileData.successCodes = successCodes;
                            }

                            if (timeoutSeconds) {
                                checkFileData.timeoutSeconds = timeoutSeconds
                            }

                            // Save && update check
                            _dataAPI.update('checks', id, checkFileData, (err) => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(500, { Error: 'Could not update the check' });
                                }
                            })
                        } else {
                            callback(403);
                        }
                    });
                    } else {
                        callback(400, { Error: 'Check Id does not exist' });
                    }
                })
            } else {
                callback(400, { Error: 'Missing minimum number of fields to update'})
            }
        } else {
            callback(400, { Error: 'Missing required field' })
        }
    },
    // Check delete
    // Required data: id
    // Optional data: none
    delete: function (data, callback) {
        let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

        if (id) {
            // Lookup check data
            _dataAPI.read('checks', id, (err, checkFileData) => {
                if (!err && checkFileData) {
                    // Look up token
                    let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;

                    // Verify token validity for user
                    handlers._tokens.verifyToken(token, checkFileData.userPhone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            // Delete check data
                            _dataAPI.delete('checks', id, (err) => {
                                if (!err) {
                                    // Lookup users
                                    _dataAPI.read('users', checkFileData.userPhone, (err, userFileData) => {
                                        if (!err && userFileData) {
                                            let userChecks = typeof(userFileData.checks) == 'object' && userFileData.checks instanceof Array ? userFileData.checks : [];

                                            // Removed deleted check from lists of user checks
                                            let checkPosition = userChecks.indexOf(id);
                                            if (checkPosition > -1) {
                                                userChecks.splice(checkPosition, 1);

                                                // Update user data
                                                _dataAPI.update('users', checkFileData.userPhone, userFileData, (err) => {
                                                    if (!err) {
                                                        callback(200)
                                                    } else {
                                                        callback(500, { Error: 'Could not update the user' });
                                                    }
                                                })
                                            } else {
                                                callback(500, { Error: 'Could not find check on user\'s object' })
                                            }
                                        } else {
                                            callback(500, { Error: 'Could not find user who created check, check can not be removed from user object' });
                                        }
                                    })
                                } else {
                                    callback(500, { Error: 'Could not delete the check data' });
                                }
                            })
                        } else {
                            callback(403)
                        }
                    })
                } else {
                    callback(400, { Error: 'The specified check does not exist' });
                }
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