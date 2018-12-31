// Create and export configuration variables

// Container for all the environments
let environments = {};

// Staging (default) environment
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging',
    'hashingSecret': 'thisIsASecret',
    'maxChecks': 5,
    'twilio' : {
        'accountSid' : 'AC4b279fe20a41d9531269375f9123e9bd',
        'authToken' : '60facf1c2bff8c9fa99f5c3f41e7252f',
        'fromPhone' : '+18156055739'
    },
    'templateGlobals': {
        'appName': 'UptimeChecker',
        'companyName': 'NotARealCompany, Inc',
        'yearCreated': '2019',
        'baseUrl': 'http://localhost:3000',
    },
};

// Production environment
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret': 'thisIsAlsoASecret',
    'maxChecks': 5,
    'twilio' : {
        'accountSid' : 'AC4b279fe20a41d9531269375f9123e9bd',
        'authToken' : '60facf1c2bff8c9fa99f5c3f41e7252f',
        'fromPhone' : '+18156055739'
    },
    'templateGlobals': {
        'appName': 'UptimeChecker',
        'companyName': 'NotARealCompany, Inc',
        'yearCreated': '2019',
        'baseUrl': 'http://localhost:5000',
    },
};

// Determine which environment was passed as a command-line pargument
const currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not, default to staging
const environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;

// Export the module
module.exports = environmentToExport;
