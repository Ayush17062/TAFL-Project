const clone = (value) => JSON.parse(JSON.stringify(value));

const naturalStateSort = (a, b) =>
  String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

export function normalizeDfa(input) {
  const states = uniqueList(input.states);
  const alphabet = uniqueList(input.alphabet);
  const start = input.start && states.includes(input.start) ? input.start : states[0] ?? "";
  const finals = uniqueList(input.finals).filter((state) => states.includes(state));
  const transitions = {};

  states.forEach((state) => {
    transitions[state] = {};
    alphabet.forEach((symbol) => {
      const target = input.transitions?.[state]?.[symbol];
      transitions[state][symbol] = states.includes(target) ? target : "";
    });
  });

  return { states, alphabet, start, finals, transitions };
}

export function uniqueList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
}

export function parseCommaList(value) {
  return uniqueList(String(value).split(","));
}

export function formatSet(group) {
  if (!group || group.length === 0) {
    return "empty";
  }

  return `{${group.join(", ")}}`;
}

export function validateDfa(dfa) {
  const errors = [];

  if (!dfa.states.length) {
    errors.push("Add at least one state.");
  }

  if (!dfa.alphabet.length) {
    errors.push("Add at least one alphabet symbol.");
  }

  if (!dfa.start || !dfa.states.includes(dfa.start)) {
    errors.push("Choose a start state that exists in the state list.");
  }

  dfa.finals.forEach((state) => {
    if (!dfa.states.includes(state)) {
      errors.push(`Final state "${state}" is not in the state list.`);
    }
  });

  dfa.states.forEach((state) => {
    dfa.alphabet.forEach((symbol) => {
      const target = dfa.transitions?.[state]?.[symbol];
      if (!target || !dfa.states.includes(target)) {
        errors.push(`Transition ${state} --${symbol}--> must point to a known state.`);
      }
    });
  });

  return errors;
}

export function getReachableStates(dfa) {
  if (!dfa.start) {
    return [];
  }

  const seen = new Set([dfa.start]);
  const queue = [dfa.start];

  while (queue.length) {
    const state = queue.shift();
    dfa.alphabet.forEach((symbol) => {
      const target = dfa.transitions[state]?.[symbol];
      if (target && !seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    });
  }

  return dfa.states.filter((state) => seen.has(state));
}

export function buildPartitionTable(dfa, partitions) {
  const blockByState = new Map();
  partitions.forEach((group, index) => {
    group.forEach((state) => blockByState.set(state, index));
  });

  return dfa.states.map((state) => ({
    state,
    block: blockByState.has(state) ? blockByState.get(state) : -1,
    final: dfa.finals.includes(state),
    transitions: dfa.alphabet.map((symbol) => {
      const target = dfa.transitions[state]?.[symbol] ?? "";
      const targetBlock = blockByState.has(target) ? blockByState.get(target) : -1;
      return { symbol, target, targetBlock };
    }),
  }));
}

function canonicalizePartitions(partitions) {
  return partitions
    .map((group) => [...group].sort(naturalStateSort))
    .filter((group) => group.length > 0)
    .sort((a, b) => naturalStateSort(a[0], b[0]));
}

function partitionSignature(state, dfa, blockByState) {
  return dfa.alphabet
    .map((symbol) => {
      const target = dfa.transitions[state]?.[symbol];
      return blockByState.has(target) ? blockByState.get(target) : "missing";
    })
    .join("|");
}

function blockMap(partitions) {
  const map = new Map();
  partitions.forEach((group, index) => group.forEach((state) => map.set(state, index)));
  return map;
}

function createStep({ dfa, title, description, partitions, previousPartitions, activeGroups = [] }) {
  return {
    title,
    description,
    partitions: clone(partitions),
    previousPartitions: previousPartitions ? clone(previousPartitions) : null,
    activeGroups: clone(activeGroups),
    table: buildPartitionTable(dfa, partitions),
  };
}

export function minimizeDfa(inputDfa) {
  const dfa = normalizeDfa(inputDfa);
  const errors = validateDfa(dfa);

  if (errors.length) {
    return { errors, steps: [], minimizedDfa: null, reachableStates: [], unreachableStates: [] };
  }

  const reachableStates = getReachableStates(dfa);
  const unreachableStates = dfa.states.filter((state) => !reachableStates.includes(state));
  const workingDfa = {
    ...dfa,
    states: reachableStates,
    finals: dfa.finals.filter((state) => reachableStates.includes(state)),
    transitions: Object.fromEntries(
      reachableStates.map((state) => [
        state,
        Object.fromEntries(dfa.alphabet.map((symbol) => [symbol, dfa.transitions[state][symbol]])),
      ]),
    ),
  };

  const steps = [
    createStep({
      dfa,
      title: "Remove unreachable states",
      description: unreachableStates.length
        ? `${formatSet(unreachableStates)} cannot be reached from ${dfa.start}, so it will not affect the language.`
        : `Every state is reachable from ${dfa.start}.`,
      partitions: [reachableStates],
      activeGroups: unreachableStates.length ? [unreachableStates] : [],
    }),
  ];

  const finalStates = workingDfa.states.filter((state) => workingDfa.finals.includes(state));
  const nonFinalStates = workingDfa.states.filter((state) => !workingDfa.finals.includes(state));
  let partitions = canonicalizePartitions([finalStates, nonFinalStates]);

  steps.push(
    createStep({
      dfa: workingDfa,
      title: "Initial final/non-final split",
      description: "A final state cannot be equivalent to a non-final state, so the first split separates them.",
      partitions,
      activeGroups: partitions,
    }),
  );

  let changed = true;
  let guard = 0;

  while (changed && guard < workingDfa.states.length + 2) {
    guard += 1;
    changed = false;
    const currentBlockByState = blockMap(partitions);
    const nextPartitions = [];
    const splitGroups = [];

    partitions.forEach((group) => {
      const buckets = new Map();

      group.forEach((state) => {
        const signature = partitionSignature(state, workingDfa, currentBlockByState);
        if (!buckets.has(signature)) {
          buckets.set(signature, []);
        }
        buckets.get(signature).push(state);
      });

      const localGroups = [...buckets.values()].map((bucket) => bucket.sort(naturalStateSort));
      nextPartitions.push(...localGroups);

      if (localGroups.length > 1) {
        changed = true;
        splitGroups.push(...localGroups);
      }
    });

    const canonicalNext = canonicalizePartitions(nextPartitions);

    if (changed) {
      const splitText = splitGroups.map(formatSet).join(" and ");
      steps.push(
        createStep({
          dfa: workingDfa,
          title: `Refine partition ${guard}`,
          description: `States with different transition signatures are separated into ${splitText}.`,
          previousPartitions: partitions,
          partitions: canonicalNext,
          activeGroups: splitGroups,
        }),
      );
    } else {
      steps.push(
        createStep({
          dfa: workingDfa,
          title: "Stable partition reached",
          description: "No group can be split further. Each remaining block becomes one state in the minimized DFA.",
          previousPartitions: partitions,
          partitions: canonicalNext,
          activeGroups: canonicalNext.filter((group) => group.length > 1),
        }),
      );
    }

    partitions = canonicalNext;
  }

  const minimizedDfa = buildMinimizedDfa(workingDfa, partitions);
  steps.push({
    ...createStep({
      dfa: workingDfa,
      title: "Minimized DFA",
      description: `Reduced from ${dfa.states.length} to ${minimizedDfa.states.length} state${
        minimizedDfa.states.length === 1 ? "" : "s"
      }. Equivalent states now share a single representative.`,
      partitions,
      activeGroups: partitions.filter((group) => group.length > 1),
    }),
    minimizedDfa,
  });

  return {
    errors: [],
    originalDfa: dfa,
    workingDfa,
    minimizedDfa,
    steps,
    reachableStates,
    unreachableStates,
    partitions,
  };
}

function buildMinimizedDfa(dfa, partitions) {
  const blockByState = blockMap(partitions);
  const stateNames = partitions.map((group, index) => `M${index}`);
  const labels = Object.fromEntries(stateNames.map((name, index) => [name, formatSet(partitions[index])]));
  const transitions = {};

  partitions.forEach((group, index) => {
    const representative = group[0];
    transitions[stateNames[index]] = {};
    dfa.alphabet.forEach((symbol) => {
      const target = dfa.transitions[representative][symbol];
      transitions[stateNames[index]][symbol] = stateNames[blockByState.get(target)];
    });
  });

  return {
    states: stateNames,
    labels,
    alphabet: [...dfa.alphabet],
    start: stateNames[blockByState.get(dfa.start)],
    finals: partitions
      .map((group, index) => (group.some((state) => dfa.finals.includes(state)) ? stateNames[index] : null))
      .filter(Boolean),
    transitions,
    groups: clone(partitions),
  };
}
