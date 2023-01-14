/**
 * Helper Utils
 */

// Node Deps
const crypto = require('node:crypto');
const querystring = require('node:querystring');
const https = require('node:https');
const path = require('node:path');
const fs = require('node:fs');

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
    phone = typeof(phone) == 'string' && phone.trim().length == 13 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg : false;

    if (phone && msg) {
        // Configure the request payload
        let payload = {
            phone: phone,
            message: msg,
            messageType: 'ARN'
        }

        // stringify payload
        let payloadString = querystring.stringify(payload);

        // Construct request
        let requestDetails = {
            protocol: 'https:',
            hostname: 'rest-ww.telesign.com',
            method: 'POST',
            path: 'v1/messaging',
            auth: '',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(payloadString),
                Authorization: 'Basic XXXXXXXX'
            }
        }

        // Instantiate request object
        let req = https.request(requestDetails, (res) => {
            // Grab status of request
            let status = res.statusCode;
            console.log(res)
            // callback if success
            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Response with status code ', status)
            }
        });

        // Bind to error event
        req.on('error', (e) => {
            callback(e);
        })

        // Add the payload to the request
        req.write(payloadString);

        // End request
        req.end();
    } else {
        callback('Parameters missing or invalid');
    }
}

// Get the string content of a template
helpers.getTemplate = function (templateName, data, callback) {
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data != null ? data : {};

    if (templateName) {
        let templatesDir = path.join(__dirname, '/../templates/');
        fs.readFile(`${templatesDir}/${templateName}.html`, 'utf-8', (err, htmlStr) => {
            if (!err && htmlStr && htmlStr.length > 0) {
                // Interpolate htmlStr and replace accordingly
                let finalString = helpers.interpolate(htmlStr, data)
                callback(false, finalString)
            }  else {
                callback('No template could be found');
            }
        })
    } else {
        callback('A valid template name was not specified');
    }
}

// Add universal header and footer to str and pass provided data to header and footer
helpers.addUniversalTemplate = function (str, data, callback) {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data != null ? data : {};

    // Get header
    helpers.getTemplate('_header', data, (err, headerHTMLString) => {
        if (!err && headerHTMLString) {
            // Get footer
            helpers.getTemplate('_footer', data, (err, footerHTMLString) => {
                if (!err && footerHTMLString) {
                    // Combine all templates
                    let fullStringHTML = headerHTMLString + str + footerHTMLString;
                    callback(false, fullStringHTML);
                } else {
                    callback('Could not find the footer template');
                }
            })
        } else {
            callback('Could not find the header template');
        }
    })
}

// Take a string and data object and find and replace all key
helpers.interpolate = function (str, data) {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data != null ? data : {};

    // Add template globals to data object, prepend keyname with global (e.g, global.key)
    for (let keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName)) {
            data['global.'+keyName] = config.templateGlobals[keyName]
        }
    }

    // For each key in data object, insert value into corresponding string placeholder
    for (let key in data) {
        if (data.hasOwnProperty(key) && typeof(data[key]) == 'string') {
            let replace = data[key];
            let find = '{'+key+'}';
            str = str.replace(find, replace);
        }
    }

    return str;
}

// Get contents of statis asset
helpers.getStaticAsset = function (fileName, callback) {
    fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;

    if (fileName) {
        let publicDir = path.join(__dirname, '/../public/');
        fs.readFile(publicDir + fileName, (err, assetData) => {
            if (!err && assetData) {
                callback(false, assetData);
            } else {
                callback(' No file could be found');
            }
        })
    } else {
        callback('Valid file name was not specified');
    }
}

module.exports = helpers;