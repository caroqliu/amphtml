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

import * as CSS from './selector.css';
import * as Preact from '../../../src/preact';
import {Keys} from '../../../src/utils/key-codes';
import {forwardRef} from '../../../src/preact/compat';
import {mod} from '../../../src/utils/math';
import {removeItem} from '../../../src/utils/array';
import {
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from '../../../src/preact';

const SelectorContext = Preact.createContext(
  /** @type {SelectorDef.ContextProps} */ ({selected: []})
);

/** @type {!Array} */
const EMPTY_OPTIONS = [];

/**
 * Set of namespaces that can be set for lifecycle reporters.
 *
 * @enum {string}
 */
const KEYBOARD_SELECT_MODE = {
  NONE: 'none',
  FOCUS: 'focus',
  SELECT: 'select',
};

/**
 * @param {!SelectorDef.Props} props
 * @param {{current: (!SelectorDef.SelectorApi|null)}} ref
 * @return {PreactDef.Renderable}
 */
function SelectorWithRef(
  {
    as: Comp = 'div',
    disabled,
    defaultValue = [],
    keyboardSelectMode: kbs = KEYBOARD_SELECT_MODE.NONE,
    value,
    multiple,
    onChange,
    onKeyDown: customOnKeyDown,
    role = 'listbox',
    tabIndex,
    children,
    ...rest
  },
  ref
) {
  const [selectedState, setSelectedState] = useState(
    value ? value : defaultValue
  );
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const selected = value ? value : selectedState;
  const selectOption = useCallback(
    (option) => {
      if (!option) {
        return;
      }
      let newValue = null;
      if (multiple) {
        newValue = selected.includes(option)
          ? selected.filter((v) => v != option)
          : selected.concat(option);
      } else {
        newValue = [option];
      }
      if (newValue) {
        setSelectedState(newValue);
        if (onChange) {
          onChange({value: newValue, option});
        }
      }
    },
    [multiple, onChange, selected]
  );

  const registerOption = useCallback((option) => {
    setOptions((options) => {
      options.push(option);
      return options;
    });
    return () =>
      setOptions((options) => {
        removeItem(options, option);
        return options;
      });
  }, []);

  const context = useMemo(
    () => ({
      kbs,
      registerOption,
      selected,
      selectOption,
      disabled,
      multiple,
    }),
    [kbs, registerOption, selected, selectOption, disabled, multiple]
  );

  useEffect(() => {
    if (!multiple && selected.length > 1) {
      setSelectedState([selected[0]]);
    }
  }, [multiple, selected]);

  const clear = useCallback(() => setSelectedState([]), []);

  const toggle = useCallback(
    (index, select) => {
      const option = options[index];
      const isSelected = selected.includes(option);
      if (select && isSelected) {
        return;
      }
      const shouldSelect = select ?? !isSelected;
      if (shouldSelect) {
        selectOption(option);
      } else {
        setSelectedState((selected) => selected.filter((v) => v != option));
      }
    },
    [options, setSelectedState, selectOption, selected]
  );

  /**
   * This method updates the selected state by modifying at most one value of
   * the current selected state by the given delta.
   * The modification is done in FIFO order. When no values are selected,
   * the new selected state becomes the option at the given delta.
   *
   * ex: (1, [0, 2], [0, 1, 2, 3]) => [2, 1]
   * ex: (-1, [2, 1], [0, 1, 2, 3]) => [1]
   * ex: (2, [2, 1], [0, 1, 2, 3]) => [1, 0]
   * ex: (-1, [], [0, 1, 2, 3]) => [3]
   */
  const selectBy = useCallback(
    (delta) => {
      const previous = options.indexOf(selected.shift());

      // If previousIndex === -1 is true, then a negative delta will be offset
      // one more than is wanted when looping back around in the options.
      // This occurs when no options are selected and "selectUp" is called.
      const selectUpWhenNoneSelected = previous === -1 && delta < 0;
      const index = selectUpWhenNoneSelected ? delta : previous + delta;
      const option = options[mod(index, options.length)];
      selectOption(option);
    },
    [selected, selectOption, options]
  );

  useImperativeHandle(
    ref,
    () =>
      /** @type {!SelectorDef.SelectorApi} */ ({
        clear,
        toggle,
        selectBy,
      }),
    [clear, toggle, selectBy]
  );

  const onKeyDown = useCallback(
    (e) => {
      if (kbs === KEYBOARD_SELECT_MODE.SELECT) {
        const {key} = e;
        switch (key) {
          case Keys.LEFT_ARROW: // Fallthrough.
          case Keys.UP_ARROW:
            selectBy(-1);
            break;
          case Keys.RIGHT_ARROW: // Fallthrough.
          case Keys.DOWN_ARROW:
            selectBy(1);
            break;
          default:
            break;
        }
      }
      if (customOnKeyDown) {
        customOnKeyDown(e);
      }
    },
    [customOnKeyDown, kbs, selectBy]
  );

  return (
    <Comp
      {...rest}
      role={role}
      aria-disabled={disabled}
      aria-multiselectable={multiple}
      disabled={disabled}
      multiple={multiple}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex ?? kbs === KEYBOARD_SELECT_MODE.SELECT ? '0' : '-1'}
    >
      <SelectorContext.Provider value={context}>
        {children}
      </SelectorContext.Provider>
    </Comp>
  );
}

const Selector = forwardRef(SelectorWithRef);
Selector.displayName = 'Selector'; // Make findable for tests.
export {Selector};

/**
 * @param {!SelectorDef.OptionProps} props
 * @return {PreactDef.Renderable}
 */
export function Option({
  as: Comp = 'div',
  disabled = false,
  onClick: customOnClick,
  onKeyDown: customOnKeyDown,
  option,
  role = 'option',
  style,
  tabIndex,
  ...rest
}) {
  const {
    disabled: selectorDisabled,
    multiple: selectorMultiple,
    kbs,
    registerOption,
    selected,
    selectOption,
  } = useContext(SelectorContext);

  const trySelect = useCallback(() => {
    if (selectorDisabled || disabled) {
      return;
    }
    selectOption(option);
  }, [disabled, option, selectOption, selectorDisabled]);

  const onClick = useCallback(
    (e) => {
      trySelect();
      if (customOnClick) {
        customOnClick(e);
      }
    },
    [customOnClick, trySelect]
  );

  const onKeyDown = useCallback(
    (e) => {
      if (kbs !== KEYBOARD_SELECT_MODE.FOCUS) {
        return;
      }
      if (e.key === Keys.ENTER || e.key === Keys.Space) {
        trySelect();
      }
      if (customOnKeyDown) {
        customOnKeyDown(e);
      }
    },
    [customOnKeyDown, kbs, trySelect]
  );

  useEffect(() => {
    if (registerOption) {
      return registerOption(option);
    }
  }, [registerOption, option]);

  const isSelected =
    /** @type {!Array} */ (selected).includes(option) && !disabled;
  const statusStyle =
    disabled || selectorDisabled
      ? CSS.DISABLED
      : isSelected
      ? selectorMultiple
        ? CSS.MULTI_SELECTED
        : CSS.SELECTED
      : CSS.OPTION;
  const optionProps = {
    ...rest,
    disabled,
    'aria-disabled': String(disabled),
    onClick,
    onKeyDown,
    option,
    role,
    selected: isSelected,
    'aria-selected': String(isSelected),
    style: {...statusStyle, ...style},
    tabIndex: tabIndex ?? kbs === KEYBOARD_SELECT_MODE.SELECT ? '-1' : '0',
  };
  return <Comp {...optionProps} />;
}
