import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatedBackground } from "./components/AnimatedBackground.jsx";
import { GraphView } from "./components/GraphView.jsx";
import { Icon } from "./components/Icons.jsx";
import { InputPanel } from "./components/InputPanel.jsx";
import { StepPanel } from "./components/StepPanel.jsx";
import { StringChecker } from "./components/StringChecker.jsx";
import { TransitionTable } from "./components/TransitionTable.jsx";
import { Tooltip } from "./components/Tooltip.jsx";
import { examples } from "./data/examples.js";
import { minimizeDfa, normalizeDfa } from "./utils/dfa.js";

const graphModes = [
  { id: "original", label: "Original" },
  { id: "minimized", label: "Minimized" },
  { id: "compare", label: "Compare" },
];

function App() {
  const initialDfa = useMemo(() => normalizeDfa(examples[1].dfa), []);
  const [theme, setTheme] = useState(() => localStorage.getItem("dfa-theme") || "dark");
  const [screen, setScreen] = useState("landing");
  const [draftDfa, setDraftDfa] = useState(initialDfa);
  const [dfa, setDfa] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [graphMode, setGraphMode] = useState("original");
  const [checkerHighlight, setCheckerHighlight] = useState(null);
  const graphExportRef = useRef(null);
  const result = useMemo(() => (dfa ? minimizeDfa(dfa) : null), [dfa]);
  const currentStep = result?.steps[currentStepIndex] ?? result?.steps[0] ?? null;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("dfa-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!result) {
      setCurrentStepIndex(0);
      setPlaying(false);
      return;
    }

    setCurrentStepIndex((index) => Math.min(index, Math.max(0, result.steps.length - 1)));
  }, [result]);

  useEffect(() => {
    if (!playing || !result || result.steps.length < 2) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentStepIndex((index) => {
        if (index >= result.steps.length - 1) {
          setPlaying(false);
          return index;
        }
        return index + 1;
      });
    }, 2200 / speed);

    return () => window.clearInterval(timer);
  }, [playing, result, speed]);

  const stepBackward = () => setCurrentStepIndex((index) => Math.max(0, index - 1));
  const stepForward = () =>
    setCurrentStepIndex((index) => Math.min(Math.max(0, (result?.steps.length ?? 1) - 1), index + 1));

  const applyDfa = (nextDfa) => {
    setDfa(normalizeDfa(nextDfa));
    setCurrentStepIndex(0);
    setPlaying(false);
    setGraphMode("original");
  };

  const exportJson = () => {
    if (!result?.minimizedDfa) {
      return;
    }

    const blob = new Blob([JSON.stringify(result.minimizedDfa, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    downloadUrl(url, "minimized-dfa.json");
  };

  const exportImage = () => {
    const svg = graphExportRef.current;
    if (!svg) {
      return;
    }

    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(clone);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svg.viewBox.baseVal.width * 2;
      canvas.height = svg.viewBox.baseVal.height * 2;
      const context = canvas.getContext("2d");
      context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--graph-panel");
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((pngBlob) => {
        const pngUrl = URL.createObjectURL(pngBlob);
        downloadUrl(pngUrl, "dfa-graph.png");
      });
    };

    image.src = url;
  };

  return (
    <div className="min-h-screen text-[color:var(--ink)]">
      <AnimatedBackground />
      <ThemeToggle theme={theme} setTheme={setTheme} />

      <AnimatePresence mode="wait">
        {screen === "landing" ? (
          <LandingPage key="landing" onStart={() => setScreen("visualizer")} />
        ) : (
          <VisualizerPage
            key="visualizer"
            checkerHighlight={checkerHighlight}
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            dfa={dfa}
            draftDfa={draftDfa}
            exportImage={exportImage}
            exportJson={exportJson}
            graphExportRef={graphExportRef}
            graphMode={graphMode}
            hasAppliedDfa={Boolean(dfa)}
            onApplyDfa={applyDfa}
            playing={playing}
            result={result}
            setCheckerHighlight={setCheckerHighlight}
            setCurrentStepIndex={setCurrentStepIndex}
            setDraftDfa={setDraftDfa}
            setGraphMode={setGraphMode}
            setPlaying={setPlaying}
            setScreen={setScreen}
            setSpeed={setSpeed}
            speed={speed}
            stepBackward={stepBackward}
            stepForward={stepForward}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LandingPage({ onStart }) {
  const features = [
    {
      icon: "split",
      title: "Step partitioning",
      text: "Watch final/non-final groups refine until every block is stable.",
    },
    {
      icon: "graph",
      title: "Animated graph",
      text: "Start, final, equivalent, and merged states are highlighted in motion.",
    },
    {
      icon: "table",
      title: "Live tables",
      text: "Transition signatures and minimized output update with each step.",
    },
  ];

  return (
    <motion.main
      animate={{ opacity: 1, y: 0 }}
      className="landing-page"
      exit={{ opacity: 0, y: -24 }}
      initial={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.55 }}
    >
      <section className="landing-hero">
        <div className="landing-copy">
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-2 text-sm font-semibold text-[color:var(--teal)] backdrop-blur-xl"
            initial={{ opacity: 0, y: 12 }}
            transition={{ delay: 0.1 }}
          >
            <Icon name="spark" className="h-4 w-4" />
            Partition refinement, made visible
          </motion.p>
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl text-4xl font-black leading-[1.05] text-[color:var(--ink)] sm:text-6xl xl:text-7xl"
            initial={{ opacity: 0, y: 18 }}
            transition={{ delay: 0.18 }}
          >
            DFA Minimization Visualizer
          </motion.h1>
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 max-w-2xl text-lg leading-8 text-[color:var(--muted)]"
            initial={{ opacity: 0, y: 18 }}
            transition={{ delay: 0.26 }}
          >
            A deterministic finite automaton accepts or rejects strings by following exactly one transition for each
            input symbol. Minimization removes duplicate behavior, producing the smallest DFA that recognizes the same
            language.
          </motion.p>
          <motion.button
            animate={{ opacity: 1, y: 0 }}
            className="primary-button mt-8"
            initial={{ opacity: 0, y: 18 }}
            onClick={onStart}
            transition={{ delay: 0.34 }}
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.98 }}
          >
            Start Visualizing
            <Icon name="arrow" className="h-5 w-5" />
          </motion.button>
        </div>

        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="landing-preview"
          initial={{ opacity: 0, scale: 0.92 }}
          transition={{ delay: 0.24, duration: 0.55 }}
        >
          <div className="preview-toolbar">
            <span>DFA flow</span>
            <strong>{"5 states -> 3 states"}</strong>
          </div>
          <svg className="landing-preview-svg" role="img" viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="landingArrow" markerHeight="10" markerWidth="10" orient="auto" refX="8" refY="5" viewBox="0 0 10 10">
                <path d="M0 0 L10 5 L0 10 Z" fill="var(--edge)" />
              </marker>
              <linearGradient id="landingEdge" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="var(--teal)" />
                <stop offset="100%" stopColor="var(--coral)" />
              </linearGradient>
            </defs>
            <path className="preview-start-edge" d="M42 202 L104 202" markerEnd="url(#landingArrow)" />
            <path className="preview-edge preview-edge-main" d="M170 202 C245 104 338 104 414 202" markerEnd="url(#landingArrow)" />
            <path className="preview-edge preview-edge-alt" d="M170 218 C244 322 336 322 414 218" markerEnd="url(#landingArrow)" />
            <path className="preview-edge preview-edge-main" d="M480 202 C528 166 556 166 590 202" markerEnd="url(#landingArrow)" />
            <path className="preview-loop" d="M470 168 C424 82 536 82 492 168" markerEnd="url(#landingArrow)" />
            <path className="preview-loop" d="M148 236 C98 318 218 318 170 236" markerEnd="url(#landingArrow)" />
            <g className="preview-node-svg preview-node-start-svg" transform="translate(138 202)">
              <circle r="38" />
              <text y="5">q0</text>
            </g>
            <g className="preview-node-svg preview-node-final-svg" transform="translate(448 202)">
              <circle r="38" />
              <circle r="29" />
              <text y="5">q1</text>
            </g>
            <g className="preview-node-svg preview-node-merge-svg" transform="translate(306 112)">
              <circle r="32" />
              <text y="5">q2</text>
            </g>
            <g className="preview-node-svg preview-node-soft-svg" transform="translate(306 292)">
              <circle r="32" />
              <text y="5">q3</text>
            </g>
            <g className="preview-badge" transform="translate(226 186)">
              <rect height="44" rx="8" width="188" />
              <text x="94" y="18">equivalent block</text>
              <text x="94" y="34">{"{q2, q3}"}</text>
            </g>
          </svg>
          <div className="preview-caption">
            <span>Equivalent states</span>
            <strong>{"{q2, q3}"}</strong>
          </div>
        </motion.div>
      </section>

      <section className="landing-features">
        {features.map((feature, index) => (
          <motion.article
            key={feature.title}
            animate={{ opacity: 1, y: 0 }}
            className="feature-card"
            initial={{ opacity: 0, y: 24 }}
            transition={{ delay: 0.4 + index * 0.08 }}
            whileHover={{ y: -6 }}
          >
            <div className="feature-icon">
              <Icon name={feature.icon} className="h-5 w-5" />
            </div>
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </motion.article>
        ))}
      </section>
    </motion.main>
  );
}

function VisualizerPage({
  checkerHighlight,
  currentStep,
  currentStepIndex,
  dfa,
  draftDfa,
  exportImage,
  exportJson,
  graphExportRef,
  graphMode,
  hasAppliedDfa,
  onApplyDfa,
  playing,
  result,
  setCheckerHighlight,
  setCurrentStepIndex,
  setDraftDfa,
  setGraphMode,
  setPlaying,
  setScreen,
  setSpeed,
  speed,
  stepBackward,
  stepForward,
}) {
  return (
    <motion.main
      animate={{ opacity: 1, y: 0 }}
      className="visualizer-page mx-auto flex min-h-screen w-full max-w-[1920px] flex-col gap-4 px-4 py-4 sm:px-5"
      exit={{ opacity: 0, y: 24 }}
      initial={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.45 }}
    >
      <header className="glass-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <button
            className="mb-1 text-sm font-semibold text-[color:var(--teal)] transition hover:text-[color:var(--coral)]"
            onClick={() => setScreen("landing")}
            type="button"
          >
            DFA Minimization Visualizer
          </button>
          <p className="text-sm text-[color:var(--muted)]">
            {result
              ? `Step ${currentStepIndex + 1} of ${result.steps.length}: ${currentStep?.title}`
              : "No DFA rendered yet. Draft input is ready."}
          </p>
        </div>
        <PlaybackControls
          currentStepIndex={currentStepIndex}
          exportImage={exportImage}
          exportJson={exportJson}
          playing={playing}
          result={result}
          setCurrentStepIndex={setCurrentStepIndex}
          setPlaying={setPlaying}
          setSpeed={setSpeed}
          speed={speed}
          stepBackward={stepBackward}
          stepForward={stepForward}
        />
      </header>

      {result?.errors.length ? (
        <div className="glass-panel p-5 text-[color:var(--coral)]">
          <h2 className="text-xl font-bold">DFA needs attention</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {result.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── Top 3-column row ── */}
      <section className="visualizer-grid grid min-h-0 gap-4 xl:grid-cols-[360px_minmax(0,1fr)_420px]">
        <InputPanel dfa={draftDfa} hasAppliedDfa={hasAppliedDfa} onApply={onApplyDfa} setDfa={setDraftDfa} />

        <section className="glass-panel graph-shell p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="panel-kicker">Graph Visualization</p>
              <h2 className="panel-title">Original vs minimized DFA</h2>
            </div>
            <div className="segmented-control">
              {graphModes.map((mode) => (
                <button
                  key={mode.id}
                  className={graphMode === mode.id ? "active" : ""}
                  onClick={() => setGraphMode(mode.id)}
                  type="button"
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {!result ? (
            <EmptyGraphState />
          ) : result.errors.length ? (
            <div className="grid h-[520px] place-items-center text-center text-[color:var(--muted)]">
              Complete the DFA definition to render the graph.
            </div>
          ) : (
            <GraphStage
              currentStep={currentStep}
              graphExportRef={graphExportRef}
              graphMode={graphMode}
              result={result}
            />
          )}
        </section>

        {!result ? (
          <div className="glass-panel p-4 text-sm text-[color:var(--muted)]">
            Partition steps will appear after the first DFA is created.
          </div>
        ) : result.errors.length ? (
          <div className="glass-panel p-4 text-sm text-[color:var(--muted)]">
            Step details will appear after the DFA is complete.
          </div>
        ) : (
          <StepPanel
            currentStepIndex={currentStepIndex}
            result={result}
            setCurrentStepIndex={setCurrentStepIndex}
          />
        )}
      </section>

      {/* ── Bottom row: Transition table + String checker ── */}
      <section className="bottom-row grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <TransitionTable dfa={dfa} highlightState={checkerHighlight} />
        <StringChecker dfa={dfa} onStateChange={setCheckerHighlight} />
      </section>
    </motion.main>
  );
}

function GraphStage({ currentStep, graphExportRef, graphMode, result }) {
  if (graphMode === "compare") {
    return (
      <div className="graph-stage compare">
        <GraphView
          activeGroups={currentStep.activeGroups}
          dfa={result.workingDfa}
          partitions={currentStep.partitions}
          subtitle={currentStep.title}
          title="Original DFA"
        />
        <GraphView
          dfa={result.minimizedDfa}
          exportRef={graphExportRef}
          subtitle={`${result.workingDfa.states.length} -> ${result.minimizedDfa.states.length} states`}
          title="Minimized DFA"
        />
      </div>
    );
  }

  if (graphMode === "minimized") {
    return (
      <div className="graph-stage">
        <GraphView
          dfa={result.minimizedDfa}
          exportRef={graphExportRef}
          subtitle={`${result.workingDfa.states.length} -> ${result.minimizedDfa.states.length} states`}
          title="Minimized DFA"
        />
      </div>
    );
  }

  return (
    <div className="graph-stage">
      <GraphView
        activeGroups={currentStep.activeGroups}
        dfa={result.workingDfa}
        exportRef={graphExportRef}
        partitions={currentStep.partitions}
        subtitle={currentStep.title}
        title="Original DFA"
      />
    </div>
  );
}

function EmptyGraphState() {
  return (
    <div className="empty-graph-state">
      <div className="empty-graph-icon">
        <Icon name="graph" className="h-7 w-7" />
      </div>
      <h3>Create a DFA to preview the diagram</h3>
      <p>The graph, partition table, and minimized output will appear here after the draft becomes a DFA.</p>
    </div>
  );
}

function PlaybackControls({
  currentStepIndex,
  exportImage,
  exportJson,
  playing,
  result,
  setCurrentStepIndex,
  setPlaying,
  setSpeed,
  speed,
  stepBackward,
  stepForward,
}) {
  const hasResult = Boolean(result && result.errors.length === 0);
  const isLastStep = !hasResult || currentStepIndex === result.steps.length - 1;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="control-cluster">
        <button
          className="icon-button"
          disabled={!hasResult || currentStepIndex === 0}
          onClick={stepBackward}
          title="Previous step"
        >
          <Icon name="prev" />
        </button>
        <button
          className="icon-button primary"
          disabled={!hasResult}
          onClick={() => setPlaying(!playing)}
          title={playing ? "Pause" : "Play"}
        >
          <Icon name={playing ? "pause" : "play"} stroke={false} />
        </button>
        <button
          className="icon-button"
          disabled={isLastStep}
          onClick={stepForward}
          title="Next step"
        >
          <Icon name="next" />
        </button>
        <button
          className="icon-button"
          disabled={!hasResult}
          onClick={() => {
            setCurrentStepIndex(0);
            setPlaying(false);
          }}
          title="Restart"
        >
          <Icon name="refresh" />
        </button>
      </div>

      <label className="speed-control">
        <span>{speed.toFixed(1)}x</span>
        <input
          max="2"
          min="0.5"
          step="0.1"
          type="range"
          value={speed}
          disabled={!hasResult}
          onChange={(event) => setSpeed(Number(event.target.value))}
        />
      </label>

      <div className="control-cluster">
        <button className="icon-button" disabled={!hasResult} onClick={exportImage} title="Export graph image">
          <Icon name="download" />
        </button>
        <button className="icon-button" disabled={!hasResult} onClick={exportJson} title="Export minimized JSON">
          <Icon name="code" />
        </button>
        <Tooltip side="left" text="Play through minimization, step manually, adjust speed, or export the visible graph and minimized DFA JSON." />
      </div>
    </div>
  );
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      className="fixed right-4 top-4 z-50 grid h-11 w-11 place-items-center rounded-full border border-[color:var(--line)] bg-[color:var(--panel-strong)] text-[color:var(--ink)] shadow-lg backdrop-blur-xl transition hover:scale-105 hover:border-[color:var(--teal)]"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      type="button"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} />
    </button>
  );
}

function downloadUrl(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export default App;
