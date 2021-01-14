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

const log = require('fancy-log');
const Mocha = require('mocha');
const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_TEST_PENDING,
} = Mocha.Runner.constants;
const {Base} = Mocha.reporters;
const {green, red, yellow} = require('ansi-colors');
const {icon, nbDotsPerLine} = require('../karma.conf').superDotsReporter;
const {reportTestFinished} = require('../report-test-status');

/**
 * Custom Mocha reporter for CI builds.
 * Mimics the style of the Karma super-dots reporter.
 * @param {*} runner
 */
class MochaDotsReporter extends Base {
  constructor(runner) {
    super(runner);

    let wrapCounter = 0;
    const printDot = (dot) => {
      process.stdout.write(dot);
      if (++wrapCounter >= nbDotsPerLine) {
        wrapCounter = 0;
        process.stdout.write('\n');
      }
    };

    runner
      .once(EVENT_RUN_BEGIN, () => {
        log('Running tests...');
      })
      .on(EVENT_TEST_PASS, () => {
        printDot(green(icon.success));
      })
      .on(EVENT_TEST_FAIL, () => {
        printDot(red(icon.failure));
      })
      .on(EVENT_TEST_PENDING, () => {
        printDot(yellow(icon.ignore));
      })
      .once(EVENT_RUN_END, () => {
        Base.list(this.failures);
        const {passes, pending, failures, tests} = runner.stats;
        console.log(
          `Executed ${failures + passes} of ${tests}`,
          `(Skipped ${pending})`,
          failures == 0 ? green('SUCCESS') : red(`${failures} FAILED`)
        );
        reportTestFinished(passes, failures);
      });
  }
}

module.exports = MochaDotsReporter;
