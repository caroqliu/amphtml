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

import * as Preact from '../../../src/preact';
import {Option, Selector} from './selector';
import {PreactBaseElement} from '../../../src/preact/base-element';
import {dict} from '../../../src/utils/object';
import {isExperimentOn} from '../../../src/experiments';
import {userAssert} from '../../../src/log';

/** @const {string} */
const TAG = 'amp-selector';
let instance = 0;

class AmpSelector extends PreactBaseElement {
  /** @override */
  init() {
    instance += 1;
    const getValueAndChildren = () => {
      const children = [];
      const optionChildren = this.element.querySelectorAll('[option]');
      const value = [];
      optionChildren.forEach(child => {
        // TODO: check that an option is not within another option.
        const option = child.getAttribute('option');
        const name = `i-amphtml-selector${instance}-option${option}`;
        child.setAttribute('slot', name);
        const props = {
          option,
          type: 'Slot',
          retarget: true,
          assignedElements: [child],
          postRender: () => {
            // Skip mutations to avoid cycles.
            mu.takeRecords();
          },
          name,
        };
        if (child.hasAttribute('selected')) {
          value.push(option);
        }
        const optionChild = <Option {...props} />;
        children.push(optionChild);
      });

      return {value, children};
    };

    const rebuild = () => {
      this.mutateProps(getValueAndChildren());
    };

    const mu = new MutationObserver(rebuild);
    mu.observe(this.element, {
      attributeFilter: ['option', 'selected'],
      subtree: true,
    });

    const {value, children} = getValueAndChildren();
    return dict({
      // TODO: "options" should be "children",
      // but neither "passthrough" or "children"
      // allow for this kind of intervention yet
      'options': children,
      'value': value,
      'onChange': event => this.mutateProps({'value': event.target.value}),
    });
  }

  /** @override */
  isLayoutSupported(unusedLayout) {
    userAssert(
      isExperimentOn(this.win, 'amp-selector-v2'),
      'expected amp-selector-v2 experiment to be enabled'
    );
    return true;
  }
}

/** @override */
AmpSelector.Component = Selector;

/** @override */
AmpSelector.passthrough = true;

/** @override */
AmpSelector.props = {
  'disabled': {attr: 'disabled'},
  'form': {attr: 'form'},
  'multiple': {attr: 'multiple'},
  'name': {attr: 'name'},
  'keyboardSelectMode': {attr: 'keyboard-select-mode'},
};

AMP.extension(TAG, '0.2', AMP => {
  AMP.registerElement(TAG, AmpSelector);
});
