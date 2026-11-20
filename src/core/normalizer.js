/**
 * Normalizes and groups port scan results into standard records.
 *
 * @param {Array<object>} rawRecords
 * @returns {Array<object>}
 */
export function normalizePortRecords(rawRecords) {
  if (!Array.isArray(rawRecords)) return [];

  const map = new Map();

  for (const raw of rawRecords) {
    if (!raw || typeof raw.port !== 'number' || isNaN(raw.port)) continue;

    const key = `${raw.port}:${raw.pid ?? 'unknown'}`;
    const cleanProcessName = raw.processName
      ? raw.processName.trim().split('/').pop().split('\\').pop()
      : 'unknown';

    if (!map.has(key)) {
      map.set(key, {
        port: raw.port,
        protocol: (raw.protocol || 'TCP').toUpperCase(),
        pid: typeof raw.pid === 'number' ? raw.pid : (parseInt(raw.pid, 10) || null),
        processName: cleanProcessName,
        command: raw.command || cleanProcessName,
        status: (raw.status || 'LISTENING').toUpperCase(),
        addresses: raw.address ? [raw.address] : [],
        user: raw.user || null
      });
    } else {
      const existing = map.get(key);
      if (raw.address && !existing.addresses.includes(raw.address)) {
        existing.addresses.push(raw.address);
      }
      if (!existing.user && raw.user) {
        existing.user = raw.user;
      }
      if (existing.processName === 'unknown' && cleanProcessName !== 'unknown') {
        existing.processName = cleanProcessName;
      }
    }
  }

  // Sort by port ascending, then pid ascending
  return Array.from(map.values()).sort((a, b) => {
    if (a.port !== b.port) return a.port - b.port;
    return (a.pid || 0) - (b.pid || 0);
  });
}
