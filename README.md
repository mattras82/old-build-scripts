# GoldenComm's Build Scripts Module

This package contains a series of tools for processing theme assets using WebPack and the [GC CLI](https://www.npmjs.com/package/@goldencomm/cli)


## Installation
```shell
$ npm i -D @goldencomm/build-scripts
```

## Quick References
 - [Supported Platforms](#supported-platforms)
 - [Options Configuration](#options-configuration)
 - [Theme Overrides](#theme-overrides)
 - [Local WebPack](#local-webpack)
 - [Dev Command](#dev-command)
 - [Troubleshooting](#troubleshooting)


## Supported Platforms
The build tools in this package are designed to work with GoldenComm's starter themes for the following platforms:
 - WordPress
 - Kentico
 - NopCommerce
 
 
## Options Configuration
You can specify a few options for your local theme in the `./build/options.json` file. You can use the `gc copy build` command to insert the boilerplate options.json file into your theme. The options you configure in your local theme will override the default configuration in the module for the WebPack build arguments.

#### Supported Options

|JSON Name|Type|Default Value|Description|
|:---|:---|:---|:---|
|src.styles| String| ./src/styles| The directory where your theme.scss file resides. Relative to your theme's root directory
|src.scripts| String| ./src/scripts| The directory where your theme.js file resides. Relative to your theme's root directory
|src.images| String| ./src/images| The directory where your image files reside. Relative to your theme's root directory
|output| String| ./assets| The directory where WebPack will output all of the processed assets. Relative to your theme's root directory
|externals| Object| `{"jquery": "jQuery"}`| The [externals config object](https://webpack.js.org/configuration/externals/) for WebPack
|localWebpack| String&#x7c;Boolean| default| Tells this module how to handle the local theme's WebPack config file, if one exists. If set to merge, this module will attempt to `"merge"` the theme's local config with the module's config. If set to `true`, only the theme's config will be used. If set to `false`, the theme's config will be ignored. If set to `"default"`, this module will prompt the user for a response on how to handle the theme's config.
|localDev| Object| `{ "host": "localhost", "port": "3000", "sync": true }`| These settings are used by the `gc dev` command (currently supported in the NopCommerce platform). The `sync` option determines whether or not to include the [Browser Sync Plugin](https://www.npmjs.com/package/browser-sync-webpack-plugin) for hot-reloading. The other options are passed as the Browser Sync options to the plugin.
|optimization| Object| `{ "splitChunks": { "chunks": "async" }`| These settings are used in the WebPack configuration. Please read through the [Optimization documentation](https://webpack.js.org/configuration/optimization/) and [SplitChunks documentation](https://webpack.js.org/plugins/split-chunks-plugin/) before editing this object. You can alter these settings in order to add code splitting & async module loading to your project.


## Theme Overrides
You can include a number of files in your theme's directory to override the default files in this module. To quickly add any of those files to your theme, use the `gc copy` command from the GC CLI.

#### Supported Files
|Filename|Location|Description|
|:---|:---|:---|
|babel.config.js| ./| The configuration file for the [Babel Transpiler](https://babeljs.io/), which is used by the [Babel WebPack loader](https://webpack.js.org/loaders/babel-loader/).
|postcss.config.js| ./| The configuration file for [PostCSS transformer tool](https://postcss.org/), which is used by the [PostCSS WebPack loader](https://webpack.js.org/loaders/postcss-loader/)
|manifest.json| ./build/| The base manifest.json file that is processed by WebPack and output in your theme's main assets directory. This is required for PWA support, and is general best practice to include in production.
|offline.html| ./build/| The html file that is returned by the PWA's service worker when the user is in offline mode
|sw.js| ./build/| The [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker) file that is registered for Progressive Web App support.


## Local WebPack
If the [Options Config](#options-configuration) doesn't provide enough customization for your theme's WebPack process, you can include a `webpack.config.js` file in your theme's root directory. 

#### Merge Strategy
The best way to handle this feature is to use the **"merge"** strategy by returning only the additional configuration options needed. For instance, if your project is using VueJS and you want your JavaScript to be handled by the [Vue WebPack loader](https://github.com/vuejs/vue-loader), then your `webpack.config.js` file could look like this:

```javascript
const VueLoaderPlugin = require('vue-loader/lib/plugin');

module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin()
  ]
};
```

The merge strategy also supports the `webpack.config.js` file returning a function instead of the configuration object. Using the VueJS example, that might look like this:

```javascript
module.exports = (env, argv) => {
  if (env.build === 'theme') {
    // Only include the Vue Loader if we're building the theme.js file  
    const VueLoaderPlugin = require('vue-loader/lib/plugin');
    return {
      module: {
          rules: [
            {
              test: /\.vue$/,
              loader: 'vue-loader'
            }
          ]
        },
        plugins: [
          new VueLoaderPlugin()
        ]
    };
  }
  return {};
};
```

#### Override Strategy
If you'd like to completely override the WebPack configuration used in this module, you can write your own WebPack config in your theme's `webpack.config.js` file and use the `"localWebPack"` property in the [Options Config](#options-configuration) to tell this module to only refer to your theme's config file.

## Dev Command
The following platforms are currently supporting the `gc dev` command:
 - [NopCommerce](#nopcommerce-dev-details)
 - [WordPress](#wordpress-dev-details)

### NopCommerce Dev Details
Running the `gc dev` command will attempt to use the `dotnet watch run` command to spin up a local dev server on your machine and it will use the [Browser Sync Webpack Plugin](https://www.npmjs.com/package/browser-sync-webpack-plugin) to watch for changes in the theme files and reload the browser automatically. The process defaults to "localhost:55390" and "**/*.cshtml, **/*.css, **/*.js" for the Browser Sync's options proxy and files, respectively. You can change those in your local [Build Options file](#options-configuration) in the `"localDev"` object. You can remove the Browser Sync plugin from the Webpack configuration by passing the `--no-sync` flag to the `gc dev` command or by setting the `localDev.sync` propery in the Build Options file to `false`;

The process will check the installed Dotnet Core SDKs on your machine to make sure the command will run properly. You can download the proper [Dotnet Core SDK](https://dotnet.microsoft.com/download/dotnet-core) from Microsoft's website.

The process will also help you set up a database connection, if it detects that one hasn't been set up yet. You can use the `gc dev connect` command to add/update a database connection string, or to change to another connection string. If you know the name of the connection string you want to update/swap to, you can use the `gc dev connect {CONNECTION_NAME}` syntax.

If the plugin or core project code has been updated and you need to recompile the project, you can add the "build" flag to the command (ie `gc dev --build`);

### WordPress Dev Details
Running the `gc dev` command will attempt to use the `docker-compose up` command to spin up a local dev server on your machine using [Docker](https://www.docker.com/) and it will use the [Browser Sync Webpack Plugin](https://www.npmjs.com/package/browser-sync-webpack-plugin) to watch for changes in the theme files and reload the browser automatically. 

The process defaults to `"localhost:8888"` and `"**/*.php, **/*.css, **/*.js"` for the Browser Sync's options proxy and files, respectively. You can change those in your local [Build Options file](#options-configuration) in the `"localDev"` object. You can remove the Browser Sync plugin from the Webpack configuration by passing the `--no-sync` flag to the `gc dev` command or by setting the `localDev.sync` propery in the Build Options file to `false`;

The first thing this process does is check your local file structure for existing Docker files. The required files are the `docker-compose.yml` & `.env` files. If those are not detected, those files will be copied into your project and a series of command prompts will ask for project-specific info:
 - LOCAL_URL : This is the URL that will be used for your local site. Example "my-site.local"
 - REMOTE_URL : This is the public URL where the site is hosted. It is recommended to use the GC dev site for this property. Example "my-site.gscadmin.com"
 - REMOTE_DB_HOST : This is the hostname for the remote site's database. You can find this info in the GC LastPass vault.
 - REMOTE_DB_NAME : This is the database name (schema) for the remote site's database. You can find this info in the GC LastPass vault.
 - REMOTE_DB_USER : This is the username for the remote site's database. You can find this info in the GC LastPass vault.
 - REMOTE_DB_PASSWORD : This is the password for the remote site's database. You can find this info in the GC LastPass vault.
 - BITBUCKET_USER : This is the username for our BitBucket access user. This account has been granted the necessary permissions to access our private repositories for our WordPress plugins & themes. You can find this info in the GC LastPass vault.
 - BITBUCKET_PASSWORD : This is the password for our BitBucket access user. This account has been granted the necessary permissions to access our private repositories for our WordPress plugins & themes. You can find this info in the GC LastPass vault.

When you first spin up a Docker container using this process, the custom Docker image will download the entire remote database & copy the data into your local database. It will then install all of the default plugins for a GC WordPress site.

The `REMOTE_DB_IMPORT` property in the `.env` file tells the Docker container whether or not to pull the data from the remote database and replace the existing local database's data. You can manually change this property if you'd like (use value "Y" or "y" for yes, "N" or "n" for no), or you can use the `--pull` and `--no-pull` flags for the `gc dev` command to update the `.env` file for you.

## Troubleshooting

### No CSS file
**Reason** - The default WebPack config in this module doesn't set the main SCSS file as an entry point like older GC WebPack configs.

**Solution** - You'll need to require your main stylesheet in your main JavaScript file. This applies to both theme & admin files.
```javascript
// theme.js
require('../styles/theme.scss');
```
