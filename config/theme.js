//@ts-check
'use strict';

function sassifyValue(value) {
  // map
  if (typeof value === 'object' && value !== null) {
    return `(${Object.keys(value).reduce((_val, _var) => _val += `${_var}:${sassifyValue(value[_var])},`, '')})`;
  }
  // string or number
  return value;
}

function configSassVariables(config) {
  let sass = config.styles.sass;

  if (!(typeof sass === 'object' && sass !== null)) return '';

  return Object.keys(sass).reduce((variables, variable) => {
    variables += `$${variable}:${sassifyValue(sass[variable])};`;
    return variables;
  }, '');
}

module.exports = platform => {

  const helpers = require('../util/helpers');
  const path = require('path');
  const fs = require('fs');
  let config = helpers.getJson(path.resolve(process.cwd(), platform.configPath));

  console.log(`\nayyy bby\n\n`);

  // PLUGINS
  const MiniCssExtractPlugin = require('mini-css-extract-plugin');
  const ConfigPlugin = require('../plugins/config');
  const globImporter = require('node-sass-glob-importer');

  let options = helpers.getBuildOptions({
    src: {
      styles: './_src/styles',
      scripts: './_src/scripts'
    },
    output: platform.outputPath,
    externals: {
      jquery: 'jQuery'
    },
    optimization: {
      splitChunks: {
        chunks: 'async'
      }
    }
  });

  let toolkitSettings = './node_modules/@goldencomm/toolkit/util/';
  if (fs.existsSync(path.resolve(process.cwd(), `${options.src.styles}/settings/_toolkit.scss`))) {
    toolkitSettings = `${options.src.styles}/settings/`;
  }

  let postCSSConfig = path.resolve(__dirname, '../');
  if (fs.existsSync(path.resolve(process.cwd(), 'postcss.config.js'))) {
    postCSSConfig = path.resolve(process.cwd());
  }

  let babelConfig = path.resolve(__dirname, '../');
  if (fs.existsSync(path.resolve(process.cwd(), 'babel.config.js'))) {
    babelConfig = path.resolve(process.cwd());
  }

  let plugins = [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new ConfigPlugin({
      src: platform.configPath,
      platform: platform.name
    })
  ];

  let cssLoaders = [
    {loader: MiniCssExtractPlugin.loader, options: {esModule: true}},
    {loader: 'css-loader', options: {url: false, sourceMap: !process.env.production}},
    {loader: 'postcss-loader', options: {sourceMap: !process.env.production, postcssOptions: {config: postCSSConfig }}},
    {
      loader: 'sass-loader',
      options: {
        sourceMap: !process.env.production,
        additionalData: configSassVariables(config),
        sassOptions: {
          importer: globImporter()
        }
      }
    }
  ];

  let optimizeOpts = options.optimization;

  if (!process.env.production) {
    // Development mode
    const SourceMapPlugin = require('webpack').SourceMapDevToolPlugin;
    // @ts-ignore
    plugins.push(
      // @ts-ignore
      new SourceMapPlugin({
        test: /\.s?css$/
      })
    );
  } else {
    // Production mode
    const TerserPlugin = require('terser-webpack-plugin');
    optimizeOpts.minimizer = [
      new TerserPlugin({
        terserOptions: {
          output: {
            comments: false,
          },
        },
        extractComments: false,
      })
    ];
  }

  return {
    externals: options.externals,
    entry: {
      'theme': [
        `${options.src.scripts}/theme.js`
      ]
    },
    output: {
      path: path.join(process.cwd(), options.output),
      filename: '[name].js'
    },
    resolve: {
      alias: {
        'scss-settings': path.resolve(process.cwd(), toolkitSettings)
      }
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: [
            /\.s?css$/i,
            /node_modules[\\/]@babel/,
            /node_modules[\\/]core-js/,
            /node_modules[\\/]regenerator/
          ],
          use: {
            loader: 'babel-loader',
            options: {
              root: babelConfig,
              cacheDirectory: true
            }
          },
        },
        {
          test: /\.s?css$/,
          use: cssLoaders
        }
      ]
    },
    plugins: plugins,
    optimization: optimizeOpts,
  }
};
