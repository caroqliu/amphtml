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
import * as styles from './base-carousel.css';
import {ArrowNext, ArrowPrev} from './arrow';
import {
  createRef,
  toChildArray,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from '../../../src/preact';
import {debounce} from '../../../src/utils/rate-limit';
import {forwardRef} from '../../../src/preact/compat';
import {mod} from '../../../src/utils/math';
import {renderSlides} from './slides';
import {setStyle} from '../../../src/style';
import {useMountEffect} from '../../../src/preact/utils';

/**
 * How long to wait prior to resetting the scrolling position after the last
 * scroll event. Ideally this should be low, so that once the user stops
 * scrolling, things are immediately centered again. Since there can be some
 * delay between scroll events, and we do not want to interrupt a scroll with a
 * render, it cannot be too small. 200ms seems to be around the lower limit for
 * this value on Android / iOS.
 */
const RESET_SCROLL_REFERENCE_POINT_WAIT_MS = 200;

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
  const ref = createRef(null);
  const advance = (dir) => {
    const container = ref.current;
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
      <Scroller
        loop={loop}
        restingIndex={curSlide}
        setRestingIndex={setRestingIndex}
        ref={ref}
      >
        {childrenArray}
      </Scroller>
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

/**
 * @param {!BaseCarouselDef.ScrollerProps} props
 * @return {PreactDef.Renderable}
 */
const Scroller = forwardRef(
  ({children, loop, restingIndex, setRestingIndex}, ref) => {
    /**
     * The number of slides we want to place before the
     * reference or resting index. Only needed if loop=true.
     */
    const pivotIndex = Math.floor(children.length / 2);

    /**
     * The dynamic position that the slide at the resting index
     * is with respect to its scrolling order. Only needed if loop=true.
     */
    const offsetRef = useRef(restingIndex);
    const ignoreProgrammaticScrollRef = useRef(true);
    const slides = renderSlides({
      children,
      loop,
      offsetRef,
      pivotIndex,
      restingIndex,
    });
    const currentIndex = useRef(restingIndex);

    // useLayoutEffect needed to avoid FOUC while scrolling
    useLayoutEffect(() => {
      if (!ref.current) {
        return;
      }
      const container = ref.current;
      ignoreProgrammaticScrollRef.current = true;
      setStyle(container, 'scrollBehavior', 'auto');
      container./* OK */ scrollLeft = loop
        ? container./* OK */ offsetWidth * pivotIndex
        : container./* OK */ offsetWidth * restingIndex;
      setStyle(container, 'scrollBehavior', 'smooth');
    }, [loop, restingIndex, pivotIndex, ref]);

    // Trigger render by setting the resting index to the current scroll state.
    const debouncedResetScrollReferencePoint = useMemo(
      () =>
        debounce(
          window,
          () => {
            // Check if the resting index we are centered around is the same as where
            // we stopped scrolling. If so, we do not need to move anything.
            if (
              currentIndex.current === null ||
              currentIndex.current === restingIndex
            ) {
              return;
            }
            ignoreProgrammaticScrollRef.current = true;
            setRestingIndex(currentIndex.current);
          },
          RESET_SCROLL_REFERENCE_POINT_WAIT_MS
        ),
      [restingIndex, setRestingIndex]
    );

    // Track current slide without forcing render.
    // This is necessary for smooth scrolling because
    // intermediary renders will interupt scroll and cause jank.
    const updateCurrentIndex = () => {
      const container = ref.current;
      const slideOffset = Math.round(
        (container./* OK */ scrollLeft -
          offsetRef.current * container./* OK */ offsetWidth) /
          container./* OK */ offsetWidth
      );
      currentIndex.current = mod(slideOffset, children.length);
    };

    const handleScroll = () => {
      if (ignoreProgrammaticScrollRef.current) {
        ignoreProgrammaticScrollRef.current = false;
        return;
      }
      updateCurrentIndex();
      debouncedResetScrollReferencePoint();
    };

    return (
      <div
        hide-scrollbar
        key="container"
        ref={ref}
        onScroll={handleScroll}
        style={{
          ...styles.scrollContainer,
          ...styles.hideScrollbar,
          ...styles.horizontalScroll,
        }}
        tabindex={0}
      >
        {slides}
      </div>
    );
  }
);
