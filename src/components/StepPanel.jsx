import { motion } from "framer-motion";
import { formatSet } from "../utils/dfa.js";
import { Icon } from "./Icons.jsx";
import { Tooltip } from "./Tooltip.jsx";

const colors = ["#1fbca0", "#f9735b", "#f2b84b", "#7467f0", "#2f9de4", "#d05ce3", "#6abf69"];

export function StepPanel({ result, currentStepIndex, setCurrentStepIndex }) {
  const step = result.steps[currentStepIndex];

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel side-panel flex min-h-0 flex-col gap-5 p-4"
      initial={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.45 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="panel-kicker">Partition Method</p>
          <h2 className="panel-title">Learning steps</h2>
        </div>
        <Tooltip text="Each step shows the active partition, transition signatures, and the block splits caused by distinguishable transitions." />
      </div>

      <div className="space-y-2">
        {result.steps.map((item, index) => (
          <button
            key={`${item.title}-${index}`}
            className={`step-button ${index === currentStepIndex ? "active" : ""}`}
            onClick={() => setCurrentStepIndex(index)}
            type="button"
          >
            <span className="step-number">{index + 1}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{item.title}</span>
              <span className="block truncate text-xs text-[color:var(--muted)]">{item.description}</span>
            </span>
          </button>
        ))}
      </div>

      <motion.div
        key={currentStepIndex}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-md border border-[color:var(--line)] bg-[color:var(--panel-soft)] p-3"
        initial={{ opacity: 0, y: 10 }}
      >
        <div className="mb-3 flex items-start gap-3">
          <Icon name="split" className="mt-1 h-5 w-5 shrink-0 text-[color:var(--teal)]" />
          <div>
            <h3 className="font-semibold text-[color:var(--ink)]">{step.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-[color:var(--muted)]">{step.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {step.partitions.map((group, index) => (
            <motion.span
              key={`${group.join("-")}-${index}`}
              animate={{ scale: step.activeGroups.some((active) => active.join("|") === group.join("|")) ? 1.04 : 1 }}
              className="partition-chip"
              style={{ "--chip": colors[index % colors.length] }}
            >
              P{index}: {formatSet(group)}
            </motion.span>
          ))}
        </div>
      </motion.div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Partition table</p>
          <Icon name="table" className="h-4 w-4 text-[color:var(--amber)]" />
        </div>
        <div className="max-h-[31vh] overflow-auto rounded-md border border-[color:var(--line)]">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="sticky top-0 bg-[color:var(--table-head)] text-xs uppercase text-[color:var(--muted)]">
              <tr>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Block</th>
                <th className="px-3 py-2">Final</th>
                {result.workingDfa.alphabet.map((symbol) => (
                  <th key={symbol} className="px-3 py-2">
                    on {symbol}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {step.table.map((row) => (
                <tr key={row.state} className="border-t border-[color:var(--line)]">
                  <td className="px-3 py-2 font-semibold text-[color:var(--ink)]">{row.state}</td>
                  <td className="px-3 py-2">P{row.block}</td>
                  <td className="px-3 py-2">{row.final ? "yes" : "no"}</td>
                  {row.transitions.map((transition) => (
                    <td key={`${row.state}-${transition.symbol}`} className="px-3 py-2">
                      {transition.target} <span className="text-[color:var(--muted)]">/ P{transition.targetBlock}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {result.minimizedDfa ? <MinimizedTable dfa={result.minimizedDfa} /> : null}
    </motion.aside>
  );
}

function MinimizedTable({ dfa }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-[color:var(--ink)]">Final minimized DFA</p>
        <span className="rounded-full border border-[color:var(--line)] px-2 py-1 text-xs text-[color:var(--muted)]">
          {dfa.states.length} states
        </span>
      </div>
      <div className="overflow-auto rounded-md border border-[color:var(--line)]">
        <table className="w-full min-w-[360px] text-left text-sm">
          <thead className="bg-[color:var(--table-head)] text-xs uppercase text-[color:var(--muted)]">
            <tr>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Group</th>
              {dfa.alphabet.map((symbol) => (
                <th key={symbol} className="px-3 py-2">
                  {symbol}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dfa.states.map((state) => (
              <tr key={state} className="border-t border-[color:var(--line)]">
                <td className="px-3 py-2 font-semibold text-[color:var(--ink)]">
                  {state}
                  {dfa.start === state ? <span className="ml-2 text-[color:var(--start)]">start</span> : null}
                  {dfa.finals.includes(state) ? <span className="ml-2 text-[color:var(--teal)]">final</span> : null}
                </td>
                <td className="px-3 py-2">{dfa.labels[state]}</td>
                {dfa.alphabet.map((symbol) => (
                  <td key={`${state}-${symbol}`} className="px-3 py-2">
                    {dfa.transitions[state][symbol]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
