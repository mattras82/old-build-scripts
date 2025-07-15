'use strict';

let nop = require('./base');
const c = require('../util/logs');

nop.name = 'nopcommerce';

nop.beforeSetup = async () => {
  if (!nop.verifyThemeDirectory()) {
    c.warn('WARNING: It looks like you haven\'t renamed the theme folder!\n');
    c.warn('It is best practice rename the theme folder to the site\'s branding.\n');
    let name = await nop.getThemeName().catch();
    if (await c.getResponse(`Are you sure you'd like to rename to theme folder to "${name}"? Confirm with "y"`) === 'y') {
      const helpers = require('../util/helpers');
      if (helpers.renameTheme(name)) {
        let config = helpers.getJson(`${process.cwd()}/config.json`);
        config.theme.short_name = name;
        nop.writeConfigFile(config);
        c.emphasis(`Please move your terminal into the ${name} directory and run the "gc static" command to finish the setup process.`);
        c.log('Happy coding! :)');
        process.exit(0);
      } else {
        c.warn(`Please rename "${nop.starterName}" folder to ${name} ASAP and reflect the new name in config.json's "short_name" field`);
      }
    }
  }
};

nop.beforeDev = async () => {
  const helpers = require('../util/helpers');
  let config = helpers.getJson(`${process.cwd()}/config.json`), dotnetInstalled = false;
  const requiredVersion = config.dotnet_version || '2.2';
  const { spawn, execSync } = require('child_process');
  let dotnetVersions = '';
  try {
    dotnetVersions = execSync('dotnet --list-sdks').toString();
  } catch (e) {
    c.error('You do not have .NET Core installed on your machine.');
    c.emphasis(`You need the .NET Core SDK for version ${requiredVersion}. Please go to Microsoft's website to install it.`)
  }
  if (dotnetVersions) {
    dotnetVersions.split('\n').forEach(v => {
      if (v.startsWith(requiredVersion)) {
        dotnetInstalled = true;
      }
    });
  }
  if (!dotnetInstalled) {
    c.error('You do not have the proper .NET Core SDK installed to run this site locally');
    c.warn(`Please install .NET Core SDK version ${requiredVersion} and try again`);
    process.exit(1);
  }
  const path = require('path');
  const fg = require('fast-glob');
  const pluginsDir = path.resolve(process.cwd(), '../../Plugins');
  let pluginDLLs = fg.sync('**/*.dll', {
    cwd: pluginsDir,
    onlyFiles: true,
    deep: 2
  });
  if (nop.argv.build || pluginDLLs.length < 10) {
    let projectRoot = path.resolve(process.cwd(), '../../../../');
    try {
      if (nop.argv.build) {
        c.log('Cleaning project before building');
        execSync('dotnet clean', {
          cwd: projectRoot,
          stdio: 'inherit'
        });
      }
      c.log('Running project build');
      execSync('dotnet build', {
        cwd: projectRoot,
        stdio: 'inherit'
      });
    } catch (e) {
      c.error('Oh no! The project didn\'t build correctly. Please check the error message below or the logs above to determine the cause.');
      console.log(e);
      process.exit(1);
    }
    c.success('Project built successfully.');
  }
  const fs = require('fs');
  let pluginsPath = path.resolve(process.cwd(), '../../App_Data/plugins.json');
  if (!fs.existsSync(pluginsPath)) {
    c.warn('Looks like you don\'t have a plugins.json file in the App_Data directory.');
    c.log('If there is a dev or production site for this project, it would be best to download the file from that server');
    c.log('Or a minimal plugins.json file can be generated for you so that you can continue with the dev build');
    let response = await c.getResponse('Would you like to generate the minimal file now? Confirm with "y"');
    if (response === 'y') {
      let pluginsObj = {
        "InstalledPluginNames": [
          "Goldencomm.Toolkit"
        ]
      };
      helpers.writeJson(pluginsPath, pluginsObj);
      c.success('Successfully generated plugins.json file');
    } else {
      c.emphasis('Please download the "App_Data/plugins.json" file from the server to your local "Presentation/Nop.Web/App_Data/" directory.');
      process.exit(0);
    }
  }
  if (await checkDevDb()) {
    c.success('Launching local Nop.Web server...');
    const os = require('os');
    let webroot = path.resolve(process.cwd(), '../../');
    if (os.type() === 'Darwin') {
      let command = `osascript -e 'tell application "Terminal"
                      do script "cd ${webroot} && dotnet watch run"
                    end tell'`;
      try {
        execSync(command);
      } catch (e) {
        c.error('Custom MacOS command failed :(');
        console.log(e);
        process.exit(1);
      }
    } else {
      let terminal = spawn('dotnet watch run', {
        cwd: webroot,
        detached: true,
        stdio: ['pipe', 'pipe', process.stderr],
        shell: true
      });
      terminal.unref();
    }
    process.on('SIGINT', () => {
      c.emphasis('Don\'t forget to close the local Nop.Web server window! :)');
      process.exit();
    });
  }
};

/**
 * Checks the dataSettings.json file exists and has a valid connection. Also handles adding/updating existing connections.
 * @returns {boolean}
 */
const checkDevDb = async () => {
  const helpers = require('../util/helpers');
  let dataSettings = helpers.getJson(getDataSettingsPath());
  //Save the dataSettings object to the platform for use later so we don't have to pass it around all of the functions
  nop.dataSettings = dataSettings;
  const connect = nop.argv._.length > 1 && nop.argv._[1] === 'connect';
  let goodConnection = false;
  if (!dataSettings || !dataSettings.DataConnectionString) {
    c.warn('Oh no! It looks like you don\'t have a database connection set up.');
    c.warn('You can change/update your local database connection settings by running the "gc dev connect" command.');
    if (await c.getResponse(`Would you like to set up a database connection now? Confirm with "y"`) === 'y') {
      goodConnection = await addConnection();
    }
  } else if (connect) {
    let connectionName = nop.argv._.length > 2 ? nop.argv._[2] : null;
    if (dataSettings.LocalConnections) {
      if (connectionName && Object.prototype.hasOwnProperty.call(dataSettings.LocalConnections, connectionName)) {
        let verify = await verifyConnection(dataSettings.LocalConnections[connectionName], connectionName);
        if (!verify.failed) {
          goodConnection = await saveConnection(dataSettings.LocalConnections[connectionName], connectionName);
        } else {
          goodConnection = await addConnection(dataSettings.LocalConnections, connectionName);
        }
      } else {
        let s = "You currently have the following connections saved:";
        for (let [key] of Object.entries(dataSettings.LocalConnections)) {
          s += (`\n - ${key}`);
        }
        c.log(s);
        connectionName = await c.getResponse("Please enter the name of the connection you'd like to update, or \"new\" to add a connection.");
        if (connectionName === 'new') {
          goodConnection = await addConnection();
        } else if (Object.prototype.hasOwnProperty.call(dataSettings.LocalConnections, connectionName)) {
          let verify = await verifyConnection(dataSettings.LocalConnections[connectionName], connectionName)
          if (!verify.failed) {
            goodConnection = await saveConnection(dataSettings.LocalConnections[connectionName], connectionName);
          } else {
            goodConnection = await addConnection(dataSettings.LocalConnections, connectionName);
          }
        } else {
          c.warn('The name you entered does not exist. Please try again');
          return checkDevDb();
        }
      }
    } else if (dataSettings.DataConnectionString) {
      let connection = parseConnectionString(dataSettings.DataConnectionString);
      if (!connectionName) {
        connectionName = await c.getResponse('You currently don\'t have a name for this connection. What would you like to name it?');
        if (connectionName.length < 1) {
          c.log('Oops! No name was received. Let\'s default to "dev" for now, and you can change it later.');
          connectionName = 'dev';
        }
      }
      let connections = {};
      connections[connectionName] = connection;
      goodConnection = await addConnection(connections, connectionName);
    }
  } else {
    goodConnection = true;
  }
  return goodConnection;
};

/**
 * Adds a connection object to the dataSettings JSON Object/file
 * @param {Object} connections
 * @param {string|null} name
 * @returns {boolean}
 */
const addConnection = async (connections = null, name = null) => {
  let source = '', db = '', user = '', pw = '', connection = null;
  if (connections && name) {
    connection = connections[name];
    source = connection.hostname;
    db = connection.database;
    user = connection.username;
    pw = connection.password;
  }
  source = await getConnectionValue('hostname', source);
  db = await getConnectionValue('database', db);
  user = await getConnectionValue('username', user);
  pw = await getConnectionValue('password', pw);
  connection = {
    'hostname': source,
    'database': db,
    'username': user,
    'password': pw
  };
  let verify = await verifyConnection(connection, name);
  if (verify.failed) {
    connections = Object.assign({}, connections);
    name = name || verify.name;
    connections[name] = connection;
    return addConnection(connections, name);
  } else {
    name = name || verify.name;
  }
  return saveConnection(connection, name);
};

/**
 * Get the connection field's value from the user
 * @param {string} fieldName
 * @param {string} value
 * @returns {string}
 */
const getConnectionValue = async (fieldName, value) => {
  let response = await c.getResponse(`Please enter the ${fieldName}${value ? ` (current value ${value}). Leave response empty to keep` : ''}`);
  if (response === '' && value) {
    return value;
  } else if (response) {
    return response;
  }
  c.warn('Oh no! Something went wrong. Let\'s try again');
  return getConnectionValue(fieldName, value);
};

/**
 * Show the user the connection object value and ask them to verify
 * @param {Object} connection
 * @param {string|null} name
 * @returns {boolean}
 */
const verifyConnection = async (connection, name = null) => {
  if (!name) {
    name = await c.getResponse('Please enter the name of this connection') || 'dev';
    connection.name = name;
  }
  c.log(`Here is the info for your ${name} connection:`);
  console.log(connection);
  if (await c.getResponse('Does this look correct? Confirm with "y"') === 'y') {
    return connection;
  }
  connection.failed = true;
  return connection;
};

/**
 * Saves the given connection to the dataSettings.json file
 * @param {Object} connection
 * @param {string} name
 * @returns {boolean}
 */
const saveConnection = async (connection, name) => {
  if (!connection || !connection.database || !name) return false;
  // remove unneeded properties
  delete connection.name;
  delete connection.failed;
  let dataSettings = Object.assign({
    'DataProvider': 'sqlserver',
    'DataConnectionString': '',
    'RawDataSettings': {}
  }, nop.dataSettings);
  dataSettings.LocalConnections = dataSettings.LocalConnections || {};
  dataSettings.LocalConnections[name] = connection;
  dataSettings.DataConnectionString = createConnectionString(connection.hostname, connection.database, connection.username, connection.password);
  const helpers = require('../util/helpers');
  return helpers.writeJson(getDataSettingsPath(), dataSettings);
};

/**
 * Gets the absolute path to the dataSettings.json file
 * @returns {string}
 */
const getDataSettingsPath = () => {
  const path = require('path');
  return path.resolve(process.cwd(), '../../App_Data/dataSettings.json');
}

/**
 * Parses the given NopCommerce data connection string into an object with the hostname, database, username, and password
 * @param {string} connectionString
 * @returns {Object}
 */
const parseConnectionString = connectionString => {
  let source = 'Data Source', db = 'Initial Catalog', user = 'User ID', pw = 'Password';
  connectionString.split(';').forEach(keyPair => {
    let pieces = keyPair.split('=');
    switch (pieces[0]) {
      case source:
        source = pieces[1];
        break;
      case db:
        db = pieces[1];
        break;
      case user:
        user = pieces[1];
        break;
      case pw:
        pw = pieces[1];
        break;
    }
  });
  return {
    'hostname': source,
    'database': db,
    'username': user,
    'password': pw
  };
};

/**
 * Formats the given parameters into a single NopCommerce data connection string
 * @param {string} source
 * @param {string} db
 * @param {string} user
 * @param {string} pw
 * @returns {string}
 */
const createConnectionString = (source, db, user, pw) => {
  return `Data Source=${source};Initial Catalog=${db};Integrated Security=False;Persist Security Info=False;User ID=${user};Password=${pw}`
};

/**
 * Gets the public path to the outputted assets
 * @param {Object} config
 * @return {string}
 */
nop.getAssetsLocation = config => {
  if (!nop.verifyThemeDirectory(config)) {
    c.error(`The theme directory does not match the config.theme.short_name value! (${config.theme.short_name})`);
    c.error('This will cause issues with the sw.js & manifest.js files. Please fix immediately');
  }
  return config.env.production ? `/Themes/${config.theme.short_name}/Content/` : '/';
};

/**
 * Gets the array of URLs to cache when the service worker is installed
 * @param {Object} config
 * @return {Array}
 */
nop.getSWUrls = config => {
  const helpers = require('../util/helpers');
  let opts = helpers.getBuildOptions({
    urlsToCache: [
      `/Themes/${config.theme.short_name}/Content/offline.html`,
      `/Themes/${config.theme.short_name}/Content/images/logo.png`,
      `/Themes/${config.theme.short_name}/Content/jquery.min.js`,
      `/Themes/${config.theme.short_name}/Content/theme.css?ver=${config.build}`,
      `/Themes/${config.theme.short_name}/Content/theme.js?ver=${config.build}`,
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
 * Gets the relative path from the project's output folder to the site root
 * @return {string}
 */
nop.getSiteRootPath = () => {
  return '../../../wwwroot';
};

/**
 * Gets the default BrowserSync options for the dev process
 * @returns {Object}
 */
nop.getDefaultDevOptions = () => {
  return {
    localDev: {
      host: "localhost",
      port: "3000",
      sync: true,
      proxy: 'localhost:55390',
      files: '**/*.cshtml, **/*.css, **/*.js'
    }
  };
};

/**
 * The relative path to the directory that WebPack will output assets to
 * @type {string}
 */
nop.outputPath = './Content';

/**
 * Determines if this platform supports the "dev" command
 * @type {boolean}
 */
nop.supportsDev = true;

/**
 * The name of the starter theme's directory
 * @type {string}
 */
nop.starterName = 'GCStarter';

/**
 * The message that prints when a production build is finished
 * @type {string}
 */
nop.productionMessage = 'Don\'t forget to upload the config.json, Content/manifest.json, and sw.js files';

/**
 * Friendly name of this platform
 * @type {string}
 */
nop.platformName = 'NopCommerce';

module.exports = nop;
