/**
 * Validates whether a value is a valid TCP/UDP port number (1 - 65535).
 * @param {string|number} port
 * @returns {number} The parsed port number if valid.
 * @throws {Error} If the port is invalid or out of range.
 */
export function validatePort(port) {
  const parsed = Number(port);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid port: "${port}". Port must be an integer between 1 and 65535.`);
  }

  return parsed;
}

/**
 * Validates whether a process ID is a positive integer.
 * @param {string|number} pid
 * @returns {number} The parsed PID.
 * @throws {Error} If invalid.
 */
export function validatePid(pid) {
  const parsed = Number(pid);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid PID: "${pid}". PID must be a positive integer.`);
  }

  return parsed;
}

/**
 * Validates search query strings.
 * @param {string} query
 * @returns {string} Cleaned query string.
 */
export function validateSearchQuery(query) {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Search query must be a non-empty string.');
  }

  return query.trim();
}
