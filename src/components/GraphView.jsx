import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icons.jsx";

const palette = ["#1fbca0", "#f9735b", "#f2b84b", "#7467f0", "#2f9de4", "#d05ce3", "#6abf69"];
const nodeRadius = 31;
const padding = 84;

function getNodeGroups(dfa, partitions) {
  if (partitions?.length) {
    return partitions;
  }

  if (dfa.groups?.length) {
    return dfa.groups;
  }

  return dfa.states.map((state) => [state]);
}

function getStateGroupIndex(state, dfa, groups) {
  const directIndex = groups.findIndex((group) => group.includes(state));
  if (directIndex >= 0) {
    return directIndex;
  }

  const minimizedIndex = dfa.states.indexOf(state);
  return minimizedIndex >= 0 ? minimizedIndex : 0;
}

function useGraphSize(containerRef, compact) {
  const [size, setSize] = useState({ width: compact ? 520 : 920, height: compact ? 360 : 620 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({
        width: Math.max(compact ? 420 : 640, Math.round(rect.width)),
        height: Math.max(compact ? 320 : 460, Math.round(rect.height)),
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [compact, containerRef]);

  return size;
}

function groupEdges(dfa) {
  const edgeMap = new Map();

  dfa.states.forEach((source) => {
    dfa.alphabet.forEach((symbol) => {
      const target = dfa.transitions[source]?.[symbol];
      if (!target) {
        return;
      }

      const key = `${source}->${target}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { source, target, symbols: [] });
      }
      edgeMap.get(key).symbols.push(symbol);
    });
  });

  return [...edgeMap.values()];
}

function buildFlowAnchors(dfa, size) {
  const anchors = {};

  if (dfa.states.length === 1) {
    anchors[dfa.states[0]] = { x: size.width / 2, y: size.height / 2 };
    return anchors;
  }

  const adjacency = new Map(dfa.states.map((state) => [state, new Set()]));
  dfa.states.forEach((state) => {
    dfa.alphabet.forEach((symbol) => {
      const target = dfa.transitions[state]?.[symbol];
      if (adjacency.has(target)) {
        adjacency.get(state).add(target);
      }
    });
  });

  const levels = new Map();
  const start = dfa.states.includes(dfa.start) ? dfa.start : dfa.states[0];
  levels.set(start, 0);
  const queue = [start];

  while (queue.length) {
    const state = queue.shift();
    const currentLevel = levels.get(state);
    adjacency.get(state)?.forEach((target) => {
      if (!levels.has(target)) {
        levels.set(target, currentLevel + 1);
        queue.push(target);
      }
    });
  }

  const lastReachableLevel = levels.size ? Math.max(...levels.values()) : 0;
  dfa.states.forEach((state, index) => {
    if (!levels.has(state)) {
      levels.set(state, lastReachableLevel + 1 + (index % 2));
    }
  });

  const buckets = new Map();
  dfa.states.forEach((state) => {
    const level = levels.get(state) ?? 0;
    if (!buckets.has(level)) {
      buckets.set(level, []);
    }
    buckets.get(level).push(state);
  });

  const sortedLevels = [...buckets.keys()].sort((a, b) => a - b);
  const maxLevel = Math.max(...sortedLevels, 1);
  const innerWidth = Math.max(180, size.width - padding * 2);
  const innerHeight = Math.max(180, size.height - padding * 2);

  sortedLevels.forEach((level) => {
    const states = buckets.get(level);
    const x = padding + (level / maxLevel) * innerWidth;
    const spacing = innerHeight / (states.length + 1);

    states.forEach((state, index) => {
      anchors[state] = {
        x: clamp(x, padding, size.width - padding),
        y: clamp(padding + spacing * (index + 1), padding, size.height - padding),
      };
    });
  });

  return anchors;
}

function edgeGeometry(edge, positions, hasReverse, index, size) {
  const source = positions[edge.source];
  const target = positions[edge.target];

  if (!source || !target) {
    return null;
  }

  if (edge.source === edge.target) {
    const loopDirection = source.y < size.height * 0.32 ? 1 : -1;
    const loopSize = 58;
    const startY = source.y + loopDirection * 27;
    const controlY = source.y + loopDirection * 102;
    const endY = source.y + loopDirection * 27;

    return {
      path: `M ${source.x - 16} ${startY} C ${source.x - loopSize} ${controlY}, ${
        source.x + loopSize
      } ${controlY}, ${source.x + 16} ${endY}`,
      labelX: source.x,
      labelY: clamp(source.y + loopDirection * 90, 28, size.height - 28),
    };
  }

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const unitX = dx / length;
  const unitY = dy / length;
  const startX = source.x + unitX * nodeRadius;
  const startY = source.y + unitY * nodeRadius;
  const endX = target.x - unitX * nodeRadius;
  const endY = target.y - unitY * nodeRadius;
  const normalX = -unitY;
  const normalY = unitX;
  const curve = hasReverse ? (index % 2 === 0 ? 70 : -70) : Math.min(44, Math.max(18, length * 0.16));
  const controlX = clamp((startX + endX) / 2 + normalX * curve, 36, size.width - 36);
  const controlY = clamp((startY + endY) / 2 + normalY * curve, 36, size.height - 36);

  return {
    path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
    labelX: controlX,
    labelY: controlY,
  };
}

function clonePositions(positions) {
  return Object.fromEntries(Object.entries(positions).map(([state, point]) => [state, { ...point }]));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampPoint(point, size) {
  return {
    x: clamp(point.x, nodeRadius + 24, size.width - nodeRadius - 24),
    y: clamp(point.y, nodeRadius + 24, size.height - nodeRadius - 24),
  };
}

export function GraphView({
  dfa,
  partitions = [],
  activeGroups = [],
  title,
  subtitle,
  compact = false,
  exportRef,
}) {
  const markerId = useId().replaceAll(":", "");
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const positionsRef = useRef({});
  const velocitiesRef = useRef({});
  const anchorsRef = useRef({});
  const activeGroupsRef = useRef(activeGroups);
  const draggingRef = useRef(null);
  const size = useGraphSize(containerRef, compact);
  const [nodes, setNodes] = useState({});
  const [selected, setSelected] = useState(dfa.start);
  const [dragging, setDragging] = useState(null);
  const stateGroups = getNodeGroups(dfa, partitions);
  const activeStates = new Set(activeGroups.flat());
  const edges = useMemo(() => groupEdges(dfa), [dfa]);
  const edgeKeys = new Set(edges.map((edge) => `${edge.source}->${edge.target}`));

  const resetLayout = useCallback(() => {
    const anchors = buildFlowAnchors(dfa, size);
    const resetPositions = {};
    const resetVelocities = {};

    dfa.states.forEach((state) => {
      resetPositions[state] = clampPoint(anchors[state] ?? { x: size.width / 2, y: size.height / 2 }, size);
      resetVelocities[state] = { x: 0, y: 0 };
    });

    anchorsRef.current = anchors;
    positionsRef.current = resetPositions;
    velocitiesRef.current = resetVelocities;
    setNodes(clonePositions(resetPositions));
  }, [dfa, size]);

  const setSvgNode = useCallback(
    (node) => {
      svgRef.current = node;
      if (typeof exportRef === "function") {
        exportRef(node);
      } else if (exportRef) {
        exportRef.current = node;
      }
    },
    [exportRef],
  );

  useEffect(() => {
    activeGroupsRef.current = activeGroups;
  }, [activeGroups]);

  useEffect(() => {
    if (!dfa.states.includes(selected)) {
      setSelected(dfa.start);
    }
  }, [dfa.start, dfa.states, selected]);

  useEffect(() => {
    const anchors = buildFlowAnchors(dfa, size);
    const previous = positionsRef.current;
    const nextPositions = {};
    const nextVelocities = {};

    dfa.states.forEach((state) => {
      const point = previous[state] ?? anchors[state] ?? { x: size.width / 2, y: size.height / 2 };
      nextPositions[state] = clampPoint(point, size);
      nextVelocities[state] = velocitiesRef.current[state] ?? { x: 0, y: 0 };
    });

    anchorsRef.current = anchors;
    positionsRef.current = nextPositions;
    velocitiesRef.current = nextVelocities;
    setNodes(clonePositions(nextPositions));
  }, [dfa, size]);

  useEffect(() => {
    let frame = 0;
    let lastCommit = 0;

    const tick = (time) => {
      const positions = positionsRef.current;
      const velocities = velocitiesRef.current;
      const anchors = anchorsRef.current;
      const states = dfa.states;
      const forces = Object.fromEntries(states.map((state) => [state, { x: 0, y: 0 }]));

      states.forEach((first, firstIndex) => {
        states.slice(firstIndex + 1).forEach((second) => {
          const a = positions[first];
          const b = positions[second];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distance = Math.max(34, Math.hypot(dx, dy));
          const strength = 3000 / (distance * distance);
          const fx = (dx / distance) * strength;
          const fy = (dy / distance) * strength;
          forces[first].x -= fx;
          forces[first].y -= fy;
          forces[second].x += fx;
          forces[second].y += fy;
        });
      });

      edges.forEach((edge) => {
        if (edge.source === edge.target) {
          return;
        }

        const a = positions[edge.source];
        const b = positions[edge.target];
        if (!a || !b) {
          return;
        }

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const targetLength = compact ? 118 : 150;
        const strength = (distance - targetLength) * 0.008;
        const fx = (dx / distance) * strength;
        const fy = (dy / distance) * strength;
        forces[edge.source].x += fx;
        forces[edge.source].y += fy;
        forces[edge.target].x -= fx;
        forces[edge.target].y -= fy;
      });

      activeGroupsRef.current.forEach((group) => {
        if (group.length < 2 || group.length === states.length) {
          return;
        }

        const points = group.map((state) => positions[state]).filter(Boolean);
        if (points.length < 2) {
          return;
        }

        const center = {
          x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
          y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
        };

        group.forEach((state) => {
          if (!positions[state] || !forces[state]) {
            return;
          }
          forces[state].x += (center.x - positions[state].x) * 0.016;
          forces[state].y += (center.y - positions[state].y) * 0.016;
        });
      });

      states.forEach((state) => {
        const point = positions[state];
        const anchor = anchors[state] ?? { x: size.width / 2, y: size.height / 2 };
        const isDragging = draggingRef.current?.state === state;
        forces[state].x += (anchor.x - point.x) * 0.016;
        forces[state].y += (anchor.y - point.y) * 0.016;

        if (isDragging) {
          velocities[state] = { x: 0, y: 0 };
          return;
        }

        const velocity = velocities[state] ?? { x: 0, y: 0 };
        velocity.x = (velocity.x + forces[state].x) * 0.84;
        velocity.y = (velocity.y + forces[state].y) * 0.84;
        positions[state] = clampPoint(
          {
            x: point.x + velocity.x,
            y: point.y + velocity.y,
          },
          size,
        );
        velocities[state] = velocity;
      });

      if (time - lastCommit > 32) {
        setNodes(clonePositions(positions));
        lastCommit = time;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [compact, dfa.states, edges, size]);

  const getPointerPoint = (event) => {
    const svg = svgRef.current;
    if (!svg) {
      return { x: size.width / 2, y: size.height / 2 };
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const transform = svg.getScreenCTM();
    if (!transform) {
      return { x: size.width / 2, y: size.height / 2 };
    }

    return clampPoint(point.matrixTransform(transform.inverse()), size);
  };

  const beginDrag = (event, state) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    draggingRef.current = { state, pointerId: event.pointerId };
    setDragging(state);
    setSelected(state);
    velocitiesRef.current[state] = { x: 0, y: 0 };
  };

  const moveDrag = (event, state) => {
    if (draggingRef.current?.state !== state) {
      return;
    }

    const point = getPointerPoint(event);
    positionsRef.current[state] = point;
    setNodes(clonePositions(positionsRef.current));
  };

  const endDrag = (event, state) => {
    if (draggingRef.current?.state !== state) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    } catch {
      // The pointer can already be released if the browser cancelled the drag.
    }
    draggingRef.current = null;
    setDragging(null);
  };

  return (
    <div
      ref={containerRef}
      className="graph-canvas relative h-full min-h-[320px] overflow-hidden rounded-md border border-[color:var(--line)] bg-[color:var(--graph-panel)]"
    >
      <div className="absolute left-4 top-4 z-10 max-w-[68%] rounded-md border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-[color:var(--ink)]">{subtitle}</p> : null}
      </div>

      <button className="graph-reflow-button" onClick={resetLayout} title="Reflow graph" type="button">
        <Icon name="refresh" className="h-4 w-4" />
      </button>

      <svg
        ref={setSvgNode}
        className="h-full w-full touch-none"
        role="img"
        viewBox={`0 0 ${size.width} ${size.height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker
            id={`arrow-${markerId}`}
            markerHeight="9"
            markerWidth="9"
            orient="auto"
            refX="7"
            refY="3"
            viewBox="0 0 10 6"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill="var(--edge)" />
          </marker>
        </defs>
        <rect fill="var(--graph-panel)" height={size.height} width={size.width} />

        {stateGroups
          .filter((group) => group.length > 1)
          .map((group, index) => {
            const groupPositions = group.map((state) => nodes[state]).filter(Boolean);
            if (!groupPositions.length) {
              return null;
            }

            const centerX = groupPositions.reduce((sum, point) => sum + point.x, 0) / groupPositions.length;
            const centerY = groupPositions.reduce((sum, point) => sum + point.y, 0) / groupPositions.length;
            const radius =
              Math.max(...groupPositions.map((point) => Math.hypot(point.x - centerX, point.y - centerY))) + 54;

            return (
              <motion.circle
                key={`${group.join("-")}-${index}`}
                animate={{ opacity: [0.1, 0.25, 0.1], r: [radius - 4, radius, radius - 4] }}
                cx={centerX}
                cy={centerY}
                fill={palette[index % palette.length]}
                initial={{ opacity: 0, r: radius - 12 }}
                stroke={palette[index % palette.length]}
                strokeDasharray="7 9"
                strokeWidth="1.5"
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />
            );
          })}

        {edges.map((edge, index) => {
          const hasReverse = edgeKeys.has(`${edge.target}->${edge.source}`) && edge.source !== edge.target;
          const geometry = edgeGeometry(edge, nodes, hasReverse, index, size);
          if (!geometry) {
            return null;
          }

          const label = edge.symbols.join(", ");
          const labelWidth = Math.max(44, label.length * 8 + 18);

          return (
            <g key={`${edge.source}-${edge.target}`}>
              <path
                className="graph-edge"
                d={geometry.path}
                fill="none"
                markerEnd={`url(#arrow-${markerId})`}
                stroke="var(--edge)"
                strokeWidth="2"
              />
              <path className="graph-edge-flow" d={geometry.path} fill="none" strokeWidth="2.4" />
              <circle className="graph-edge-token" r="3.2">
                <animateMotion
                  begin={`${index * 0.16}s`}
                  dur={`${2.4 + (index % 3) * 0.35}s`}
                  path={geometry.path}
                  repeatCount="indefinite"
                />
              </circle>
              <g transform={`translate(${geometry.labelX} ${geometry.labelY})`}>
                <rect fill="var(--edge-label-bg)" height="24" rx="5" width={labelWidth} x={-labelWidth / 2} y="-12" />
                <text
                  className="select-none text-[11px] font-semibold"
                  fill="var(--edge-label)"
                  textAnchor="middle"
                  y="4"
                >
                  {label}
                </text>
              </g>
            </g>
          );
        })}

        {dfa.start && nodes[dfa.start] ? (
          <motion.path
            animate={{ opacity: 1, x: [0, 6, 0] }}
            d={`M ${nodes[dfa.start].x - 88} ${nodes[dfa.start].y} L ${nodes[dfa.start].x - 40} ${
              nodes[dfa.start].y
            }`}
            fill="none"
            initial={{ opacity: 0 }}
            markerEnd={`url(#arrow-${markerId})`}
            stroke="var(--start)"
            strokeWidth="2.6"
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}

        {dfa.states.map((state) => {
          const point = nodes[state];
          if (!point) {
            return null;
          }

          const groupIndex = getStateGroupIndex(state, dfa, stateGroups);
          const color = palette[groupIndex % palette.length];
          const isFinal = dfa.finals.includes(state);
          const isActive = activeStates.has(state) || selected === state;
          const label = dfa.labels?.[state] ?? state;
          const shortState = state.length > 8 ? `${state.slice(0, 7)}...` : state;
          const stateFontSize = state.length > 7 ? 10 : 13;

          return (
            <g
              key={state}
              className="cursor-grab active:cursor-grabbing"
              onPointerCancel={(event) => endDrag(event, state)}
              onPointerDown={(event) => beginDrag(event, state)}
              onPointerMove={(event) => moveDrag(event, state)}
              onPointerUp={(event) => endDrag(event, state)}
              style={{ touchAction: "none" }}
              transform={`translate(${point.x} ${point.y})`}
            >
              <motion.g animate={{ scale: isActive ? 1.07 : 1 }} transition={{ type: "spring", stiffness: 240, damping: 20 }}>
                {isActive ? (
                  <motion.circle
                    animate={{ opacity: [0.14, 0.34, 0.14], r: [38, 48, 38] }}
                    fill={color}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                ) : null}
                <circle fill="var(--node)" r={nodeRadius} stroke={color} strokeWidth="3" />
                {isFinal ? <circle fill="none" r="24" stroke={color} strokeWidth="2" /> : null}
                <text
                  className="select-none font-bold"
                  fill="var(--node-text)"
                  fontSize={stateFontSize}
                  textAnchor="middle"
                  y={label.length > 7 ? -2 : 5}
                >
                  {shortState}
                </text>
                {label !== state ? (
                  <text
                    className="select-none font-semibold"
                    fill="var(--muted)"
                    fontSize="9"
                    textAnchor="middle"
                    y="15"
                  >
                    {label.length > 12 ? `${label.slice(0, 11)}...` : label}
                  </text>
                ) : null}
              </motion.g>
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-xs text-[color:var(--muted)] backdrop-blur-xl">
        <span>
          Start: <strong className="text-[color:var(--ink)]">{dfa.start}</strong>
        </span>
        <span>
          Final: <strong className="text-[color:var(--ink)]">{dfa.finals.join(", ") || "none"}</strong>
        </span>
        <span>
          {dragging ? "Dragging" : "Drag nodes"}:{" "}
          <strong className="text-[color:var(--ink)]">{dragging || selected}</strong>
        </span>
      </div>
    </div>
  );
}
