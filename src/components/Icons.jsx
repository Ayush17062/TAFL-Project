const paths = {
  play: "M8 5v14l11-7z",
  pause: "M7 5h4v14H7zm6 0h4v14h-4z",
  next: "M6 5l8 7-8 7V5zm10 0h2v14h-2z",
  prev: "M18 19l-8-7 8-7v14zM6 5h2v14H6z",
  moon: "M21 14.5A8.5 8.5 0 019.5 3 7 7 0 1021 14.5z",
  sun: "M12 8a4 4 0 100 8 4 4 0 000-8zm0-5v2m0 14v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M3 12h2m14 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42",
  download: "M12 3v10m0 0l4-4m-4 4L8 9M5 17v3h14v-3",
  code: "M9 18l-6-6 6-6m6 12l6-6-6-6",
  arrow: "M5 12h14m-5-5l5 5-5 5",
  spark: "M12 3l1.7 5.2L19 10l-5.3 1.8L12 17l-1.7-5.2L5 10l5.3-1.8L12 3z",
  split: "M6 4v5a3 3 0 003 3h6a3 3 0 013 3v5M18 4v5a3 3 0 01-3 3H9a3 3 0 00-3 3v5",
  table: "M4 5h16v14H4zM4 10h16M10 5v14",
  graph: "M7 8a3 3 0 100-6 3 3 0 000 6zm10 14a3 3 0 100-6 3 3 0 000 6zM17 8a3 3 0 100-6 3 3 0 000 6zM9.4 6.6l5.2 2.8m.2 5.8l-5.6-7",
  info: "M12 17v-6m0-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  refresh: "M20 7v5h-5M4 17v-5h5m9.1-5A7 7 0 006.4 9M5.9 17A7 7 0 0017.6 15",
};

export function Icon({ name, className = "h-5 w-5", stroke = true }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={stroke ? "none" : "currentColor"}
      stroke={stroke ? "currentColor" : "none"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d={paths[name]} />
    </svg>
  );
}
