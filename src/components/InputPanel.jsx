import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { examples } from "../data/examples.js";
import { normalizeDfa, parseCommaList, validateDfa } from "../utils/dfa.js";
import { Icon } from "./Icons.jsx";
import { Tooltip } from "./Tooltip.jsx";

export function InputPanel({ dfa, hasAppliedDfa, onApply, setDfa }) {
  const [focusedListField, setFocusedListField] = useState(null);
  const [fieldDrafts, setFieldDrafts] = useState({
    alphabet: dfa.alphabet.join(", "),
    finals: dfa.finals.join(", "),
    states: dfa.states.join(", "),
  });
  const [selectedExample, setSelectedExample] = useState(examples[1].id);
  const draftErrors = useMemo(() => validateDfa(dfa), [dfa]);

  useEffect(() => {
    setFieldDrafts((drafts) => ({
      alphabet: focusedListField === "alphabet" ? drafts.alphabet : dfa.alphabet.join(", "),
      finals: focusedListField === "finals" ? drafts.finals : dfa.finals.join(", "),
      states: focusedListField === "states" ? drafts.states : dfa.states.join(", "),
    }));
  }, [dfa, focusedListField]);

  const updateDfa = (patch) => {
    setDfa((current) => normalizeDfa({ ...current, ...patch }));
  };

  const updateStates = (value) => {
    const states = parseCommaList(value);
    const transitions = {};
    states.forEach((state) => {
      transitions[state] = {};
      dfa.alphabet.forEach((symbol) => {
        transitions[state][symbol] = dfa.transitions[state]?.[symbol] || states[0] || "";
      });
    });
    updateDfa({ states, transitions });
  };

  const updateAlphabet = (value) => {
    const alphabet = parseCommaList(value);
    const transitions = {};
    dfa.states.forEach((state) => {
      transitions[state] = {};
      alphabet.forEach((symbol) => {
        transitions[state][symbol] = dfa.transitions[state]?.[symbol] || dfa.states[0] || "";
      });
    });
    updateDfa({ alphabet, transitions });
  };



  const updateListDraft = (field, value, onUpdate) => {
    setFieldDrafts((drafts) => ({ ...drafts, [field]: value }));
    onUpdate(value);
  };

  const loadExample = (id) => {
    const example = examples.find((item) => item.id === id) ?? examples[0];
    const nextDfa = normalizeDfa(example.dfa);
    setSelectedExample(id);
    setFocusedListField(null);
    setFieldDrafts({
      alphabet: nextDfa.alphabet.join(", "),
      finals: nextDfa.finals.join(", "),
      states: nextDfa.states.join(", "),
    });
    setDfa(nextDfa);
    setJsonError("");
  };



  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className="glass-panel side-panel flex min-h-0 flex-col gap-5 p-4"
      initial={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.45 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="panel-kicker">DFA Input</p>
          <h2 className="panel-title">Machine definition</h2>
        </div>
        <Tooltip text="Edit the draft DFA, then press Create or Update to render the graph and minimization steps." />
      </div>

      <label className="field">
        <span>Example</span>
        <select value={selectedExample} onChange={(event) => loadExample(event.target.value)}>
          {examples.map((example) => (
            <option key={example.id} value={example.id}>
              {example.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <label className="field">
          <span>States</span>
          <input
            value={fieldDrafts.states}
            onBlur={() => setFocusedListField(null)}
            onChange={(event) => updateListDraft("states", event.target.value, updateStates)}
            onFocus={() => setFocusedListField("states")}
          />
        </label>
        <label className="field">
          <span>Alphabet</span>
          <input
            value={fieldDrafts.alphabet}
            onBlur={() => setFocusedListField(null)}
            onChange={(event) => updateListDraft("alphabet", event.target.value, updateAlphabet)}
            onFocus={() => setFocusedListField("alphabet")}
          />
        </label>
        <label className="field">
          <span>Start</span>
          <select value={dfa.start} onChange={(event) => updateDfa({ start: event.target.value })}>
            {dfa.states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Final states</span>
          <input
            value={fieldDrafts.finals}
            onBlur={() => setFocusedListField(null)}
            onChange={(event) =>
              updateListDraft("finals", event.target.value, (value) => updateDfa({ finals: parseCommaList(value) }))
            }
            onFocus={() => setFocusedListField("finals")}
          />
        </label>
      </div>

      <div className="input-actions">
        <button
          className="primary-button input-apply-button"
          disabled={draftErrors.length > 0}
          onClick={() => onApply(dfa)}
          type="button"
        >
          {hasAppliedDfa ? "Update DFA" : "Create DFA"}
          <Icon name={hasAppliedDfa ? "refresh" : "spark"} className="h-5 w-5" />
        </button>
        <p className="input-status">
          {draftErrors.length
            ? `${draftErrors.length} issue${draftErrors.length === 1 ? "" : "s"} to fix before rendering`
            : hasAppliedDfa
              ? "Draft ready to update the diagram"
              : "Draft ready to create the diagram"}
        </p>
      </div>

      {draftErrors.length ? (
        <div className="input-error-list">
          {draftErrors.slice(0, 3).map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
    </motion.aside>
  );
}
