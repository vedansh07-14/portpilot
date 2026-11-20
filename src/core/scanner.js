import { getPlatformAdapter } from '../platform/index.js';
import { normalizePortRecords } from './normalizer.js';
import { validatePort } from '../utils/validation.js';

/**
 * Scans listening TCP ports across the system.
 *
 * @param {object} [options]
 * @param {number|string} [options.port] - Filter by specific port
 * @param {object} [options.adapter] - Optional custom platform adapter
 * @returns {Promise<Array<object>>}
 */
export async function scanPorts(options = {}) {
  let targetPort = null;
  if (options.port !== undefined && options.port !== null) {
    targetPort = validatePort(options.port);
  }

  const adapter = options.adapter || getPlatformAdapter();
  const rawResults = await adapter.scan(targetPort);

  return normalizePortRecords(rawResults);
}
