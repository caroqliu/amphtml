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

import {createElement, useEffect, useRef, useState} from '../../../src/preact';
import {timeago} from '../../../third_party/timeagojs/timeago';
import {useResourcesNotify} from '../../../src/preact/utils';

/**
 * @param {!JsonObject} props
 * @return {Preact.Renderable}
 */
export function Timeago(props) {
  const {1: setIsIntersecting} = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    const observer = new IntersectionObserver(entries => {
      const last = entries[entries.length - 1];
      setIsIntersecting(last.isIntersecting);
    });
    if (node) {
      observer.observe(node);
    }
    return () => observer.disconnect();
  }, []);

  useResourcesNotify();
  return createElement(
    'time',
    {datetime: props['datetime'], ref},
    getFuzzyTimestampValue(props)
  );
}

/**
 * @param {!JsonObject} props
 * @return {string}
 */
function getFuzzyTimestampValue(props) {
  const {
    'datetime': datetime,
    'locale': locale,
    'cutoff': cutoff,
    'cutoffText': cutoffText,
  } = props;
  if (!cutoff) {
    return timeago(datetime, locale);
  }
  const elDate = new Date(datetime);
  const secondsAgo = Math.floor((Date.now() - elDate.getTime()) / 1000);

  if (secondsAgo > cutoff) {
    return cutoffText;
  }
  return timeago(datetime, locale);
}
