import { motion } from "framer-motion";

export function TransitionTable({ dfa, highlightState = null }) {
  if (!dfa) return null;
  const { states, alphabet, start, finals, transitions } = dfa;

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel tt-panel"
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.42, delay: 0.08 }}
    >
      <div className="tt-header">
        <div>
          <p className="panel-kicker">Transition Function</p>
          <h2 className="panel-title">δ (state, symbol) → state</h2>
        </div>
        <div className="tt-legend">
          <span className="tt-badge tt-badge-start">→ start</span>
          <span className="tt-badge tt-badge-final">* final</span>
        </div>
      </div>

      <div className="tt-scroll">
        <table className="tt-table">
          <thead>
            <tr>
              <th className="tt-th tt-state-col">State</th>
              {alphabet.map((sym) => (
                <th key={sym} className="tt-th tt-sym-col">
                  <span className="tt-sym-badge">{sym}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {states.map((state, rowIdx) => {
              const isStart = state === start;
              const isFinal = finals.includes(state);
              const isHighlighted = state === highlightState;
              return (
                <motion.tr
                  key={state}
                  animate={{ opacity: 1, x: 0 }}
                  className={`tt-row ${isHighlighted ? "tt-row-highlight" : ""} ${rowIdx % 2 === 1 ? "tt-row-alt" : ""}`}
                  initial={{ opacity: 0, x: -8 }}
                  transition={{ delay: rowIdx * 0.04 }}
                >
                  <td className="tt-td tt-state-td">
                    <div className="tt-state-cell">
                      {isStart && <span className="tt-start-arrow">→</span>}
                      {isFinal && <span className="tt-final-star">*</span>}
                      <span className={`tt-state-name ${isFinal ? "tt-state-final" : ""} ${isStart ? "tt-state-start-name" : ""}`}>
                        {state}
                      </span>
                    </div>
                  </td>
                  {alphabet.map((sym) => {
                    const target = transitions[state]?.[sym] ?? "—";
                    const targetIsFinal = finals.includes(target);
                    return (
                      <td key={`${state}-${sym}`} className="tt-td tt-target-td">
                        <span className={`tt-target ${targetIsFinal ? "tt-target-final" : ""}`}>
                          {target}
                        </span>
                      </td>
                    );
                  })}
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}
