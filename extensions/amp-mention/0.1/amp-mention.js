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

import {ActionTrust} from '../../../src/action-constants';
import {Keys} from '../../../src/utils/key-codes';
import {Layout} from '../../../src/layout';
import {Services} from '../../../src/services';
import {
  UrlReplacementPolicy,
  batchFetchJsonFor,
} from '../../../src/batched-json';
import {createCustomEvent} from '../../../src/event-helper';
import {dev, user, userAssert} from '../../../src/log';
import {includes} from '../../../src/string';
import {isExperimentOn} from '../../../src/experiments';
import {removeChildren} from '../../../src/dom';
import {toggle} from '../../../src/style';

const EXPERIMENT = 'amp-mention';
const TAG = 'amp-mention';
const URL_REPLACEMENT = 'AMP_MENTION_QUERY';

export class AmpMention extends AMP.BaseElement {
  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /**
     * The value of the "trigger" attribute on the amp-mention.
     * @private {string}
     */
    this.trigger_ = '';

    this.menuTriggered_ = false;
    this.menuData_ = [];
    this.searchableUnit_ = '';

    /**
     * The reference to the [contenteditable] provided as a child.
     * @private {?HTMLElement}
     */
    this.editableElement_ = null;

    /**
     * The reference to the <input> provided as a child.
     * @private {?HTMLElement}
     */
    this.inputElement_ = null;

    /**
     * The reference to the <ul> that contains template-rendered menu items.
     * @private {?Element}
     */
    this.menuContainer_ = null;

    /** @private {?../../../src/service/action-impl.ActionService} */
    this.action_ = null;

    /** @private {boolean} */
    this.replaceSrc_ = false;

    /** @private {string} */
    this.initialSrc_ = null;
  }

  /** @override */
  buildCallback() {
    userAssert(
      isExperimentOn(this.win, 'amp-mention'),
      `Experiment ${EXPERIMENT} is not turned on.`
    );

    this.action_ = Services.actionServiceForDoc(this.element);

    this.trigger_ = this.element.getAttribute('trigger');

    this.menuContainer_ = this.createMenuContainer_();
    this.element.appendChild(this.menuContainer_);

    const editableElements = this.element.querySelectorAll('[contenteditable');
    userAssert(
      editableElements.length === 1,
      `${TAG} should contain exactly one [contenteditable] child`
    );
    this.editableElement_ =
      /** @type {!HTMLInputElement} */ (editableElements[0]);

    this.inputElement_ = this.element.ownerDocument.createElement('input');
    toggle(this.inputElement_, false);
    if (this.element.hasAttribute('name')) {
      this.inputElement_.setAttribute(
        'name',
        this.element.getAttribute('name')
      );
    }
    this.element.appendChild(this.inputElement_);
    this.element.setAttribute('aria-haspopup', 'listbox');

    this.initialSrc_ = this.element.getAttribute('src');
    this.replaceSrc_ = includes(this.initialSrc_, URL_REPLACEMENT);
  }

  /** @override */
  layoutCallback() {
    // Register event handlers.
    this.editableElement_.addEventListener('input', e => {
      this.inputHandler_(e);
    });
    this.editableElement_.addEventListener('keydown', e => {
      this.keydownHandler_(e);
    });
    this.menuContainer_.addEventListener('mousedown', e => {
      this.selectHandler_(e);
    });
  }

  /**
   * Creates and returns <ul> that contains the plaintext rendered children.
   * Should be called in a measureMutate context.
   * @return {!Element}
   * @private
   */
  createMenuContainer_() {
    const menuContainer = this.element.ownerDocument.createElement('ul');
    menuContainer.classList.add('i-amphtml-mention-menu');
    menuContainer.setAttribute('role', 'listbox');
    toggle(menuContainer, false);
    return menuContainer;
  }

  /**
   * Handles checking for the given trigger and rendering suggestions on user input.
   * @param {!Event} event
   * @return {!Promise}
   * @private
   */
  inputHandler_(event) {
    this.updateHiddenInput_();

    const triggered = event.data === this.trigger_;
    if (!triggered && !this.menuTriggered_) {
      return Promise.resolve();
    }
    const delimited = event.data === ' ';
    if (delimited) {
      this.menuTriggered_ = false;
      this.clearAllItems_();
      return Promise.resolve();
    }
    const {textContent} = this.editableElement_;
    const triggerLoc = textContent.lastIndexOf(this.trigger_);
    if (triggerLoc == -1) {
      this.clearAllItems_();
      return Promise.resolve();
    }
    this.menuTriggered_ = true;
    this.searchableUnit_ = textContent.slice(triggerLoc + 1);
    this.fireTriggeredEvent_(this.searchableUnit_);

    return this.retrieveMenuData_().then(menuData => {
      this.menuData_ = menuData || [];
      this.triggerSuggestionMenu_(this.menuData_);
    });
  }

  /**
   * Handles keyboard events.
   * @param {!Event} event
   * @return {!Promise}
   * @private
   */
  keydownHandler_(event) {
    switch (event.key) {
      case Keys.BACKSPACE:
      // TODO: Delete entire @mention if cursor is within a selected item.
      default:
        return Promise.resolve();
    }
  }

  /**
   * Handle selecting items on user mousedown.
   * @param {!Event} event
   * @return {!Promise}
   * @private
   */
  selectHandler_(event) {
    return this.mutateElement(() => {
      const element = dev().assertElement(event.target);
      this.selectItem_(this.getItemElement_(element));
      this.updateHiddenInput_();
    });
  }

  /**
   * Writes the selected value into the input field.
   * @param {?Element} element
   * @private
   */
  selectItem_(element) {
    if (element === null) {
      return;
    }
    const selectedValue = element.textContent;
    this.fireSelectEvent_(selectedValue);
    this.menuTriggered_ = false;
    const {textContent} = this.editableElement_.lastChild;

    const triggerLoc = textContent.lastIndexOf(this.trigger_);
    const postLoc = triggerLoc + 1 + this.searchableUnit_.length;
    this.editableElement_.lastChild.textContent = textContent.slice(
      0,
      triggerLoc
    );
    const span = this.element.ownerDocument.createElement('span');
    span.classList.add('mention-selected');
    span.appendChild(
      this.element.ownerDocument.createTextNode(this.trigger_ + selectedValue)
    );
    const postText = document.createTextNode(
      textContent.slice(postLoc) + '\u00A0'
    );

    this.editableElement_.appendChild(span);
    this.editableElement_.appendChild(postText);
    this.clearAllItems_();

    this.editableElement_.focus();
    const selection = this.win.getSelection();
    const range = document.createRange();

    range.setStart(postText, 1);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /**
   * Returns the nearest ancestor element that is a suggested item.
   * @param {?Element} element
   * @return {?Element}
   * @private
   */
  getItemElement_(element) {
    if (element === null) {
      return null;
    }
    if (element.classList.contains('i-amphtml-mention-menu-item')) {
      return element;
    }
    return this.getItemElement_(element.parentElement);
  }

  /**
   * Retrieve
   * @param {?Array<!JsonObject|string>} menuData
   * @return {!Promise}
   * @private
   */
  triggerSuggestionMenu_(menuData) {
    this.clearAllItems_();
    if (!menuData || !menuData.length) {
      return Promise.resolve();
    }
    return this.renderMenu_(menuData, dev().assertElement(this.menuContainer_));
  }

  /**
   * Reads the 'items' data from the URL provided in the 'src' attribute.
   * For use with remote data.
   * @return {!Promise<!Array<string>>}
   * @private
   */
  retrieveMenuData_() {
    const ampdoc = this.getAmpDoc();
    const policy = UrlReplacementPolicy.ALL;
    if (this.replaceSrc_) {
      const regEx = new RegExp(URL_REPLACEMENT, 'g');
      const updatedSrc = this.initialSrc_.replace(regEx, this.searchableUnit_);
      this.element.setAttribute('src', updatedSrc);
    }
    return batchFetchJsonFor(ampdoc, this.element, 'items', policy).catch(e => {
      if (e.message === 'Response is undefined.') {
        user().warn(
          TAG,
          'Expected key "%s" in data but found nothing. Rendering empty results.',
          'items'
        );
        return [];
      }
    });
  }

  /**
   * Render the given data into item elements in the given container element.
   * @param {!Array<!JsonObject|string>} data
   * @param {!Element} container
   * @return {!Promise}
   * @private
   */
  renderMenu_(data, container) {
    let renderPromise = Promise.resolve();
    if (this.templateElement_) {
      renderPromise = this.templates_
        .renderTemplateArray(this.templateElement_, data)
        .then(renderedChildren => {
          renderedChildren.map(child => {
            if (child.hasAttribute('data-disabled')) {
              child.setAttribute('aria-disabled', 'true');
            }
            child.classList.add('i-amphtml-mention-menu-item');
            child.setAttribute('role', 'option');
            container.appendChild(child);
          });
        });
    } else {
      data.forEach(item => {
        userAssert(
          typeof item === 'string',
          `${TAG} data must provide template for non-string items.`
        );
        container.appendChild(
          this.createElementFromItem_(/** @type {string} */ (item))
        );
      });
    }
    this.toggleResults_(true);
    return renderPromise;
  }

  /**
   * Create and return <li> element from given plantext item.
   * @param {string} item
   * @return {!Element}
   * @private
   */
  createElementFromItem_(item) {
    const element = this.element.ownerDocument.createElement('li');
    element.classList.add('i-amphtml-mention-menu-item');
    element.setAttribute('role', 'option');
    element.setAttribute('dir', 'auto');
    element.textContent = item;
    return element;
  }

  /**
   * Delete all children to the container_
   * @private
   */
  clearAllItems_() {
    removeChildren(dev().assertElement(this.menuContainer_));
  }

  /**
   * Triggers a 'select' event with the given value as the value emitted.
   * @param {string} value
   * @private
   */
  fireTriggeredEvent_(value) {
    const name = 'triggered';
    const triggeredEvent = createCustomEvent(
      this.win,
      `amp-mention.${name}`,
      /** @type {!JsonObject} */ ({value})
    );
    this.action_.trigger(this.element, name, triggeredEvent, ActionTrust.HIGH);
  }

  /**
   * Triggers a 'select' event with the given value as the value emitted.
   * @param {string} value
   * @private
   */
  fireSelectEvent_(value) {
    const name = 'select';
    const selectEvent = createCustomEvent(
      this.win,
      `amp-mention.${name}`,
      /** @type {!JsonObject} */ ({value})
    );
    this.action_.trigger(this.element, name, selectEvent, ActionTrust.HIGH);
  }

  /**
   * Shows or hides the results container_.
   * @param {boolean} display
   * @private
   */
  toggleResults_(display) {
    this.editableElement_.setAttribute('aria-expanded', display);
    toggle(dev().assertElement(this.menuContainer_), display);
  }

  /**
   * Updates the hidden input element with the content of the contenteditable.
   * @private
   */
  updateHiddenInput_() {
    this.inputElement_.value = this.editableElement_.textContent;
  }

  /** @override */
  isLayoutSupported(layout) {
    return layout == Layout.CONTAINER;
  }
}

AMP.extension(TAG, '0.1', AMP => {
  AMP.registerElement(TAG, AmpMention);
});
