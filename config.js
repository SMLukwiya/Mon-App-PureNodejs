/**
 * Config Variables
 */

// environments
let environments = {};

// staging (default)
environments.staging = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging'
}

// production
environments.production = {
    httpPort: 5000,
    httpsPort: 5001,
    envName: 'production'
}

// Determine which one to export
let currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase(): '';

let environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments['staging'];

module.exports = environmentToExport;