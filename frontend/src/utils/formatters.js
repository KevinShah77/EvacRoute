/**
 * Formats a duration in seconds into human-readable string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || seconds < 0) {
    return '0 sec';
  }
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;

  if (mins === 0) return `${secs} sec`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs} sec`;
}

/**
 * Formats distance with meters unit.
 * @param {number} meters
 * @returns {string}
 */
export function formatDistance(meters) {
  if (meters === null || meters === undefined || meters < 0) return '0m';
  return `${Math.round(meters)}m`;
}
