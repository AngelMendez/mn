// Library for storing and editing data

const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module (to be exported)
let lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = (dir, file, data, callback) => {
    // Open the file for writing
    fs.open(lib.baseDir + `${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert data to string
            const stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(fileDescriptor, stringData, err => {
                if (!err) {
                    fs.close(fileDescriptor, err => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing new file' + err);
                        }
                    })
                } else {
                    callback('Error writing to new file.' + err);
                }
            });
        } else {
            callback('Could not create new file, it may already exist.' + err);
        }
    });
};

// Read data from a file
lib.readPromise = (dir, file) => 
    new Promise((resolve, reject) => {
        fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf-8', (err, data) => {
            if (!err && data) {
                const parsedData = helpers.parseJsonToObject(data);
                resolve(parsedData);
            } else {
                reject(err);
            }
        });
    });

// Read data from a file
lib.read = (dir, file, callback) => {
    fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf-8', (err, data) => {
        if (!err && data) {
            const parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(err, data);
        }
    });
};

lib.update = (dir, file, data, callback) => {
    // Open the file for writing
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // Convert data to string
            const stringData = JSON.stringify(data);

            // Truncate the file
            fs.ftruncate(fileDescriptor, err => {
                if (!err) {
                    // Write to the file and close it
                    fs.writeFile(fileDescriptor, stringData, err => {
                        if (!err) {
                            fs.close(fileDescriptor, error => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('Error closing the file.');
                                }
                            });
                        } else {
                            callback('Error writing to existing file.');
                        }
                    });
                } else {
                    callback('Error truncating file.');
                }
            });
        } else {
            callback('Could not open the file for updating, it may not exist yet.' + err);
        }
    });
};

// Delete a file
lib.delete = (dir, file, callback) => {
    // Unlink the file
    fs.unlink(lib.baseDir+dir+'/'+file+'.json', err => {
        if (!err) {
            callback(false);
        } else {
            callback('Error deleting file: ' + err);
        }
    });
};

// List all the items in a directory | Promise
lib.listPromise = dir => 
    new Promise((resolve, reject) => {
        fs.readdir(lib.baseDir + dir + '/', (err, data) => {
            if (!err && data && data.length > 0) {
                let trimmedFileNames = [];
                data.forEach((fileName) => {
                    trimmedFileNames.push(fileName.replace('.json', ''));
                });
                resolve(trimmedFileNames);
            } else {
                reject(err);
            }
        });
    });


// List all the items in a directory
lib.list = (dir, callback) => {
    fs.readdir(lib.baseDir + dir + '/', (err, data) => {
        if (!err && data && data.length > 0) {
            let trimmedFileNames = [];
            data.forEach((fileName) => {
                trimmedFileNames.push(fileName.replace('.json', ''));
            });
            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    })
};

// Export the module
module.exports = lib;
