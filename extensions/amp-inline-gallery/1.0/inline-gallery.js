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
import {CarouselContext} from '../../amp-base-carousel/1.0/carousel-context';
import {ContainWrapper} from '../../../src/preact/component';
import {setStyle} from '../../../src/style';
import {useCallback, useMemo, useRef, useState} from '../../../src/preact';

/**
 * @param {!InlineGalleryDef.Props} props
 * @return {PreactDef.Renderable}
 */
export function InlineGallery({children, ...rest}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const ref = useRef();

  const setTopDistance = useCallback((topDistance) => {
    if (!ref.current) {
      return;
    }
    setStyle(ref.current, '--top-distance', topDistance);
  }, []);

  const carouselContext = useMemo(
    () => ({
      currentSlide,
      setCurrentSlide,
      setTopDistance,
      slides,
      setSlides,
    }),
    [currentSlide, slides, setTopDistance]
  );
  return (
    <ContainWrapper size={false} layout={true} ref={ref} {...rest}>
      <CarouselContext.Provider value={carouselContext}>
        {children}
      </CarouselContext.Provider>
    </ContainWrapper>
  );
}
