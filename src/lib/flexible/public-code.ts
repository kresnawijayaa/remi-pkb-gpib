const codeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function formatPublicCode(date = new Date()) {
  const parts = Object.fromEntries(codeFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
}

export function validPublicCode(code: string) {
  return /^\d{6}-\d{6}$/.test(code);
}
