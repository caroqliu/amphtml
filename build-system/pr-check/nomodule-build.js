/**
 * Copyright 2019 The AMP HTML Authors. All Rights Reserved.
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

/**
 * @fileoverview
 * This script builds the minified AMP runtime.
 * This is run during the CI stage = build; job = Nomodule Build.
 */

const colors = require('ansi-colors');
const log = require('fancy-log');
const {
  printChangeSummary,
  processAndUploadNomoduleOutput,
  startTimer,
  stopTimer,
  stopTimedJob,
  timedExecWithError,
  timedExecOrDie: timedExecOrDieBase,
  uploadNomoduleOutput,
} = require('./utils');
const {determineBuildTargets} = require('./build-targets');
const {isPullRequestBuild} = require('../common/ci');
const {runNpmChecks} = require('./npm-checks');
const {signalDistUpload} = require('../tasks/pr-deploy-bot-utils');

const FILENAME = 'nomodule-build.js';
const FILELOGPREFIX = colors.bold(colors.yellow(`${FILENAME}:`));
const timedExecOrDie = (cmd) => timedExecOrDieBase(cmd, FILENAME);

async function main() {
  const startTime = startTimer(FILENAME, FILENAME);
  if (!runNpmChecks(FILENAME)) {
    stopTimedJob(FILENAME, startTime);
    return;
  }

  if (!isPullRequestBuild()) {
    timedExecOrDie('gulp update-packages');
    timedExecOrDie('gulp dist --fortesting');
    uploadNomoduleOutput(FILENAME);
  } else {
    printChangeSummary(FILENAME);
    const buildTargets = determineBuildTargets(FILENAME);
    if (
      buildTargets.has('RUNTIME') ||
      buildTargets.has('FLAG_CONFIG') ||
      buildTargets.has('INTEGRATION_TEST') ||
      buildTargets.has('E2E_TEST') ||
      buildTargets.has('VISUAL_DIFF') ||
      buildTargets.has('UNIT_TEST')
    ) {
      timedExecOrDie('gulp update-packages');
      const process = timedExecWithError('gulp dist --fortesting', FILENAME);
      if (process.status !== 0) {
        const error = process.error || new Error('unknown error, check logs');
        log(colors.red('ERROR'), colors.yellow(error.message));
        await signalDistUpload('errored');
        stopTimedJob(FILENAME, startTime);
        return;
      }
      timedExecOrDie('gulp storybook --build');
      await processAndUploadNomoduleOutput(FILENAME);
    } else {
      await signalDistUpload('skipped');
      console.log(
        `${FILELOGPREFIX} Skipping`,
        colors.cyan('Nomodule Build'),
        'because this commit does not affect the runtime, flag configs,',
        'integration tests, end-to-end tests, or visual diff tests.'
      );
    }
  }

  stopTimer(FILENAME, FILENAME, startTime);
}

main();
