# Playtest Protocol — MyDungeon.Quest

**Version:** Stage 6 K13, 2026-07-29  
**Format:** Run in order. Mark each item **PASS / FAIL / SKIP** with a one-line note. A regression is a line that changed.

---

## 1. Creation

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1a | Tap **New Campaign** | Title page → creation form opens | |
| 1b | Name the hero, pick presentation and pronouns | Each field accepts input without error | |
| 1c | Choose a world (or roll one) | World title is a noun phrase, not a verb phrase | |
| 1d | Tap **Begin** | Loading screen, then table view | |
| 1e | First log entry appears | Opening narration rendered (no spinner) | |

## 2. First turn

| # | Step | Expected | Result |
|---|------|----------|--------|
| 2a | Three suggestion chips appear | Chips are readable, do not overflow | |
| 2b | Tap one chip | Player action logged, DM narration follows | |
| 2c | Narration is ≥ 1 paragraph | No empty block, no repair banner | |
| 2d | Listen button appears | Tap it — first voice segment plays | |
| 2e | Second voice segment follows | No silent gap after first segment ends | |

## 3. First plate

| # | Step | Expected | Result |
|---|------|----------|--------|
| 3a | Chapter header renders | Scene title present (no blank header) | |
| 3b | Illustration renders | Full-frame image, not a letterbox strip | |
| 3c | Caption below the plate | Describes the image; does not repeat narration | |
| 3d | Scroll down and back | Plate dimensions unchanged, not cropped | |

## 4. Tick and act change

| # | Step | Expected | Result |
|---|------|----------|--------|
| 4a | Play ≥ 3 more turns | HP chip shows correct fraction (e.g. 10/10) | |
| 4b | A tick fires | Tick entry in log; no villain named in tick text | |
| 4c | Play to act boundary | Chapter card fires before or with plate | |
| 4d | Time-of-day label updates | e.g. "morning" → "afternoon" in HUD chip | |

## 5. Book tabs

| # | Step | Expected | Result |
|---|------|----------|--------|
| 5a | Open the Book | Storybook tab is default | |
| 5b | Storybook tab | Paragraphs render; no blank page | |
| 5c | Cast tab | Hero and any revealed NPCs listed | |
| 5d | World tab | World title and covenant visible | |
| 5e | Chart tab | Traveler's Chart renders; no blank canvas | |
| 5f | Trove tab | Items listed (or "no items yet") | |
| 5g | Standings tab | Party health and gold shown | |

## 6. Save and reload

| # | Step | Expected | Result |
|---|------|----------|--------|
| 6a | Background-tap out of Book | Returns to table | |
| 6b | Force-close and reopen the app | Same campaign on the spine | |
| 6c | Tap the spine | Table resumes at the same turn | |
| 6d | Narration and plate still visible | No blank log entries | |

## 7. Export

| # | Step | Expected | Result |
|---|------|----------|--------|
| 7a | Open the Book | Navigate to Storybook tab | |
| 7b | Seal the campaign (if not sealed) | Seal dialog, then sealed badge | |
| 7c | Tap **Export** | Share sheet or file save dialog | |
| 7d | Exported file opens | Readable markdown / PDF | |

---

## Safe-area check (mobile only)

| # | Step | Expected | Result |
|---|------|----------|--------|
| S1 | Table view on notched device | HUD is not clipped by notch | |
| S2 | Scroll to top of log | Table header not sliced through | |

---

**Tester:** ______________________  **Date:** __________  **Device:** __________

*Protocol runs take ≈ 20 minutes. A failed item is a regression unless the note explains an intentional change.*
