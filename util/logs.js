'use strict';

const colors = require('colors/safe');

let logs = {};

/**
 * Normal console log (white color)
 * @param {string} m
 */
logs.log = m => {
  console.log(colors.white(`\n${m}\n`));
};

/**
 * Green & bold console log
 * @param {string} m
 */
logs.success = m => {
  console.log(colors.green.bold(`\n${m}\n`));
};

/**
 * Bright yellow console log
 * @param {string} m
 */
logs.warn = m => {
  console.log(colors.brightYellow(`\n${m}\n`));
};

/**
 * Red & bold console log
 * @param {string} m
 */
logs.error = m => {
  console.log(colors.red.bold(`\n${m}\n`));
};

/**
 * Underline, magenta, & bold console log
 * @param {string} m
 */
logs.emphasis = m => {
  console.log(colors.underline.magenta.bold(`\n${m}\n`));
};

/**
 * Bright yellow message with a link to the repo on NPM
 */
logs.info = () => {
  logs.warn('\nFor more info, read the docs at https://www.npmjs.com/package/@goldencomm/build-scripts\n');
};

/**
 * Prints the query to the console and returns a Promise that resolves with the user's input
 * @param {string} query
 * @returns {Promise<string>} answer
 */
logs.getResponse = query => {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(`${query}: `, ans => {
    rl.close();
    resolve(ans);
  }));
};

/**
 * Initializes a progress bar in the console
 * @param {Number} length The string length of the progress bar
 */
logs.initProgressBar = (length = 20) => {
  logs.progressLength = length;
  let progress = '';
  while (progress.length < length) {
    progress += '-';
  }
  process.stdout.write(`[${progress}] 0%`);
  logs.progressInit = true;
};

/**
 * Updates a progress bar in the console.
 * If a progress bar has not been initiated, one will be initiated.
 * @param {Number} percent
 */
logs.updateProgressBar = percent => {
  if (!logs.progressInit) {
    logs.initProgressBar();
  }
  let progress = '';
  let chunks = 100 / logs.progressLength;
  let x = chunks;
  while (x <= percent) {
    progress += '=';
    x += chunks;
  }
  while (progress.length < logs.progressLength) {
    progress += '-';
  }
  process.stdout.cursorTo(0);
  process.stdout.write(`[${progress}] ${percent}%`);
  if (percent >= 100) {
    logs.progressInit = false;
    logs.progressLength = undefined;
    console.log('\n');
  }
};

/**
 * Returns a Promise that resolves after the given duration
 * @param {int} duration
 * @returns {Promise}
 */
logs.timeout = duration => {
  return new Promise(r => setTimeout(r, duration));
};

module.exports = logs;
