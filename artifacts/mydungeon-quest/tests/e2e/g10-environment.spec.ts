import { expect, test } from '@playwright/test';
import { histogramDelta, judge, noteLowConfidence, noteNear } from './lib/vision';
import { preflightManifest, rolePlate, topBytes } from './lib/harvestManifest';

// ============================================================
// G10 — ENVIRONMENTAL CONSISTENCY. The Vale must be the Vale twice, hold
// its palette in the same state, and wear its wounds visibly. This court
// reads only the harvest store; a missing plate is a named preflight
// refusal, never a repaint.
// ============================================================

test('G10 preflight: the harvest store holds every artifact this court needs', () => {
  preflightManifest('g10-environment');
});

test('G10a the Vale twice: same location, shared motifs', async () => {
  test.setTimeout(180_000);
  const m = preflightManifest('g10-environment');
  const verdict = await judge({
    id: 'g10a-vale-pair', criterion: 'g10a-region-constancy',
    images: [topBytes(rolePlate(m, 'vale-establishing')), topBytes(rolePlate(m, 'vale-second'))],
    question: 'These are two plates of the same fictional region. Do they depict the same location (same landscape logic, architecture, landmark language)? Name the visual motifs they share.',
    schema: { same_location: 'boolean', shared_motifs: ['string'], confidence: 'number 0..1' }
  });
  expect(verdict.same_location, JSON.stringify(verdict)).toBe(true);
  expect((verdict.shared_motifs || []).length, JSON.stringify(verdict)).toBeGreaterThanOrEqual(2);
  noteLowConfidence('g10a', Number(verdict.confidence));
});

test('G10b histogram gate: same region, same state, delta at most 0.35', async () => {
  const m = preflightManifest('g10-environment');
  const delta = await histogramDelta(topBytes(rolePlate(m, 'vale-establishing')), topBytes(rolePlate(m, 'vale-second')));
  expect(delta, `histogramDelta ${delta}`).toBeLessThanOrEqual(0.35);
  noteNear('g10b-histogram', delta, 0.35, 'max');
});

test('G10c the wounded Vale reads wounded', async () => {
  test.setTimeout(180_000);
  const m = preflightManifest('g10-environment');
  const verdict = await judge({
    id: 'g10c-vale-wounded', criterion: 'g10c-region-damage',
    images: [topBytes(rolePlate(m, 'vale-establishing')), topBytes(rolePlate(m, 'vale-wounded'))],
    question: 'Which image shows visible damage, decay, or darkening relative to the other? Answer 1 or 2.',
    schema: { damaged_image: '1|2', confidence: 'number 0..1' }
  });
  expect(String(verdict.damaged_image), JSON.stringify(verdict)).toContain('2');
  noteLowConfidence('g10c', Number(verdict.confidence));
});
