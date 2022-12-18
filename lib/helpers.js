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

module.exports = helpers;