/**
 * Outputs data as formatted JSON to stdout.
 * @param {any} data
 */
export function outputJson(data) {
  console.log(JSON.stringify(data, null, 2));
}
