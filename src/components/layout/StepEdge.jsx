import { useMemo } from "react";
import { BaseEdge, getSmoothStepPath, useStore } from "reactflow";
import { collectObstacleRects, findAvoidingSmoothStepPath } from "../../utils/stepPathAvoidNodes";

/** Clearance from handle along edge direction before first bend (capped shorter on small spans). */
const DEFAULT_OFFSET = 36;
const MIN_OFFSET = 12;
/** Extra space around each node’s box so routes don’t graze other nodes. */
const OBSTACLE_MARGIN = 14;

export default function StepEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  markerStart,
  pathOptions,
}) {
  const nodes = useStore((s) => s.nodes);

  const obstacleRects = useMemo(
    () => collectObstacleRects(nodes, source, target, OBSTACLE_MARGIN),
    [nodes, source, target]
  );

  const span = Math.hypot(targetX - sourceX, targetY - sourceY);
  const offsetCap = Math.max(MIN_OFFSET, Math.min(DEFAULT_OFFSET, span * 0.32));
  const offset =
    pathOptions?.offset != null ? pathOptions.offset : offsetCap;

  const path = useMemo(
    () =>
      findAvoidingSmoothStepPath({
        getSmoothStepPath,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        offset,
        obstacleRects,
      }),
    [
      obstacleRects,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      offset,
    ]
  );

  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerEnd={markerEnd}
      markerStart={markerStart}
    />
  );
}
