/**
 * Copyright 2017 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const checkDependencies = require('check-dependencies');
const del = require('del');
const fs = require('fs-extra');
const {cyan, green, yellow} = require('kleur/colors');
const {execOrDie} = require('../common/exec');
const {isCiBuild} = require('../common/ci');
const {log, logLocalDev} = require('../common/logging');

/**
 * Writes the given contents to the patched file if updated
 * @param {string} patchedName Name of patched file
 * @param {string} file Contents to write
 */
function writeIfUpdated(patchedName, file) {
  if (!fs.existsSync(patchedName) || fs.readFileSync(patchedName) != file) {
    fs.writeFileSync(patchedName, file);
    logLocalDev(green('Patched'), cyan(patchedName));
  }
}

/**
 * Patches Web Animations polyfill by wrapping its body into `install` function.
 * This gives us an option to call polyfill directly on the main window
 * or a friendly iframe.
 */
function patchWebAnimations() {
  // Copies web-animations-js into a new file that has an export.
  const patchedName =
    'node_modules/web-animations-js/web-animations.install.js';
  let file = fs
    .readFileSync('node_modules/web-animations-js/web-animations.min.js')
    .toString();
  // Replace |requestAnimationFrame| with |window|.
  file = file.replace(/requestAnimationFrame/g, function (a, b) {
    if (file.charAt(b - 1) == '.') {
      return a;
    }
    return 'window.' + a;
  });
  // Fix web-animations-js code that violates strict mode.
  // See https://github.com/ampproject/amphtml/issues/18612 and
  // https://github.com/web-animations/web-animations-js/issues/46
  file = file.replace(/b.true=a/g, 'b?b.true=a:true');

  // Fix web-animations-js code that attempts to write a read-only property.
  // See https://github.com/ampproject/amphtml/issues/19783 and
  // https://github.com/web-animations/web-animations-js/issues/160
  file = file.replace(/this\._isFinished\s*=\s*\!0,/, '');

  // Wrap the contents inside the install function.
  file =
    'export function installWebAnimations(window) {\n' +
    'var document = window.document;\n' +
    file +
    '\n' +
    '}\n';
  writeIfUpdated(patchedName, file);
}

/**
 * Patches Intersection Observer polyfill by wrapping its body into `install`
 * function.
 * This gives us an option to control when and how the polyfill is installed.
 * The polyfill can only be installed on the root context.
 */
function patchIntersectionObserver() {
  // Copies intersection-observer into a new file that has an export.
  const patchedName =
    'node_modules/intersection-observer/intersection-observer.install.js';
  let file = fs
    .readFileSync('node_modules/intersection-observer/intersection-observer.js')
    .toString();

  // Wrap the contents inside the install function.
  file = `export function installIntersectionObserver() {\n${file}\n}\n`;
  writeIfUpdated(patchedName, file);
}

/**
 * Patches Resize Observer polyfill by wrapping its body into `install`
 * function.
 * This gives us an option to control when and how the polyfill is installed.
 * The polyfill can only be installed on the root context.
 */
function patchResizeObserver() {
  // Copies intersection-observer into a new file that has an export.
  const patchedName =
    'node_modules/resize-observer-polyfill/ResizeObserver.install.js';
  let file = fs
    .readFileSync(
      'node_modules/resize-observer-polyfill/dist/ResizeObserver.js'
    )
    .toString();

  // Wrap the contents inside the install function.
  file = `export function installResizeObserver(global) {\n${file}\n}\n`
    // For some reason Closure fails on this three lines. Babel is fine.
    .replace(
      "typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :",
      ''
    )
    .replace(
      "typeof define === 'function' && define.amd ? define(factory) :",
      ''
    )
    .replace('}(this, (function () {', '}(global, (function () {');
  writeIfUpdated(patchedName, file);
}

/**
 * Patches Timeago by renaming some locales in lang/ in the format supported by
 * amp-timeago, as well as files which import these.
 */
function patchTimeago() {
  // Copies full.js into a new file that imports updated formats.
  const patchedFullName = 'node_modules/timeago.js/lib/full.patched.js';
  let file = fs.readFileSync('node_modules/timeago.js/lib/full.js').toString();

  // Wrap the contents inside the install function.
  file = file
    // For some reason Closure fails on this three lines. Babel is fine.
    .replace(
      `Object.keys(Languages).forEach(function (locale) {
        _1.register(locale, Languages[locale]);
    });`,
      `var timeagoReplacements = {
        'en_US': 'en',
        'en_short': 'enshort',
        'bn_IN': 'inbg',
        'id_ID': 'inid',
        'hi_IN': 'inhi',
        'nb_NO': 'nbno',
        'nn_NO': 'nnno',
        'pt_BR': 'ptbr',
        'zh_CN': 'zhcn',
        'zh_TW': 'zhtw',
      };
      Object.keys(Languages).forEach(function (locale) {
        var localeStr = locale;
        if (timeagoReplacements[locale]) {
          localeStr = timeagoReplacements[locale]
        }
          _1.register(localeStr, Languages[locale]);
    });`
    );
  writeIfUpdated(patchedFullName, file);
}

/**
 * Deletes the map file for rrule, which breaks closure compiler.
 * TODO(rsimha): Remove this workaround after a fix is merged for
 * https://github.com/google/closure-compiler/issues/3720.
 */
function removeRruleSourcemap() {
  const rruleMapFile = 'node_modules/rrule/dist/es5/rrule.js.map';
  if (fs.existsSync(rruleMapFile)) {
    del.sync(rruleMapFile);
    logLocalDev(green('Deleted'), cyan(rruleMapFile));
  }
}

/**
 * Checks if all packages are current, and if not, runs `npm install`.
 */
function runNpmCheck() {
  const results = checkDependencies.sync({
    verbose: true,
    log: () => {},
    error: console.log,
  });
  if (!results.depsWereOk) {
    log(
      yellow('WARNING:'),
      'The packages in',
      cyan('node_modules'),
      'do not match',
      cyan('package.json') + '.'
    );
    log('Running', cyan('npm install'), 'to update packages...');
    execOrDie('npm install');
  } else {
    log(
      green('All packages in'),
      cyan('node_modules'),
      green('are up to date.')
    );
  }
}

/**
 * Used as a pre-requisite by several gulp tasks.
 */
function maybeUpdatePackages() {
  if (!isCiBuild()) {
    updatePackages();
  }
}

/**
 * Installs custom lint rules, updates node_modules (for local dev), and patches
 * polyfills if necessary.
 */
async function updatePackages() {
  if (!isCiBuild()) {
    runNpmCheck();
  }
  patchWebAnimations();
  patchIntersectionObserver();
  patchResizeObserver();
  removeRruleSourcemap();
  patchTimeago();
}

module.exports = {
  maybeUpdatePackages,
  updatePackages,
};

updatePackages.description =
  'Runs npm install if node_modules is out of date, and applies custom patches';
