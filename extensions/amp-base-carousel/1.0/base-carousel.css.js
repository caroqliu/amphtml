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

export const slideElement = {
  flex: '0 0 100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  scrollSnapAlign: 'start',
  scrollSnapStop: 'always',
};

export const scrollContainer = {
  height: '100%',
  position: 'relative',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflowX: 'auto',
  overflowY: 'hidden',
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  scrollBehavior: 'smooth',
  WebkitOverflowScrolling: 'touch',
  scrollSnapType: 'x mandatory',
};

export const arrowPlacement = {
  position: 'absolute',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  // Center the button vertically.
  top: '50%',
  transform: 'translateY(-50%)',
  alignItems: 'center',
};

export const defaultArrowButton = {
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '36px',
  height: '36px',
  padding: 0,
  margin: '12px',
  backgroundColor: 'transparent',
  border: 'none',
  outline: 'none',
  stroke: 'currentColor',
  transition: '200ms stroke',
};

export const arrowBaseStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  borderRadius: '50%',
};

export const frosting = {
  backdropFilter: 'blur(3px)',
};

export const backdrop = {
  backdropFilter: 'blur(12px) invert(1) grayscale(0.6) brightness(0.8)',
  opacity: 0.5,
};

export const arrowBackground = {
  boxShadow: `0 0 0px 1px rgba(0, 0, 0, 0.08) inset,
      0 1px 4px 1px rgba(0, 0, 0, 0.2)`,
  transition: '200ms background-color',
};

export const arrowIcon = {
  position: 'relative',
  width: '24px',
  height: '24px',
};

/*
 * Styles to hide scrollbars, with three different methods:
 *
 * 1. scrollbar-width
 *  - Note: this is actually scrollbar *thickness* and applies to horizontal
 *    scrollbars as well
 * 2. ::-webkit-scrollbar
 * 3. Using padding to push scrollbar outside of the overflow
 *
 * The last method has side-effect of having the bottom of the slides being
 * cut-off, since the height (or width) of the scrollbar is included when
 * calculating the 100% height (or width) of the slide.
 */
/* Firefox */
export const hideScrollbar = {
  scrollbarWidth: 'none',
};
/* Chrome, Safari */
const hideScrollbarPseudo = `[hide-scrollbar]::-webkit-scrollbar {
  display: none;
  box-sizing: content-box !important;
  }`;
export const horizontalScroll = {
  flexDirection: 'row',
  /* Firefox, IE */
  scrollSnapTypeX: 'mandatory',
  scrollSnapType: 'x mandatory',
  /* Hide scrollbar */
  marginBottom: '-20px',
  paddingBottom: '20px',
  overflowY: 'hidden',
};

/** Slides only have one child */
const slideSizing = `
.i-amphtml-carousel-slide > :first-child, .i-amphtml-carousel-slide > ::slotted(*) {
  box-sizing: border-box !important;
  margin: 0 !important;
  flex-shrink: 0 !important;
  max-height: 100%;
  max-width: 100%;
}
.i-amphtml-carousel-slide > ::slotted(*) {
  width: 100%;
}`;
export const scrollerStyles = hideScrollbarPseudo + slideSizing;

/** Styles for pagination indicators. */
export const paginationContainer = {
  fontSize: '12px',
  /*
   * TODO(https://github.com/ampproject/amphtml/issues/25888)
   * Use a better, common set of fonts for sans-serif.
   */
  fontFamily: 'sans-serif',
  lineHeight: 1,
  display: 'flex',
  flexDirection: 'column',
};

export const insetPaginationContainer = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  margin: '18px',
};

export const paginationDots = {
  position: 'relative',
  alignSelf: 'center',
  zIndex: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  maxWidth: '60%',
};
export const insetPaginationDots = {
  padding: '0 4px',
};

export const paginationDotContainer = {
  position: 'relative',
  zIndex: 1,
  display: 'flex',
  width: '16px',
  minWidth: '14px',
  justifyContent: 'center',
};

export const paginationDot = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  position: 'relative',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
};
export const insetPaginationDot = {
  backgroundColor: 'rgba(255, 255, 255, 0.35)',
};

export const paginationDotProgress = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  position: 'absolute',
  top: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
};

export const insetPaginationDotProgress = {
  backgroundColor: '#fff',
};

export const insetPaginationBaseStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: '12px',
};

export const insetPaginationBackground = {
  ...insetPaginationBaseStyle,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
};

export const paginationNumbers = {
  position: 'relative',
  alignSelf: 'flex-end',
  zIndex: 0,
  display: 'flex',
  alignItems: 'center',
  height: '100%',
  padding: '0 8px',
};
