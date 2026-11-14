/**
 * Checks whether an edge connects node u and node v in an undirected edge list.
 * @param {Array<[string, string]>} edgeList
 * @param {string} u
 * @param {string} v
 * @returns {boolean}
 */
export function edgeMatchesList(edgeList, u, v) {
  if (!edgeList || !Array.isArray(edgeList)) return false;
  return edgeList.some(
    (e) => (e[0] === u && e[1] === v) || (e[1] === u && e[0] === v)
  );
}

/**
 * Extracts distinct floor sequence in traversal order from a path of node IDs.
 * @param {Array<Object>} nodes
 * @param {Array<string>} path
 * @returns {Array<string>}
 */
export function getFloorSequence(nodes, path) {
  if (!path || !Array.isArray(path) || !nodes) return [];
  const seq = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  path.forEach((id) => {
    const node = nodeMap.get(id);
    const floor = node?.floor;
    if (floor && seq[seq.length - 1] !== floor) {
      seq.push(floor);
    }
  });

  return seq;
}
