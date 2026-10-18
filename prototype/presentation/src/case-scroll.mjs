// Every viewport reserves scroll distance for the complete tour before history.
export function caseScrollGeometry(height, sceneCount, compact = false) {
  const step = height * 0.88;
  const trackHeight = (sceneCount - 1) * step + height * (compact ? 1 : 1.6);
  return {
    step,
    trackHeight,
    historyStart: compact ? trackHeight : trackHeight - height * 1.1,
    sceneCount,
  };
}

export function caseScrollPosition(scrollY, geometry) {
  return {
    history: scrollY >= geometry.historyStart,
    index: Math.max(
      0,
      Math.min(geometry.sceneCount - 1, Math.round(scrollY / geometry.step)),
    ),
  };
}

// Mobile browser bars resize the viewport while a native scroll is in flight.
// Keep the tour's document height stable until its width (or scene count) changes.
export function resizeCaseScroll(
  previous,
  width,
  height,
  sceneCount,
  scrollY = 0,
) {
  const keep =
    width < 1000 &&
    previous?.width === width &&
    previous.geometry.sceneCount === sceneCount;
  const geometry = keep
    ? previous.geometry
    : caseScrollGeometry(height, sceneCount, width < 1000);
  let scrollTop = null;
  if (
    previous &&
    (Math.abs(previous.geometry.step - geometry.step) > 1 ||
      Math.abs(previous.geometry.trackHeight - geometry.trackHeight) > 1)
  ) {
    scrollTop = caseScrollPosition(scrollY, previous.geometry).history
      ? scrollY + geometry.trackHeight - previous.geometry.trackHeight
      : (scrollY / previous.geometry.step) * geometry.step;
  }
  return { width, geometry, scrollTop };
}
