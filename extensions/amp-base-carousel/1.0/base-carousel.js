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
import {Arrow} from './arrow';
import {CarouselContext} from './carousel-context';
import {ContainWrapper} from '../../../src/preact/component';
import {Scroller} from './scroller';
import {WithAmpContext} from '../../../src/preact/context';
import {debounce} from '../../../src/utils/rate-limit';
import {forwardRef} from '../../../src/preact/compat';
import {
  toChildArray,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from '../../../src/preact';

/**
 * @enum {string}
 */
const Controls = {
  ALWAYS: 'always',
  NEVER: 'never',
  AUTO: 'auto',
};

/**
 * @enum {string}
 */
const Interaction = {
  MOUSE: 'mouse',
  TOUCH: 'touch',
  NONE: 'none',
};

const MIN_AUTO_ADVANCE_INTERVAL = 1000;

/**
 * @param {!BaseCarouselDef.Props} props
 * @param {{current: (!BaseCarouselDef.CarouselApi|null)}} ref
 * @return {PreactDef.Renderable}
 */
function BaseCarouselWithRef(
  {
    advanceCount = 1,
    arrowPrev,
    arrowNext,
    autoAdvance = false,
    autoAdvanceCount = 1,
    autoAdvanceInterval: customAutoAdvanceInterval = MIN_AUTO_ADVANCE_INTERVAL,
    autoAdvanceLoops = Number.POSITIVE_INFINITY,
    children,
    controls = Controls.AUTO,
    loop,
    mixedLength = false,
    onSlideChange,
    outsetArrows,
    snap = true,
    visibleCount = 1,
    ...rest
  },
  ref
) {
  const childrenArray = toChildArray(children);
  const {length} = childrenArray;
  const carouselContext = useContext(CarouselContext);
  const [currentSlideState, setCurrentSlideState] = useState(0);
  const currentSlide = carouselContext.currentSlide ?? currentSlideState;
  const setCurrentSlide =
    carouselContext.setCurrentSlide ?? setCurrentSlideState;
  const {setSlideCount} = carouselContext;
  const scrollRef = useRef(null);
  const containRef = useRef(null);
  const contentRef = useRef(null);
  const shouldAutoAdvance = useRef(autoAdvance);
  const autoAdvanceTimesRef = useRef(0);
  const autoAdvanceInterval = useMemo(
    () => Math.max(customAutoAdvanceInterval, MIN_AUTO_ADVANCE_INTERVAL),
    [customAutoAdvanceInterval]
  );

  // Strictly used for autoadvancing.
  const advance = useCallback(
    (by, currentSlide) => {
      // autoAdvanceTimesRef counts number of slide advances, whereas
      // autoAdvanceLoops limits the number of advancements through the entire
      // set of slides. Thus, we adjust the limit by the # of slides available.
      // The visibleCount demarcates the "end" of the slides, i.e. when there
      // are 5 slides with 3 visible at once, you need only advance twice
      // ([1][2][3] -> [2][3][4] -> [3][4][5]) to reach the adjusted end.
      if (
        autoAdvanceTimesRef.current >=
        length * autoAdvanceLoops - visibleCount
      ) {
        shouldAutoAdvance.current = false;
        return;
      }
      if (loop || currentSlide + visibleCount < length) {
        scrollRef.current.advance(by); // Advance forward by specified count
      } else {
        scrollRef.current.advance(-(length - 1)); // Advance in reverse to first slide
      }
      autoAdvanceTimesRef.current += by;
    },
    [autoAdvanceLoops, length, loop, visibleCount]
  );
  const next = useCallback(() => scrollRef.current.next(), []);
  const prev = useCallback(() => scrollRef.current.prev(), []);
  const setRestingIndex = useCallback(
    (index) => {
      index = length > 0 ? Math.min(Math.max(index, 0), length - 1) : -1;
      if (index < 0) {
        return;
      }
      setCurrentSlide(index);
      if (onSlideChange) {
        onSlideChange(index);
      }
    },
    [length, setCurrentSlide, onSlideChange]
  );

  useImperativeHandle(
    ref,
    () =>
      /** @type {!BaseCarouselDef.CarouselApi} */ ({
        goToSlide: (index) => setRestingIndex(index),
        next,
        prev,
        root: containRef.current,
        node: contentRef.current,
      }),
    [next, prev, setRestingIndex]
  );

  useLayoutEffect(() => {
    setSlideCount(length);
  }, [setSlideCount, length]);

  const disableForDir = (dir) =>
    !loop &&
    (currentSlide + dir < 0 ||
      (!mixedLength && currentSlide + visibleCount + dir > length));

  const [interaction, setInteraction] = useState(Interaction.NONE);
  const hideControls = useMemo(() => {
    if (controls === Controls.ALWAYS || outsetArrows) {
      return false;
    }
    if (controls === Controls.NEVER) {
      return true;
    }
    return interaction === Interaction.TOUCH;
  }, [interaction, controls, outsetArrows]);

  const debouncedAdvance = useMemo(
    () =>
      debounce(
        window,
        (currentSlide) => {
          advance(autoAdvanceCount, currentSlide);
        },
        autoAdvanceInterval
      ),
    [autoAdvanceCount, autoAdvanceInterval, advance]
  );
  useEffect(() => {
    if (interaction !== Interaction.NONE || !shouldAutoAdvance.current) {
      return;
    }
    debouncedAdvance(currentSlide);
  });

  return (
    <ContainWrapper
      size={true}
      layout={true}
      paint={true}
      contentStyle={{display: 'flex'}}
      ref={containRef}
      contentRef={contentRef}
      {...rest}
    >
      {!hideControls && (
        <Arrow
          advance={prev}
          by={-advanceCount}
          customArrow={arrowPrev}
          disabled={disableForDir(-1)}
          outsetArrows={outsetArrows}
        />
      )}
      <Scroller
        advanceCount={advanceCount}
        autoAdvanceCount={autoAdvanceCount}
        loop={loop}
        mixedLength={mixedLength}
        restingIndex={currentSlide}
        setRestingIndex={setRestingIndex}
        snap={snap}
        ref={scrollRef}
        onTouchStart={() => setInteraction(Interaction.TOUCH)}
        onMouseEnter={() => setInteraction(Interaction.MOUSE)}
        visibleCount={mixedLength ? 1 : visibleCount}
      >
        {/*
          TODO(#30283): TBD: this is an interesting concept. We could decide
          to render only N slides at a time and for others just output an empty
          placeholder. When a slide's slot is unrendered, the slide
          automatically gets unslotted and gets CanRender=false w/o any extra
          state management code.

          Note: We naively display all slides for mixedLength as multiple
          can be visible within the carousel viewport - eventually these can also
          be optimized to only display the minimum necessary for the current 
          and next viewport.
        */}
        {childrenArray.map((child, index) =>
          Math.abs(index - currentSlide) < visibleCount * 3 || mixedLength ? (
            <WithAmpContext
              key={index}
              renderable={index == currentSlide}
              playable={index == currentSlide}
            >
              {child}
            </WithAmpContext>
          ) : (
            <></>
          )
        )}
      </Scroller>
      {!hideControls && (
        <Arrow
          advance={next}
          by={advanceCount}
          customArrow={arrowNext}
          disabled={disableForDir(1)}
          outsetArrows={outsetArrows}
        />
      )}
    </ContainWrapper>
  );
}

const BaseCarousel = forwardRef(BaseCarouselWithRef);
BaseCarousel.displayName = 'BaseCarousel'; // Make findable for tests.
export {BaseCarousel};
