# AGENTS' ROOM & TELL ME A STORY — what the house takes

*Source: Huot, Amplayo, Palomaki, Jakobovits, Clark & Lapata,
"Agents' Room: Narrative Generation through Multi-step Collaboration,"
ICLR 2025 (arXiv:2410.02603). Dataset: google-deepmind/tell_me_a_story.*

## What it is

A DeepMind framework, grounded in narrative theory, that decomposes
fiction writing into subtasks handled by specialized agents, shown by
expert evaluators to beat single-prompt baselines. Alongside it: **Tell
Me A Story (TMAS)** — a dataset of complex writing prompts paired with
human-written stories (train/validation/test, JSONL:
`example_id`, `inputs`, `targets`) — and an evaluation framework built
for judging long narratives with expert preferences and automated
metrics.

## The lineage claim

The house already practices the paper's thesis. The tale is not one
prompt; it is a room of specialists: the **Chronicler** keeps memory,
the **spine and beats** plan, the **DM** writes the turn, the
**Foundry** paints, the **Warden** verifies. Agents' Room is external,
peer-reviewed validation of the architecture — decomposition beats
intricate prompting. The house cites it and keeps building.

## What the house takes

1. **The Salon** (`npm run salon`) — fetches TMAS and opens it locally
   into `tools/salon/corpus/` using the repo's published keys, with a
   dependency-free Fernet reader (`tools/salon/fernet.mjs`). The
   corpus is a shelf of human-written stories to **calibrate the DM's
   prose against** — a reference of real craft, not a vibe. Any future
   keyed narrative-quality harness judges against these human
   references or it does not judge; that is what separates the Salon
   from the retired sermon.
2. **Prompt calibration for the Oracle** (charted, Directive VI) — TMAS
   `inputs` are complex, multi-constraint writing prompts; once the
   salon is stocked, the Oracle's premise-forging is measured against
   their structural richness.
3. **The salon gate** (`tools/salon/salon.test.mjs`, in the root
   check) — offline and keyless: proves the published keys unwrap with
   zero dependencies, the seal roundtrips deterministically and
   refuses tampering, and the hygiene law below is in force.

## The hygiene law

The publishers encrypted the corpus so automated scrapes would not eat
it, and published the keys so readers could. The house honors the
intent: **the decrypted corpus is never committed, never shipped in a
zip, and never pasted wholesale into a prompt.** It is read locally,
by people and by local evaluation, with attribution. `tools/salon/corpus/`
is gitignored and the gate asserts it stays that way.

## Licenses & citation

Dataset **CC-BY 4.0** (attribution above and here); repository code and
keys **Apache-2.0** (see `tools/salon/NOTICE`). Cite as:

```
@article{huot2024agents,
  title={Agents' Room: Narrative Generation through Multi-step Collaboration},
  author={Huot, Fantine and Amplayo, Reinald Kim and Palomaki, Jennimaria
          and Jakobovits, Alice Shoshana and Clark, Elizabeth and Lapata, Mirella},
  journal={arXiv preprint arXiv:2410.02603},
  year={2024}
}
```

## What stands now (this cut)

- **The Scriptorium** (`packages/engine/src/scriptorium.js`, gate `scriptorium`) — the framework half of the paper: four scribes, briefed to one domain each, planning in notes and directives. The room plans; the door speaks.
- **The Salon** (`tools/salon/`, root gate `check:salon`) — the corpus half: the human shelf, lawfully opened, never committed.
- **The Human Hand** (`packages/engine/src/tells.js`, gate `tells`) — the answer to StoryScope (arXiv 2604.03136): the measurable fingerprints, convicted deterministically and countered in the pack's directives.
- **Charted:** the Tell Bench — StoryScope's released feature court run over sealed chronicles, judged against the Salon's shelf — and real scribes at the table (Directive VI, Phases 9–10).
