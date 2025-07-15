//@ts-check
'use strict';

const c = require('./logs');
const fs = require('fs');

let helpers = {};

/**
 * Gets the current project's package.json file
 * @returns {Object}
 */
helpers.getPackage = () => {
  return helpers.getJson(`${process.cwd()}/package.json`);
};


/**
 * Writes to the project's package.json file
 * @param pkg {Object} Package object to save
 * @param async {boolean} Whether or not run asynchronously. Default: false
 * @param cb {function} Callback function called if async is true
 * @returns {boolean}
 */
helpers.setPackage = (pkg, async = false, cb = null) => {
  return helpers.writeJson(`${process.cwd()}/package.json`, pkg, async, cb);
};

/**
 * Writes a JSON object to the given path
 * @param {string} dest Full path to the file
 * @param {Object} obj Object to write
 * @param {boolean} async Whether or not run asynchronously. Default: false
 * @param {function} cb Callback function called if async is true
 * @returns {boolean}
 */
helpers.writeJson = (dest, obj, async = false, cb = undefined) => {
  if (!dest || !obj) {
    throw new Error('Destination & Object cannot be null');
  }
  if (async) {
    // @ts-ignore
    fs.writeFile(dest, JSON.stringify(obj, null, 2), cb);
    return true;
  } else {
    try {
      fs.writeFileSync(dest, JSON.stringify(obj, null, 2));
      return true;
    } catch (e) {
      c.error(`ERROR: Could not write to ${dest}`);
      console.error(e);
      process.exit(1);
    }
  }
  return false;
};

/**
 * Gets a JSON file from the given path
 * @param {string} dest
 * @param {boolean} logError
 * @returns {Object}
 */
helpers.getJson = (dest, logError = true) => {
  if (!dest) {
    throw new Error('Destination cannot be null');
  }
  try {
    try {
      delete require.cache[require.resolve(dest)];
    } catch {
      c.log(`Error in cache module cache resolution of ${dest} file`);
    }
    return require(dest);
  } catch(e) {
    if (logError) {
      c.error(`ERROR: Could not read ${dest}`);
    }
  }
  return {};
};

/**
 * Gets project-defined build options with defaults.
 * @param {Object} defaults
 * @returns {Object}
 */
helpers.getBuildOptions = (defaults = {}) => {
  if (fs.existsSync(`${process.cwd()}/build/options.json`)) {
    return Object.assign(helpers.mergeObjects(defaults, helpers.getJson(`${process.cwd()}/build/options.json`)), {});
  }
  return defaults;
};

/**
 * Recursively deep merges 2 objects;
 * @param {Object} old
 * @param {Object} obj
 * @returns {Object}
 */
helpers.mergeObjects = (old, obj) => {
  let newObj = Object.assign({}, old, obj);
  for (let [key, val] of Object.entries(newObj)) {
    if (typeof val === 'object' && !Array.isArray(val)) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && Object.prototype.hasOwnProperty.call(old, key)) {
        newObj[key] = helpers.mergeObjects(old[key], obj[key]);
      }
    }
  }
  return newObj;
};

/**
 * Saves build options in the project directory
 * @param opts
 * @returns {boolean}
 */
helpers.setBuildOptions = opts => {
  const path = require('path');
  let buildPath = path.resolve(process.cwd(), 'build');
  if (!fs.existsSync(buildPath)) {
    fs.mkdirSync(buildPath)
  }
  return helpers.writeJson(path.resolve(buildPath, 'options.json'), helpers.getBuildOptions(opts));
};

/**
 * Moves all theme files from the current working directory to the new theme
 * @param {string} newName The name for the new theme directory
 * @returns {boolean}
 */
helpers.renameTheme = newName => {
  const fg = require('fast-glob');
  const path = require('path');
  const c = require('./logs');
  const srcPath = process.cwd();
  const newPath = path.resolve('../', newName);
  if (!fs.existsSync(newPath)) {
    fs.mkdirSync(newPath);
  }
  const files = fg.sync(['.gitignore', '.editorconfig', '**/*'], {
    cwd: srcPath,
    dot: true
  });
  c.log(`Moving ${files.length} files...`);
  c.initProgressBar(40);
  try {
    files.forEach((f, i) => {
      let oldFile = path.resolve(srcPath, f);
      let newFile = path.resolve(newPath, f);
      let directories = f.split('/');
      let dir = '';
      while (directories.length > 1) {
        dir = path.resolve(dir.length ? dir : newPath, directories.shift());
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir);
        }
      }
      fs.renameSync(oldFile, newFile);
      let rawPercent = i / files.length * 100;
      let percent = Math.round(rawPercent);
      if (percent === 100 && rawPercent < 100 && i < files.length - 1) {
        percent = 99;
      }
      c.updateProgressBar(percent);
    });
    process.chdir(newPath);
    try {
      fs.rmSync(srcPath, {
        recursive: true,
        force: true
      });
    } catch(e) {
      fs.rmdirSync(srcPath, {
        recursive: true
      });
    }
    c.log(`All theme files have been succesfully moved to the ${newName} directory`);
  } catch (e) {
    c.error('Oh no! There was an issue moving the theme files.')
    console.log(e);
    return false;
  }
  return true;
};

/**
 * List of valid platform names
 * @type {string[]}
 */
helpers.validPlatforms = ['wordpress', 'nopcommerce', 'kentico'];

module.exports = helpers;
