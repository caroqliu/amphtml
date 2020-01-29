/**
 * Copyright 2020 The AMP HTML Authors. All Rights Reserved.
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
import {CSS} from '../../../build/amp-social-share-0.2.css';
import {Fragment, createElement} from '../../../src/preact';
import {PreactBaseElement} from '../../../src/preact/base-element';
import {SocialShare} from './social-share';
import {getDataParamsFromAttributes} from '../../../src/dom';
import {isExperimentOn} from '../../../src/experiments';
import {toggle} from '../../../src/style';
import {userAssert} from '../../../src/log';

/** @const {string} */
const TAG = 'amp-social-share';

class AmpSocialShare extends PreactBaseElement {
  /** @override */
  init() {
    let rendered;
    const host = this.element;
    const dataParams = getDataParamsFromAttributes(host);
    const render = (_, ...children) => {
      // We only render once in AMP mode, but React mode may rerender
      // serveral times.
      if (rendered) {
        return children;
      }
      rendered = true;
      return createElement(Fragment, null, children);
    };
    this.context_['collapse'] = () => toggle(host, false);
    return {
      host,
      dataParams,
      render,
    };
  }

  /** @override */
  isLayoutSupported() {
    userAssert(
      isExperimentOn(this.win, 'amp-social-share-v2'),
      'expected amp-social-share-v2 experiment to be enabled'
    );
    return true;
  }
}

/** @override */
AmpSocialShare.Component = SocialShare;

/** @override */
AmpSocialShare.passthrough = true;

/** @override */
AmpSocialShare.props = {
  'type': {attr: 'type'},
  'dataShareEndpoint': {attr: 'data-share-endpoint'},
  'dataTarget': {attr: 'data-target'},
  'style': {attr: 'style'},
  'tabindex': {attr: 'tabindex'},
};

AMP.extension(TAG, '0.2', AMP => {
  AMP.registerElement(TAG, AmpSocialShare, CSS);
});