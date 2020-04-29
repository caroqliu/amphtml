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
import {ActionTrust} from '../../../src/action-constants';
import {CSS} from '../../../build/amp-selector-0.2.css';
import {Option, Selector} from './selector';
import {PreactBaseElement} from '../../../src/preact/base-element';
import {Services} from '../../../src/services';
import {
  closestAncestorElementBySelector,
  toggleAttribute,
} from '../../../src/dom';
import {createCustomEvent} from '../../../src/event-helper';
import {dev, userAssert} from '../../../src/log';
import {dict, omit} from '../../../src/utils/object';
import {isExperimentOn} from '../../../src/experiments';
import {toArray} from '../../../src/types';
import {useEffect} from '../../../src/preact';

/** @const {string} */
const TAG = 'amp-selector';

class AmpSelector extends PreactBaseElement {
  /** @override */
  init() {
    const {/** @type {!Element} */ element} = this;
    const action = Services.actionServiceForDoc(this.element);
    const getOptionState = () => {
      const children = [];
      const optionChildren = toArray(element.querySelectorAll('[option]'));

      const value = [];
      optionChildren
        // Skip options that are themselves within an option
        .filter(
          (el) =>
            !closestAncestorElementBySelector(
              dev().assertElement(el.parentElement),
              '[option]'
            )
        )
        .forEach((child) => {
          const option = child.getAttribute('option');
          const selected = child.hasAttribute('selected');
          const disabled = child.hasAttribute('disabled');
          const props = {
            as: OptionShim,
            option,
            // TODO: `disabled` is always undefined for OptionShim
            isDisabled: disabled,
            disabled,
            role: child.getAttribute('role') || 'option',
            domElement: child,
            // TODO(wg-bento): This implementation causes infinite loops on DOM mutation.
            // See https://github.com/ampproject/amp-react-prototype/issues/40.
            postRender: () => {
              // Skip mutations to avoid cycles.
              mu.takeRecords();
            },
            selected,
          };
          if (selected && option) {
            value.push(option);
          }
          const optionChild = <Option {...props} />;
          children.push(optionChild);
        });
      return {value, children};
    };

    const rebuild = () => {
      this.mutateProps(getOptionState());
    };

    const mu = new MutationObserver(rebuild);
    mu.observe(element, {
      attributeFilter: ['option', 'selected'],
      subtree: true,
    });

    const {value, children} = getOptionState();
    return dict({
      'domElement': element,
      'children': children,
      'value': value,
      'onChange': (e) => {
        const {value, option} = e;
        fireSelectEvent(
          this.win,
          action,
          element,
          option,
          value,
          ActionTrust.HIGH
        );
        this.mutateProps(dict({'value': value}));
      },
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

/**
 * Triggers a 'select' event with two data params:
 * 'targetOption' - option value of the selected or deselected element.
 * 'selectedOptions' - array of option values of selected elements.
 *
 * @param {!Window} win
 * @param {!../../../src/service/action-impl.ActionService} action
 * @param {!Element} el The element that was selected or deslected.
 * @param {string} option
 * @param {Array<string>} value
 * @param {!ActionTrust} trust
 * @private
 */
function fireSelectEvent(win, action, el, option, value, trust) {
  const name = 'select';
  const selectEvent = createCustomEvent(
    win,
    `amp-selector.${name}`,
    dict({'targetOption': option, 'selectedOptions': value})
  );
  action.trigger(el, name, selectEvent, trust);
}

/**
 * @param {!JsonObject} props
 * @return {PreactDef.Renderable}
 */
function OptionShim(props) {
  const {
    'domElement': domElement,
    'onClick': onClick,
    'selected': selected,
    'isDisabled': isDisabled,
    'role': role = 'option',
  } = props;
  useEffect(() => {
    if (onClick) {
      domElement.addEventListener('click', onClick);
    }
    return () => {
      if (onClick) {
        domElement.removeEventListener('click', onClick);
      }
    };
  }, [domElement, onClick]);

  useEffect(() => {
    toggleAttribute(domElement, 'selected', selected);
  }, [domElement, selected]);

  useEffect(() => {
    toggleAttribute(domElement, 'disabled', isDisabled);
    toggleAttribute(domElement, 'aria-disabled', isDisabled);
  }, [domElement, isDisabled]);

  useEffect(() => {
    domElement.setAttribute('role', role);
  }, [domElement, role]);
}

/**
 * @param {!JsonObject} props
 * @return {PreactDef.Renderable}
 */
function SelectorShim(props) {
  const {
    'domElement': domElement,
    'role': role = 'listbox',
    'multiple': multiple,
    'disabled': disabled,
  } = props;

  useEffect(() => {
    toggleAttribute(domElement, 'multiple', multiple);
    toggleAttribute(domElement, 'aria-multiselectable', multiple);
  }, [domElement, multiple]);

  useEffect(() => {
    toggleAttribute(domElement, 'disabled', disabled);
    toggleAttribute(domElement, 'aria-disabled', disabled);
  }, [domElement, disabled]);

  useEffect(() => {
    domElement.setAttribute('role', role);
  }, [domElement, role]);

  return Selector(omit(props, ['domElement']));
}

/** @override */
AmpSelector.Component = SelectorShim;

/** @override */
AmpSelector.props = {
  // TODO: Add 'forms' attribute when form integrations are supported.
  'disabled': {attr: 'disabled', type: 'boolean'},
  'multiple': {attr: 'multiple', type: 'boolean'},
  'name': {attr: 'name'},
  'role': {attr: 'role'},
  'keyboardSelectMode': {attr: 'keyboard-select-mode'},
};

AMP.extension(TAG, '0.2', (AMP) => {
  AMP.registerElement(TAG, AmpSelector, CSS);
});
