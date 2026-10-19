const paths = {
  right: "M4 12h16m-7-7 7 7-7 7",
  left: "M20 12H4m7-7-7 7 7 7",
  external: "M5 19 19 5M5 5h14v14",
  diagonal: "M5 5l14 14M5 19h14V5",
  down: "M12 4v16m-7-7 7 7 7-7",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  refresh: "M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-2l2 3M4 16l2 3a7 7 0 0 0 12-2",
  check: "m4 12 5 5L20 6",
  close: "m6 6 12 12M6 18 18 6",
  plus: "M12 4v16M4 12h16",
  tier: "m12 3 9 9-9 9-9-9Z",
  medal: "m8 3 4 6 4-6M5 3l4 8m10-8-4 8M17 15a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z",
  spade: "M12 2C9 6 3 9 3 14a4 4 0 0 0 7 3l-2 5h8l-2-5a4 4 0 0 0 7-3c0-5-6-8-9-12Z",
  club: "M12 3a4 4 0 0 0-3 7 4 4 0 1 0 1 7l-2 5h8l-2-5a4 4 0 1 0 1-7 4 4 0 0 0-3-7Z",
} as const;

export function Icon({ name, tone }: { name: keyof typeof paths; tone?: "gold" | "silver" | "bronze" }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" style={{ display: "inline-block", width: "1em", height: "1em", flexShrink: 0, verticalAlign: "-0.125em" }} aria-hidden="true" focusable="false" fill={name === "spade" || name === "club" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} fill={name === "medal" && tone ? { gold: "#e8bd3c", silver: "#b9c5cd", bronze: "#cc9465" }[tone] : undefined} /></svg>;
}

const symbols: Record<string, keyof typeof paths> = { "→": "right", "←": "left", "↗": "external", "↘": "diagonal", "↓": "download", "↻": "refresh", "✓": "check", "◆": "tier", "×": "close", "♠": "spade", "♣": "club", "🥇": "medal", "🥈": "medal", "🥉": "medal" };

// Labels supplied as strings use the same SVGs as static JSX labels.
export function IconText({ children }: { children: string }) {
  return <>{children.split(/([→←↗↘↓↻✓◆×♠♣]|🥇|🥈|🥉)/u).map((part, index) => symbols[part] ? <Icon key={index} name={symbols[part]} tone={part === "🥇" ? "gold" : part === "🥈" ? "silver" : part === "🥉" ? "bronze" : undefined} /> : part)}</>;
}
