/**
 * Helper Utils
 */

// Node Deps
const crypto = require('node:crypto');
const querystring = require('node:querystring');
const https = require('node:https');

// Dep
const config = require('./config');

// Container
let helpers = {};

// SHA256 hash
helpers.hash = function (str) {
    if (typeof(str) == 'string' && str.trim().length > 0) {
        let hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
}

// Parse JSON data to Object, do not throw
helpers.parseJSONToObject = function (str) {
    try {
        let object = JSON.parse(str);
        return object;
    } catch (err) {
        return {};
    }
}

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = function (strLength) {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    
    if (strLength) {
        // Define all possible characters
        let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

        // Define string
        let str = '';

        for (i = 0; i < strLength; i++) {
            // Get random character from possibleCharacters
            let randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            str += randomCharacter;
        }

        return str;
    } else {
        return false;
    }
}

// Send alert
helpers.sendSMS = function (phone, msg, callback) {
    // validate parameters
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg : false;

    if (phone && msg) {
        // Configure the request payload
        let payload = {
            // @TODO: set up alerting system
        }

        // stringify payload (use querystring) 
        let payloadString = querystring.stringify(payload);

        // Construct request
        let requestDetails = {
            protocol: 'https',
            hostname: '',
            method: 'POST',
            path: '',
            auth: '',
            headers: {}
        }

        // Instantiate request object
        let req = ``;

        // Bind to error event
        req.on('error', (e) => {})

        // Add the payload to the request
        req.write(payloadString);

        // End request
        req.end();
    } else {
        callback('Parameters missing or invalid');
    }

}

module.exports = helpers;