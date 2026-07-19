# EXPERIENCE-DIRECTIVE XV — THE COMMONS

**Series:** MyDungeon.Quest, the Standing Law · **Task 61** · **Version minted:** 1.1.0 (game only; the engine stays 1.0.0)
**Written first, as the law requires.** Any deviation discovered while building is amended HERE, in the same commit, with a one-line reason.

The game at 1.0.0 keeps a perfect vault: the device is master, the chain is
signed, the export is free. What it lacks is a place for a tale to LIVE when
the device is lost, and a place for a tale to be TOLD when the teller is
done. This directive raises both — the mirror and the commons — and binds
them to one iron sentence: **the mirror never argues with the master, and
the commons never shows what the author struck.**

---

## §I — THE VAULT LAW (standing, restated)

1. The device is canonical. The vault on device is the tale; everything
   beyond the device is a copy that must prove itself.
2. Export is free. A patron can always carry their chronicle out as bytes,
   signed and verifiable, without asking anyone.
3. **The mirror is the vault, extended — never a second system.** The
   standing `/api/vault/*` doors, the PG spine/journal/media tables, and the
   content-addressed blob shelf ARE the mirror. This task widens and proves
   them; it does not build a rival. (One seat, one law — mirrored law drifts.)

## §II — THE MIRROR LAW

1. **A namespace per patron.** Every mirrored row is keyed to the named
   patron who pushed it (`users.id`); no door hands one patron another's
   rows. The doors stand behind the named-patron law.
2. **Replication is append-only chain extension.** A push either extends the
   chain the house already holds — judged link by link with the desk's own
   chain law — or it is refused whole: a broken chain is turned away (422),
   a diverged head is turned away (409) and the device's lawful move is to
   FORK, minting a new spine. Convergence is idempotent where it matters:
   a push that crashed before the head landed re-lands whole with nothing
   duplicated and nothing reordered, and a device already at the head
   settles with an empty push naming that head. A FULL re-push after the
   head has landed is honestly refused (409) — the device is behind, and
   its lawful move is to pull, never to re-speak history at the door.
   *(Amended at the bench, task 61: the served law judges every push as a
   tail extension of the head it holds — the old letter promised a
   post-landing re-push the door has never accepted.)*
3. **Assets are content-addressed and deduped globally.** A blob lives on
   the shelf under its own sha256, once, no matter how many patrons cite it.
   The house checks the shelf before accepting bytes; a second copy is never
   stored. Reference rows are per-patron; the bytes are a commons.
4. **The no-merge proof.** Merge is not forbidden by policy; it is
   unconstructable by shape. The house accepts only a linear extension of
   the head it holds: a push based on any other head is refused whole, and
   the refusal's one lawful answer — fork — mints a NEW spine with a new
   identity rather than rewriting the old. No operation exists, on either
   side of the wire, that takes two journals and returns one; no payload
   carries a "theirs-and-ours"; restore copies bytes in one direction only,
   house to device, verbatim. Two devices can never be ASKED to reconcile,
   because the protocol has no sentence in which the question can be phrased.
5. **Restore is byte-identical and desk-verified.** Drawing a tale onto a
   fresh device returns the journal rows verbatim — rows ride whole — and
   the device does not seat the spine until its own desk has re-verified the
   full chain and matched the mirrored head hash. A restore that cannot be
   desk-verified is refused aloud, not seated quietly. Restored spines
   continue hash-only; the signing key never travels (§IV), so a restored
   tale extends unsigned-but-chained, exactly as the downgrade door already
   records.
6. **Deleting the mirror deletes the namespace, not the vault.** The burn
   takes the patron's spine and journal rows out of the house. Blob bytes on
   the commons shelf remain — they are content-addressed commons, named by
   hash, unreachable except through a citing record. The vault on device is
   untouched by any mirror burn.
7. **What the house can and cannot read — stated plainly.** The house holds
   mirrored words and art in PLAINTEXT: titles, journal payloads, plates. It
   can read them; an operator with database keys can read them. The house
   can NEVER read: the signing key (it never leaves the device, §IV), the
   seen-ledger and its reveals (device-local by standing law — excluded from
   every sync payload), or the device's local settings. The mirror is a
   safety copy, not a secret one; the directive says so out loud.
8. **The staging seam (for the courts alone).** The commons court must walk
   a REAL staging namespace, yet the proving rig runs doorless. One seam:
   when the Clerk door is CLOSED (no door keys in the house) **and**
   `VAULT_STAGE_PATRON` is set, the doorkeeper seats that named staging
   patron and the vault doors open for it. Double-latched: in any house
   holding door keys the seam is dead code, so the seam cannot exist in the
   published house. The loop's main app server keeps neither latch open.

## §III — THE PUBLISH LAW

1. **Sealed tales only.** A tale may be published only when its journal
   carries the `sealing` block — the final signature over the whole
   chronicle. The house desk-verifies every pushed record fail-closed
   (the signature-downgrade door stands: the envelope's own evidence forces
   the court) and refuses unsealed or unverifiable records by name.
2. **The mint.** Publishing mints a public page under an unguessable id.
   The record is stored **byte-preserved** — the page serves the exact bytes
   the author signed, forever. Every asset the record cites must already
   stand on the content-addressed shelf; a publish naming missing hashes is
   refused with the list. One LIVING page per tale per patron: republishing
   while a page stands is refused naming the standing page — revoke first.
3. **The public page.** `/t/<id>` renders the storybook reader, the episode
   player, and the dramatis personae — through the same readers the table
   uses, fed by the published record alone. No account to read. The
   seen-ledger never rides (standing law), so the public book binds the
   elder way: all proven art seated with its chapters. The page makes no
   Dexie writes and asks for no name.
4. **The verify badge re-runs the full chain in the reader's own browser —
   and answers for the words the page shows.** Every displayed row must
   cite its journal record by hash and match it canonically; a display
   copy that diverges from the chain fells the badge whole. *(Amended at
   the 61.2 bench: tooth 17's laundering sitting proved the chain court
   alone stays green over a forged display copy — a green badge beside
   forged prose would be laundering, not verification.)*
   The page fetches the stored record verbatim and runs the desk — the whole
   chain, every link — in the visitor's browser, then shows the verdict and
   the head hash. The badge is computed where the reader stands, not
   claimed by the house. A record that fails the desk shows a failing badge;
   the forgery tooth bites exactly here.
5. **Unlisted by default; listed by choice; revoked with proof.** A minted
   page is reachable only by its link until the author chooses the commons
   shelf (`listed`). Revocation is total and provable: every public door —
   record, assets, page — answers an honest refusal (410, gone by its
   author's hand), and a fresh browser context finds nothing but the
   refusal. Revoked pages remain as tombstones in the house ledger; the
   tale on device is untouched.
6. **Redaction carries — struck scenes are struck everywhere.** The stored
   record keeps the struck turn's bytes, because the chain cannot lose a
   link and still verify. But no public surface renders struck content: the
   page re-derives strikes from the journal's `redaction` blocks — the
   journal outranks any snapshot flag — before anything reaches a reader.
   The struck sentence appears NOWHERE on the page: not in the book, not in
   the episodes, not in the cast, not in a title. The court checks the
   absence, not the intention.
7. **What publishing reveals — stated plainly.** A published page is public
   plaintext: the tale's words and cited art, readable by anyone holding the
   link. Unlisted is unadvertised, not encrypted. The page carries the
   table's own PG posture and adds no new exposure beyond the record itself.
8. **Attribution.** The page footer names the engine — fatescript 1.0.0 —
   and links the open repository (github.com/futurespeakai/mydungeonquest).
   The commons tells readers what told the tale.

## §IV — THE KEY-HOME LAW

The signing key is born non-extractable and DIES ON THE DEVICE. It does not
ride exports; it does not ride sync payloads; it does not ride publish
records; no code path serializes it off the device in any shape. Only the
public JWK travels — that is the whole point of it. The keyHome gate walks
every outbound payload builder the client owns and proves the private
material absent by scan, not by promise.

## §V — THE GATES AND THE PIN (mock tier sovereign)

Three new keyless gates join the eval chain in this task's commit, and the
pin moves **125 → 128** in the same commit (G13's ledger comment gains the
line "(61 §V) 125→128").

1. **`evals/mirror.test.mjs`** — benches the REAL vault routes against a
   simulated store (fake query, Map-backed shelf): append-only extension,
   idempotent crash-retry convergence (no duplicates) and empty-push
   settlement at the landed head (head unmoved; a stale head is told to
   pull), divergence refused 409,
   broken chain refused 422, restore returns byte-identical desk-verified
   rows, and the shelf dedupes by hash (one put for two citations).
2. **`evals/publishRules.test.mjs`** — the publish laws as pure rules:
   sealed-only (unsealed refused by name), redaction carried (the struck
   turn's text absent from the page model while unstruck text stands),
   revocation in the page contract (a revoked model is refusal-only, zero
   tale content), unlisted by default in the mint contract.
3. **`evals/keyHome.test.mjs`** — drives the real outbound builders (export,
   sync payloads, publish record) over a real keypair and deep-scans every
   payload: no private JWK scalar, no privateKey field, no key object of any
   shape. Fail-closed: an unscannable payload is a failure, not a pass.

No gate weakens, mocks a judge, or skips. The chain only grows.

## §VI — THE COURTS: G29 AND THE FORGERY TOOTH

1. **G29 — THE COMMONS** (new project in the proving loop, its own house on
   its own port by the keyed-server pattern, staging seam latched open, the
   loop's main server untouched): against a REAL staging namespace —
   a) mirror a played fixture (with a plate and a struck sentence), wipe the
   local shelf, restore on a fresh context, desk verifies, bytes match;
   b) publish the sealed reference tale, then LOGGED OUT: the public page
   renders book, episode player, and cast, and the badge PASSES in-browser;
   c) the struck sentence appears nowhere on the page;
   d) revoke, then a fresh context is refused at every public door.
2. **TOOTH 17 — THE FORGERY TOOTH** (calibration court): a copy of the
   published record with ONE byte flipped is served to the page; the badge
   must FAIL in the reader's browser. A verify badge that cannot catch a
   flipped byte is a lie wearing wax.

## §VII — THE PROTOCOL IS ADDITIVE

1. The engine is untouched: fatescript stays 1.0.0, 58 gates, parity record
   unmoved. No engine edits ride this task.
2. No existing operation, reducer, or validator changes shape. The publish
   doors, the staging seam, and the public page are NEW rooms on standing
   corridors.
3. The proving hook's fixture schema grows additively: a scripted turn may
   carry a `plate` (a small deterministic image riding the REAL media door)
   so the commons fixture owns an asset without asking a live painter.
   Scripted strikes already stand.
4. **No new dependencies.** The shelf rides the standing object-storage
   seat; the doors ride the standing express; the page rides the standing
   readers. Nothing enters the lockfile.

## §VIII — THE CEILING

Eight iterations. Extension law: once, frozen. The task closes with the
ritual — keyless green at 128, the loop green three consecutive times with
zero skips and all teeth, the architect over the full diff, findings fixed
or refuted — and the standing report. If the directive must bend, it is
amended here, in the same commit, with its reason in one line.

*The vault is master. The mirror is a copy that proves itself. The commons
is a stage, not a safe. And the key never leaves home.*
