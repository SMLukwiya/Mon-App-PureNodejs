/**
 * Config Variables
 */

// environments
let environments = {};

// staging (default)
environments.staging = {
    port: 3000,
    envName: 'staging'
}

// production
environments.production = {
    port: 5000,
    envName: 'production'
}

// Determine which one to export
let currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase(): '';

let environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments['staging'];

module.exports = environmentToExport;