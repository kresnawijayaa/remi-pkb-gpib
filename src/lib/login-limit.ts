let windowStarted = Date.now();
let attempts = 0;

export function allowLoginAttempt(now = Date.now()) {
  if (now - windowStarted >= 60000) { windowStarted = now; attempts = 0; }
  attempts++;
  return attempts <= 15;
}
