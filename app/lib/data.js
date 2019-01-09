// Library for storing and editing data

let fs = require('fs');
const path = require('path');
const helpers = require('./helpers');
const util = require('util');
const fsAsync = require('../asyncs/fs.async');

// Container for the module (to be exported)
let _data = {};

// Base directory of the data folder
_data.baseDir = path.join(__dirname, '/../.data/');

_data.create = async (dir, file, data) => {
    // Open the file for writing
    try {
        const fileDescriptor = await fsAsync.open(_data.baseDir + `${dir}/${file}.json`, 'wx');
        console.log(fileDescriptor);
        if (fileDescriptor) {
            // Convert data to string
            const stringData = JSON.stringify(data);
            
            // Write to file and close it
            const writeFileError = await fsAsync.writeFile(fileDescriptor, stringData);
            if (!writeFileError) {
                const errClose = await fsAsync.close(fileDescriptor)
                if (!errClose) {
                    return {
                        statusCode: 200,
                        payload: data,
                    };
                } else {
                    return {
                        statusCode: 500,
                        error: 'Error closing new file' + errClose,
                    };
                }
            } else {
                return {
                    statusCode: 500,
                    error: 'Error writing to new file.' + writeFileError,
                };
            }
        } else {
            return {
                statusCode: 500,
                error: 'Could not create new file, it may already exist.'
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            error: 'An error ocurred.',
        };
    }
};
/**
 * Read data from a file
 * @param {string} dir The directory in which the file will be searched
 * @param {string} file The identifier to locate the file
 */
_data.read = async (dir, file) => {
    try {
        const data = await fsAsync.readFile(_data.baseDir+dir+'/'+file+'.json', 'utf-8');
        const parsedData = helpers.parseJsonToObject(data);
        return parsedData;
    } catch (error) {
        return null;
    }
};

_data.update = async (dir, file, data) => {
    // Open the file for writing
    let  fileDescriptor = await fsAsync.open(_data.baseDir+dir+'/'+file+'.json', 'r+');
    if (fileDescriptor) {
        // Convert data to string
        const stringData = JSON.stringify(data);
        
        // Truncate the file
        const truncateError = await fsAsync.ftruncate(fileDescriptor);
        if (!truncateError) {
            // Write to the file and close it
            const writeFileError = await fsAsync.writeFile(fileDescriptor, stringData);
            if (!writeFileError) {
                const closeError = await fsAsync.close(fileDescriptor);
                if (!closeError) {
                    return {
                        statusCode: 200,
                        payload: data,
                    }
                } else {
                    return {
                        statusCode: 500,
                        error: 'Error closing the file.',
                    };
                }
            } else {
                return {
                    statusCode: 500,
                    error: 'Error writing to existing file.',
                };
            }
        } else {
            return {
                statusCode: 500,
                error: 'Error truncating file.',
            };
        }
    } else {
        return {
            statusCode: 500,
            error: 'Could not fs.open the file for updating, it may not exist yet.' + err,
        };
    }
};

/**
 * Delete a file in a folder
 * @param { string } dir Name of the folder in which the file is localted
 * @param { string } file Id of the file to be deleted
 */
_data.delete = async (dir, file) => {
    // Unlink the file
    const deleted = fsAsync.unlink(_data.baseDir+dir+'/'+file+'.json');
    if (deleted) {
        return true;
    } else {
        return false;
    }
};

// List all the items in a directory
_data.list = async dir => {
    const data = await fsAsync.readdir(_data.baseDir + dir + '/');
    if (data && data.length > 0) {
        let trimmedFileNames = [];
        data.forEach((fileName) => {
            trimmedFileNames.push(fileName.replace('.json', ''));
        });
        return {
            payload: trimmedFileNames,
        }
    } else {
        return {
            statusCode: 404,
            error: 'No data found.',
        }
    }
};

// Export the module
module.exports = _data;
