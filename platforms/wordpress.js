//@ts-check
'use strict';

let wp = require('./base');
const c = require('../util/logs');
const helpers = require('../util/helpers');

wp.name = 'wordpress';

wp.beforeSetup = async () => {
  let config = wp.getConfigFile();
  if (!wp.verifyThemeDirectory(config, wp.starterName)) {
    c.warn('WARNING: It looks like you haven\'t renamed the theme folder!\n');
    c.warn('It is best practice rename the theme folder to the site\'s branding.\n');
    let name = await wp.getThemeName().catch();
    name = name.toLowerCase();
    if (await c.getResponse(`Are you sure you'd like to rename to theme folder to "${name}"? Confirm with "y"`) === 'y') {
      if (helpers.renameTheme(name)) {
        config.theme.short_name = name;
        wp.writeConfigFile(config);
        c.emphasis(`Please move your terminal into the ${name} directory and run the "gc static" command to finish the setup process.`);
        c.log('Happy coding! :)');
        process.exit(0);
      } else {
        c.warn(`Please rename "${wp.starterName}" folder to ${name} ASAP and reflect the new name in config.json's "short_name" field`);
      }
    }
  }
};

wp.beforeProduction = async () => {
  const fs = require('fs');
  const path = require('path');
  try {
    let stylePath = path.resolve(process.cwd(), 'style.css');
    let style = fs.readFileSync(stylePath).toString();
    if (/Theme Name: GoldenComm WordPress Starter Theme/.test(style)) {
      c.warn('You have not updated the Theme Name property in the style.css meta info');
      let name = await c.getResponse('Please enter the name of this theme as it should show in the WordPress admin theme selector');
      if (name) {
        style = style.replace('Theme Name: GoldenComm WordPress Starter Theme', `Theme Name: ${name}`);
        fs.writeFileSync(stylePath, style);
        c.success(`The theme name has been updated to ${name}`);
      }
    }
  } catch (e) {
    c.warn('Could not verify style.css');
    console.log(e);
  }
  try {
    let config = wp.getConfigFile();
    if (config && config.wpcf7_includes === 'all') {
      c.warn('The "wpcf7_includes" config property is set to "all"');
      await c.timeout(800);
      c.warn('Please verify that your site needs to load the Contact Form 7 assets on every page');
      await c.timeout(800);
      c.warn('If that is not the case, please update the config appropriately');
      await c.timeout(3000);
      c.log('Continuing...');
    }
  } catch (e) {
    c.warn('Could not verify config.json');
    console.log(e);
  }
};

/**
 * @returns {Promise}
 */
wp.beforeDev = async () => {
  if (await wp.checkDockerFiles()) {
    c.success('Launching local Docker web server...');
    const os = require('os');
    const { spawn, execSync } = require('child_process');
    const webroot = wp.getWebRoot();
    if (os.type() === 'Darwin') {
      let command = `osascript -e 'tell application "Terminal"
                      do script "cd ${webroot} && docker-compose up"
                    end tell'`;
      try {
        execSync(command);
        process.on('SIGINT', () => {
          c.log('Process kill command received. Attempting to close down Docker web services..');
          execSync('docker-compose down', {
            cwd: webroot,
            stdio: 'inherit'
          });
          c.log('You can now safely close the Docker terminal window :)');
          process.exit();
        });
      } catch (e) {
        c.error('Custom MacOS command failed :(');
        console.log(e);
        process.exit(1);
      }
    } else {
      let terminal = spawn('docker-compose up', {
        cwd: webroot,
        detached: true,
        stdio: ['pipe', 'pipe', process.stderr],
        shell: true
      });
      terminal.unref();
      process.on('SIGINT', () => {
        try {
          c.log('Process kill command received. Attempting to close down Docker web services..');
          execSync('docker-compose down', {
            cwd: webroot
          });
        } catch (e) {
          c.error('On no! There was an error in closing down the Docker web services.')
          console.log(e);
        }
        process.exit();
      });
    }
  }
};

wp.beforeCopy = async () => {
  const path = require('path');
  let dest = wp.getWebRoot();
  // Fix for Windows directories
  dest = dest.substr(0, dest.length - 1);

  wp.copyFiles.docker = {
    from: path.resolve(__dirname, '../docker/wordpress'),
    to: dest,
    desc: 'Local Development Docker Files'
  };
};

wp.afterCopy = async () => {
  if (wp.argv._.indexOf('docker') > -1) {
    wp.afterWebpack = () => {
      wp.checkDockerFiles(['LOCAL_URL', 'REMOTE_URL']);
    }
  }
};

/**
 * Checks the .env file for local Docker development for missing values
 * @param {string[]} alwaysCheck
 * @returns {Promise<boolean>}
 */
wp.checkDockerFiles = async (alwaysCheck = []) => {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.resolve(process.cwd(), '../../../.env');
  try {
    fs.readFileSync(envPath, 'utf-8');
  } catch (e) {
    c.warn('No docker files present in this project. Copying now');
    wp.copyDockerFiles();
    if (alwaysCheck.length === 0) {
      alwaysCheck.push('LOCAL_URL');
      alwaysCheck.push('REMOTE_URL');
    }
  }
  const ENV = fs.readFileSync(envPath, 'utf-8');
  if (ENV) {
    let config = wp.getConfigFile();
    let newEnv = '';
    for (let line of ENV.split(/[\r\n]+/)) {
      let pair = line.split('=');
      if (pair.length === 2) {
        if (pair[1].length === 0 || alwaysCheck.indexOf(pair[0]) > -1) {
          let val = await c.getResponse(`Please add the Docker environment value for ${pair[0]} (Leave blank to skip)`);
          if (val) {
            if (pair[0].endsWith('_URL') && !val.startsWith('http')) {
              val = `http${pair[0].startsWith('REMOTE') ? 's' : ''}://${val}`;
            }
            line = `${pair[0]}=${val}`;
            pair[1] = val;
          }
        }
        const options = helpers.getBuildOptions(wp.getDefaultDevOptions());
        switch (pair[0]) {
          case 'THEME_NAME':
            if (!wp.verifyThemeNames(config) && path.basename(process.cwd()) !== wp.starterName) {
              c.warn('Updating theme name in config to match the theme directory');
              config.theme.short_name = path.basename(process.cwd());
              helpers.writeJson(`${process.cwd()}/config/config.json`, config);
            }
            if (pair[1] !== config.theme.short_name) {
              c.warn('Updating the theme name in the Docker .env file');
              line = `THEME_NAME=${config.theme.short_name}`;
              pair[1] = config.theme.short_name;
            }
            break;
          case 'LOCAL_URL': {
            if (!pair[1].startsWith('http')) {
              pair[1] = `http://${pair[1]}`;
            }
            let localHost = pair[1].split('://')[1].trim();
            const hosts = require('../util/hosts');
            if (await hosts.validate(localHost)) {
              wp.devLocalHostValidated = true;
              wp.devLocalHostName = localHost;
            }
            break;
          }
          case 'LOCAL_PORT': {
            let port = '80';
            if (wp.argv.sync !== false && options.localDev.sync) {
              port = '8888';
              wp.devLocalPort = '80';
              wp.devLocalProxy = `${wp.devLocalHostName}:${port}`;
            }
            line = `${pair[0]}=${port}`;
            break;
          }
          case 'REMOTE_DB_IMPORT':
            if (wp.argv.pull === false && pair[1].toUpperCase() === 'Y') {
              line = `${pair[0]}=N`;
            } else if (wp.argv.pull && pair[1].toUpperCase() === 'N') {
              line = `${pair[0]}=Y`;
            }
            break;
        }
      }
      newEnv += (line.startsWith('#') && ENV.indexOf(line) > 0 ? '\n' : '') + line + '\n';
    }
    if (newEnv !== ENV) {
      fs.writeFileSync(envPath, newEnv, 'utf-8');
      c.success('Docker .env file has been successfully updated');
    }
  } else {
    c.warn('Please run the "gc copy docker" command to add the needed files to your project.');
    throw new Error('Could not find Docker files');
  }
  return true;
};

wp.copyDockerFiles = () => {
  const fs = require('fs');
  const path = require('path');
  let files = [
    '../docker/wordpress/.env',
    '../docker/wordpress/docker-compose.yml'
  ];
  const webroot = wp.getWebRoot();
  files.forEach(f => {
    fs.copyFileSync(path.resolve(__dirname, f), `${webroot}/${path.basename(f)}`)
  });
};

/**
 * Gets the default BrowserSync options for the dev process
 * @returns {Object}
 */
wp.getDefaultDevOptions = () => {
  return {
    localDev: {
      host: wp.devLocalHostName || "localhost",
      port: wp.devLocalPort || "3000",
      sync: true,
      proxy: wp.devLocalProxy || null,
      files: '**/*.php, **/*.css, **/*.js',
      snippetOptions: {
        whitelist: ['/wp-admin/admin-ajax.php'],
        blacklist: ['/wp-admin/**']
      }
    }
  };
};

/**
 * Gets the public path to the outputted assets
 * @param {Object} config
 * @return {string}
 */
wp.getAssetsLocation = config => {
  wp.verifyThemeNames(config);
  return `/wp-content/themes/${config.theme.short_name}/assets/`;
};

/**
 *
 * @param {Object} config The theme's config.json object
 * @returns {boolean}
 */
wp.verifyThemeNames = config => {
  if (!wp.verifyThemeDirectory(config, wp.starterName)) {
    if (config.theme.short_name === wp.starterName) {
      c.error('ERROR: It looks like you haven\'t renamed the theme folder!');
      c.error('It is best practice to rename the theme folder to the site\'s branding.');
    } else {
      c.error(`The theme directory does not match the config.theme.short_name value! (${config.theme.short_name})`);
      c.error('This will cause issues with the sw.js & manifest.js files. Please fix immediately');
    }
    return false;
  }
  return true;
};

/**
 * Gets the array of URLs to cache when the service worker is installed
 * @param {Object} config
 * @return {Array}
 */
wp.getSWUrls = config => {
  let opts = helpers.getBuildOptions({
    urlsToCache: [
      '/offline.html',
      `/wp-content/themes/${config.theme.short_name}/assets/images/logo.png`,
      `/wp-content/themes/${config.theme.short_name}/assets/jquery.min.js`,
      `/wp-content/themes/${config.theme.short_name}/assets/theme.css?ver=${config.build}`,
      `/wp-content/themes/${config.theme.short_name}/assets/theme.js?ver=${config.build}`,
    ]
  });
  if (opts.urlsToCache && opts.urlsToCache.length) {
    return opts.urlsToCache.map(url => {
      url = url.replace(/\[build]/, config.build);
      url = url.replace(/\[theme_name]/, config.theme.short_name);
      return url;
    });
  }
  return [];
};

/**
 * Gets the theme's config file
 * @return {Object}
 */
wp.getConfigFile = () => {
  return helpers.getJson(`${process.cwd()}/config/config.json`);
};

/**
 * Writes the given object to the theme's config file
 * @param {Object} config The theme's config JSON object
 * @returns {boolean}
 */
wp.writeConfigFile = (config) => {
  return helpers.writeJson(`${process.cwd()}/config/config.json`, config);
};

/**
 * Gets the relative path from the project's output folder to the site root
 * @return {string}
 */
wp.getSiteRootPath = () => {
  return '../../../../';
};

/**
 * Gets the full path of the site's web root directory, relative to the process CWD
 * @returns {string}
 */
wp.getWebRoot = () => {
  const path = require('path');
  return path.resolve(process.cwd(), '../../../');
};

/**
 * The relative path to the theme's config file
 * @type {string}
 */
wp.configPath = './config/config.json';

/**
 * The name of the starter theme's directory
 * @type {string}
 */
wp.starterName = 'gc-starter';

/**
 * The message that prints when a production build is finished
 * @type {string}
 */
wp.productionMessage = 'Don\'t forget to upload the config/config.json and sw.js files';

/**
 * Friendly name of this platform
 * @type {string}
 */
wp.platformName = 'WordPress';

/**
 * Determines if this platform supports the "dev" command
 * @type {boolean}
 */
wp.supportsDev = true;

module.exports = wp;
