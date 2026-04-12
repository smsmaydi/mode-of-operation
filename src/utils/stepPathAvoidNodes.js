/**
 * Nudge smooth-step paths so sampled points stay outside other nodes' bounds (+ margin).
 */

const DEFAULT_NODE_W = 188;
const DEFAULT_NODE_H = 102;

export function collectObstacleRects(nodes, excludeSourceId, excludeTargetId, margin) {
  if (!nodes?.length) return [];
  const rects = [];
  for (const n of nodes) {
    if (!n || n.id === excludeSourceId || n.id === excludeTargetId) continue;
    if (n.hidden) continue;
    // Parent cluster frames span the whole column; treating them as obstacles hides cross-column edges.
    if (n.type === "blockcluster") continue;
    const pos = n.positionAbsolute ?? n.position;
    if (pos == null) continue;
    const w = typeof n.width === "number" && n.width > 0 ? n.width : DEFAULT_NODE_W;
    const h = typeof n.height === "number" && n.height > 0 ? n.height : DEFAULT_NODE_H;
    rects.push({
      x: pos.x - margin,
      y: pos.y - margin,
      w: w + 2 * margin,
      h: h + 2 * margin,
    });
  }
  return rects;
}

function pointInAnyRect(x, y, rects) {
  for (const r of rects) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

/** Sample SVG path; ignore ends so handle-adjacent samples on endpoint nodes are not flagged. */
export function pathSamplesClearObstacles(pathD, obstacleRects, trimStart = 0.07, trimEnd = 0.93) {
  if (!obstacleRects.length || typeof document === "undefined") return true;
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  try {
    const len = path.getTotalLength();
    if (!len || !Number.isFinite(len)) return true;
    const steps = Math.min(140, Math.max(28, Math.ceil(len / 6)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      if (t < trimStart || t > trimEnd) continue;
      const p = path.getPointAtLength(t * len);
      if (pointInAnyRect(p.x, p.y, obstacleRects)) return false;
    }
    return true;
  } catch {
    return true;
  }
}

function edgeCenterLikeRf(sourceX, sourceY, targetX, targetY) {
  const xOffset = Math.abs(targetX - sourceX) / 2;
  const centerX = targetX < sourceX ? targetX + xOffset : targetX - xOffset;
  const yOffset = Math.abs(targetY - sourceY) / 2;
  const centerY = targetY < sourceY ? targetY + yOffset : targetY - yOffset;
  return [centerX, centerY];
}

function buildCenterAttempts(sourceX, sourceY, targetX, targetY) {
  const [bcx, bcy] = edgeCenterLikeRf(sourceX, sourceY, targetX, targetY);
  const dist = Math.hypot(targetX - sourceX, targetY - sourceY);
  /** Short hops: prefer bends near the segment midpoint instead of large detours. */
  const shortEdge = dist < 380;
  const seen = new Set();
  const out = [];

  const push = (cx, cy) => {
    const k = `${cx ?? "d"},${cy ?? "d"}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ centerX: cx, centerY: cy });
  };

  push(undefined, undefined);
  push(bcx, bcy);

  const deltas = shortEdge
    ? [24, -24, 40, -40, 56, -56, 72, -72]
    : [64, -64, 128, -128, 192, -192];
  for (const dx of deltas) {
    for (const dy of deltas) {
      if (dx === 0 && dy === 0) continue;
      push(bcx + dx, bcy + dy);
    }
  }
  const cardinals = shortEdge ? [48, 72, 96] : [96, 176, 256];
  for (const s of cardinals) {
    push(bcx + s, bcy);
    push(bcx - s, bcy);
    push(bcx, bcy + s);
    push(bcx, bcy - s);
  }
  return out;
}

/**
 * @param {typeof import('reactflow').getSmoothStepPath} getSmoothStepPath
 */
export function findAvoidingSmoothStepPath({
  getSmoothStepPath,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  offset,
  obstacleRects,
}) {
  const argsBase = {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
    offset,
  };

  if (!obstacleRects.length) {
    return getSmoothStepPath(argsBase)[0];
  }

  const attempts = buildCenterAttempts(sourceX, sourceY, targetX, targetY);
  let fallback = null;

  for (const { centerX, centerY } of attempts) {
    const params =
      centerX == null && centerY == null
        ? argsBase
        : { ...argsBase, centerX, centerY };
    const [path] = getSmoothStepPath(params);
    if (fallback == null) fallback = path;
    if (pathSamplesClearObstacles(path, obstacleRects)) {
      return path;
    }
  }

  return fallback;
}
