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
import {ArrowNext, ArrowPrev} from './arrow';
import {Scroller} from './scroller';
import {createRef, toChildArray, useState} from '../../../src/preact';
import {forwardRef} from '../../../src/preact/compat';
import {useMountEffect} from '../../../src/preact/utils';

/**
 * @param {!BaseCarouselDef.Props} props
 * @return {PreactDef.Renderable}
 */
export function BaseCarousel({
  arrowPrev,
  arrowNext,
  children,
  loop,
  onSlideChange,
  setAdvance,
  ...rest
}) {
  const childrenArray = toChildArray(children);
  const {length} = childrenArray;
  const [curSlide, setCurSlide] = useState(0);
  const scrollRef = createRef();
  const advance = (dir) => {
    const container = scrollRef.current;
    // Modify scrollLeft is preferred to `setCurSlide` to enable smooth scroll.
    // Note: `setCurSlide` will still be called on debounce by scroll handler.
    container./* OK */ scrollLeft += container./* OK */ offsetWidth * dir;
  };
  useMountEffect(() => {
    if (setAdvance) {
      setAdvance(advance);
    }
  });

  const setRestingIndex = (i) => {
    setCurSlide(i);
    if (onSlideChange) {
      onSlideChange(i);
    }
  };
  const disableForDir = (dir) =>
    !loop && (curSlide + dir < 0 || curSlide + dir >= length);
  return (
    <div {...rest}>
      <ScrollerWithRef
        loop={loop}
        restingIndex={curSlide}
        setRestingIndex={setRestingIndex}
        ref={scrollRef}
      >
        {childrenArray}
      </ScrollerWithRef>
      <ArrowPrev
        customArrow={arrowPrev}
        disabled={disableForDir(-1)}
        advance={advance}
      />
      <ArrowNext
        customArrow={arrowNext}
        disabled={disableForDir(1)}
        advance={advance}
      />
    </div>
  );
}

const ScrollerWithRef = forwardRef((props, ref) =>
  Scroller(/** @type {BaseCarouselDef.ScrollerProps} */ ({ref, ...props}))
);
ScrollerWithRef.displayName = 'Scroller'; // Make findable for tests.
