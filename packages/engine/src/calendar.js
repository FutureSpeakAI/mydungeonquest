// ------------------------------------------------------------
// THE CALENDAR — story time as a pure fold over the sealed record.
// time_advance operations are the only clock; ticks carry none and
// therefore move nothing. Day one is the day the tale opens.
// ------------------------------------------------------------
export function calendarOf(logs = []) {
  let day = 1;
  let hours = 0;
  for (const log of logs) {
    const advance = log?.dm?.time_advance;
    if (!advance || log.redacted) continue;
    if (advance.unit === 'days') day += Math.max(0, advance.n | 0);
    if (advance.unit === 'hours') {
      hours += Math.max(0, advance.n | 0);
      day += Math.floor(hours / 24);
      hours = hours % 24;
    }
  }
  return { day, hours };
}

export function calendarLine(logs) {
  const { day } = calendarOf(logs);
  return `It is Day ${day} of the tale.`;
}
