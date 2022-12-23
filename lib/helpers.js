/**
 * Helper Utils
 */

// Node Deps
const crypto = require('node:crypto');

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

module.exports = helpers;