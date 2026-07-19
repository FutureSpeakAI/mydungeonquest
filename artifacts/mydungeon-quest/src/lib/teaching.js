// THE THREE TEACHING BEATS (Directive XII §VI.3) — each spoken once per
// campaign, presentation-state only: never sealed, never synced, never
// exported, never in the logs. The ledger of what was taught is device-
// local by design — a restored or forked spine may hear a beat twice, and
// that is lawful. Each line stays under ninety characters, house idiom.
import { db } from './db.js';

export const TEACHING_BEATS = {
  roll: 'The die is the table\u2019s honest arbiter \u2014 your bonus rides it, never replaces it.',
  thread: 'A sworn thread stays open in the Book until the world answers it \u2014 nothing is forgotten.',
  xcard: 'The X-card strikes the scene from canon without argument \u2014 safety outranks the plot.'
};

// Speaks the beat's line exactly once for this campaign on this device;
// null ever after. Failures teach nothing and break nothing.
export async function teachOnce(campaignId, beat) {
  if (!campaignId || !TEACHING_BEATS[beat]) return null;
  try {
    const key = `teaching:${campaignId}`;
    const row = (await db.settings.get(key)) || { key, value: {} };
    if (row.value?.[beat]) return null;
    row.value = { ...row.value, [beat]: true };
    await db.settings.put(row);
    return TEACHING_BEATS[beat];
  } catch {
    return null;
  }
}
