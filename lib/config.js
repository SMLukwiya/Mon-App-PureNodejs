/**
 * Config Variables
 */

// environments
let environments = {};

// staging (default)
environments.staging = {
    httpPort: 3000,
    httpsPort: 3001,
    envName: 'staging',
    hashingSecret: 'sshh! super secret secret',
    maxChecks: 5,
    templateGlobals: {
        appName: 'UptimeChecker',
        companyName: 'SMLukwiya.tech',
        yearCreated: '2023',
        baseUrl: 'http://localhost:3000/'
    }
    // @TODO: Setup alert system config
}

// production
environments.production = {
    httpPort: 5000,
    httpsPort: 5001,
    envName: 'production',
    hashingSecret: 'sshh! super secret secret',
    maxChecks: 5,
    templateGlobals: {
        appName: 'UptimeChecker',
        companyName: 'SMLukwiya.tech',
        yearCreated: '2023',
        baseUrl: 'productionUrl'
    }
    // @TODO: Setup alert system config
}

// Determine which one to export
let currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase(): '';

let environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments['staging'];

module.exports = environmentToExport;