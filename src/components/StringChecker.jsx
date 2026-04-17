import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons.jsx";

/** Run a DFA on a string and return the full trace */
function runDfa(dfa, input) {
  const symbols = input === "" ? [] : input.split("");
  const trace = [{ state: dfa.start, symbol: null, index: -1 }];
  let current = dfa.start;

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const next = dfa.transitions[current]?.[symbol];
    if (next === undefined || next === "") {
      return { trace, accepted: false, stuck: true, stuckAt: i };
    }
    current = next;
    trace.push({ state: next, symbol, index: i });
  }

  return {
    trace,
    accepted: dfa.finals.includes(current),
    stuck: false,
    stuckAt: -1,
  };
}

export function StringChecker({ dfa, onStateChange }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef(null);
  const tapeRef = useRef(null);

  const symbols = input === "" ? [] : input.split("");
  const alphabet = dfa?.alphabet ?? [];

  // Sync active state to parent for table highlight
  useEffect(() => {
    if (!result || activeIndex < 0) {
      onStateChange?.(null);
    } else {
      onStateChange?.(result.trace[activeIndex]?.state ?? null);
    }
  }, [activeIndex, result, onStateChange]);

  const check = () => {
    if (!dfa) return;
    clearInterval(intervalRef.current);
    setPlaying(false);
    const res = runDfa(dfa, input);
    setResult(res);
    setActiveIndex(-1);
  };

  const animate = () => {
    if (!result) return;
    setActiveIndex(-1);
    setPlaying(true);
  };

  // Drive the animation
  useEffect(() => {
    if (!playing || !result) return;
    let step = 0;
    setActiveIndex(0);
    intervalRef.current = setInterval(() => {
      step += 1;
      if (step >= result.trace.length) {
        setActiveIndex(result.trace.length - 1);
        setPlaying(false);
        clearInterval(intervalRef.current);
      } else {
        setActiveIndex(step);
      }
    }, 520);
    return () => clearInterval(intervalRef.current);
  }, [playing, result]);

  // Scroll active tape cell into view
  useEffect(() => {
    if (activeIndex <= 0 || !tapeRef.current) return;
    const cells = tapeRef.current.querySelectorAll(".tape-cell");
    cells[activeIndex - 1]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeIndex]);

  const reset = () => {
    clearInterval(intervalRef.current);
    setResult(null);
    setActiveIndex(-1);
    setPlaying(false);
    setInput("");
  };

  const currentState = activeIndex >= 0 && result ? result.trace[activeIndex]?.state : null;
  const hasResult = result !== null;
  const isAccepted = hasResult && result.accepted && !result.stuck;

  const handleKey = (e) => {
    if (e.key === "Enter") check();
  };

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel string-checker-panel"
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.42 }}
    >
      {/* Header */}
      <div className="sc-header">
        <div>
          <p className="panel-kicker">String Simulation</p>
          <h2 className="panel-title">Test input string</h2>
        </div>
        <div className="sc-alphabet-chips">
          {alphabet.map((s) => (
            <span key={s} className="sc-alpha-chip">{s}</span>
          ))}
        </div>
      </div>

      {/* Input row */}
      <div className="sc-input-row">
        <div className="sc-input-wrap">
          <input
            className="sc-input"
            disabled={!dfa}
            maxLength={60}
            placeholder={dfa ? `Type symbols from {${alphabet.join(", ")}}…` : "Create a DFA first"}
            spellCheck={false}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setResult(null);
              setActiveIndex(-1);
              clearInterval(intervalRef.current);
              setPlaying(false);
            }}
            onKeyDown={handleKey}
          />
          {input && (
            <span className="sc-char-count">{symbols.length} symbol{symbols.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <button className="primary-button sc-check-btn" disabled={!dfa} onClick={check} type="button">
          <Icon name="play" stroke={false} className="h-4 w-4" />
          Check
        </button>
        {hasResult && (
          <button className="icon-button" onClick={animate} disabled={playing} title="Animate" type="button">
            <Icon name="spark" className="h-4 w-4" />
          </button>
        )}
        {hasResult && (
          <button className="icon-button" onClick={reset} title="Reset" type="button">
            <Icon name="refresh" className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tape + result */}
      <AnimatePresence mode="wait">
        {hasResult && (
          <motion.div
            key="checker-body"
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            initial={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="sc-body"
          >
            {/* Tape */}
            <div className="sc-tape-wrap" ref={tapeRef}>
              {/* Empty string indicator */}
              {symbols.length === 0 && (
                <div className="sc-empty-tape">ε (empty string)</div>
              )}

              {/* Symbol cells */}
              {symbols.map((sym, i) => {
                const traceStep = i + 1; // trace[0] is initial state, trace[i+1] is after reading symbol i
                const isActive = activeIndex === traceStep;
                const isPast = activeIndex > traceStep;
                const isInvalid = result.stuck && result.stuckAt === i;
                return (
                  <div
                    key={i}
                    className={`tape-cell ${isActive ? "tape-active" : ""} ${isPast ? "tape-past" : ""} ${isInvalid ? "tape-invalid" : ""}`}
                  >
                    <span className="tape-symbol">{sym}</span>
                    <span className="tape-idx">{i}</span>
                  </div>
                );
              })}
            </div>

            {/* State path */}
            <div className="sc-path-row">
              {result.trace.map((step, i) => {
                const isActive = activeIndex === i || (activeIndex === -1 && i === result.trace.length - 1 && !playing);
                const isFinal = dfa.finals.includes(step.state);
                const isStart = dfa.start === step.state;
                return (
                  <div key={i} className="sc-path-step">
                    {i > 0 && (
                      <div className="sc-path-arrow">
                        <span className="sc-path-sym">{step.symbol}</span>
                        <Icon name="arrow" className="h-3 w-3 text-[color:var(--muted)]" />
                      </div>
                    )}
                    <motion.div
                      animate={isActive ? { scale: 1.15, y: -3 } : { scale: 1, y: 0 }}
                      className={`sc-state-bubble
                        ${isActive ? "sc-state-active" : ""}
                        ${isFinal ? "sc-state-final" : ""}
                        ${isStart && i === 0 ? "sc-state-start" : ""}
                        ${result.stuck && i === result.trace.length - 1 ? "sc-state-stuck" : ""}
                      `}
                      title={`${isStart && i === 0 ? "start " : ""}${isFinal ? "accepting " : ""}state`}
                    >
                      {step.state}
                      {isFinal && <span className="sc-state-ring" />}
                    </motion.div>
                  </div>
                );
              })}
            </div>

            {/* Verdict banner */}
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className={`sc-verdict ${isAccepted ? "sc-verdict-accept" : "sc-verdict-reject"}`}
              initial={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.1 }}
            >
              <span className="sc-verdict-icon">{isAccepted ? "✓" : "✗"}</span>
              <div>
                <p className="sc-verdict-label">{isAccepted ? "Accepted" : "Rejected"}</p>
                <p className="sc-verdict-sub">
                  {result.stuck
                    ? `No transition from "${result.trace[result.trace.length - 1]?.state}" on "${input[result.stuckAt]}"`
                    : isAccepted
                    ? `Ended in accepting state "${result.trace[result.trace.length - 1]?.state}"`
                    : `Ended in non-accepting state "${result.trace[result.trace.length - 1]?.state}"`}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Idle hint */}
      {!hasResult && dfa && (
        <p className="sc-hint">
          Enter a string and press <strong>Check</strong> or <kbd>Enter</kbd> to simulate the DFA step by step.
        </p>
      )}
    </motion.section>
  );
}
