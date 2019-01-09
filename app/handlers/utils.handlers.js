/**
 * Handlers of any kind of scenarios
 * that do not represent the main function of the app.
 */

 // Define the utils handlers container
let utilsHandlers = {};

utilsHandlers.ping = async () => {
    return {
        statusCode: 200,
    };
}

module.exports = utilsHandlers;
