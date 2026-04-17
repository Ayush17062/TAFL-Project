import { motion } from "framer-motion";
import { Icon } from "./Icons.jsx";

export function Tooltip({ text, side = "top" }) {
  const placement =
    side === "bottom"
      ? "top-full mt-2"
      : side === "left"
        ? "right-full mr-2 top-1/2 -translate-y-1/2"
        : "bottom-full mb-2";

  return (
    <span className="group relative inline-flex align-middle">
      <span className="grid h-6 w-6 place-items-center rounded-full border border-[color:var(--line)] text-[color:var(--muted)] transition hover:border-[color:var(--teal)] hover:text-[color:var(--teal)]">
        <Icon name="info" className="h-4 w-4" />
      </span>
      <motion.span
        aria-hidden="true"
        className={`pointer-events-none absolute ${placement} z-40 w-64 rounded-md border border-[color:var(--line)] bg-[color:var(--panel-strong)] px-3 py-2 text-left text-xs leading-relaxed text-[color:var(--ink)] opacity-0 shadow-xl backdrop-blur-xl transition group-hover:opacity-100`}
        initial={{ y: side === "bottom" ? -4 : 4, scale: 0.98 }}
        whileHover={{ y: 0, scale: 1 }}
      >
        {text}
      </motion.span>
    </span>
  );
}
