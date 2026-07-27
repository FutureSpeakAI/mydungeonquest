// ---------------------------------------------------------------------------
// TITLE SHAPE (B3) — noun-phrase validator for campaign arc titles.
// Rejects a title whose SECOND WORD (words[1]) is a finite verb form — the
// most common template-collision pattern ("Kingdom Opens", "Road Falls",
// "Light Fades"). The check is intentionally narrow: only word index 1
// is tested so legitimate noun+noun or adjective+noun titles are never
// penalized. Short titles (fewer than two words) always pass.
// Pure; keyless-safe; no browser surface.
// ---------------------------------------------------------------------------

// Known finite verb forms — third-person singular present (-s/-es) and the
// most common simple-past forms that would read as finite verbs in position
// two of a fantasy campaign title. Checked case-insensitively.
// Deliberately compact: covers common generator failures without
// growing large enough to misflag unusual nouns or proper names.
export const FINITE_VERB_SET = new Set([
  // Third-person singular present
  'begins','bleeds','breaks','breathes','brings','builds','burns','calls',
  'carries','catches','changes','closes','comes','crumbles','cries','crumbles',
  'draws','drives','drops','dies','ends','fails','fades','falls','feels',
  'fights','follows','forgets','gathers','gives','goes','grows','guards',
  'haunts','hears','hides','holds','hunts','invites','joins','keeps',
  'kills','knows','leads','leaves','lifts','lights','lies','makes','marks',
  'means','meets','mourns','moves','needs','opens','passes','pays','places',
  'points','proves','pulls','pushes','raises','reaches','reads','remembers',
  'returns','reveals','rides','rises','rules','runs','says','seeks','sees',
  'sends','sets','shapes','shatters','shifts','shows','sings','sits',
  'sleeps','slips','sounds','speaks','spills','stands','starts','stays',
  'stirs','stops','strikes','sweeps','takes','tears','tells','thinks',
  'throws','touches','travels','tries','turns','understands','unravels',
  'uses','vanishes','visits','wakes','walks','wanders','wants','watches',
  'waits','whispers','wields','wins','withdraws','works','writes','yields',
  'spreads','marches','advances','charges','conquers','surrenders','prevails',
  'succumbs','perishes','survives','endures','suffers','escapes','pursues',
  // Common simple past
  'fled','found','went',
  'began','broke','brought','built','burned','called','came','carried',
  'caught','changed','closed','cried','crumbled','drew','drove','dropped',
  'died','ended','failed','faded','fell','felt','fought','followed',
  'forgot','gathered','gave','grew','guarded','haunted','heard','held',
  'hid','joined','kept','killed','knew','led','left','lifted','lit',
  'lost','made','marked','meant','met','mourned','moved','opened',
  'passed','paid','pointed','proved','pulled','pushed','raised','reached',
  'remembered','returned','revealed','rode','rose','ruled','ran','said',
  'sent','sought','saw','shaped','shattered','shifted','showed','sang',
  'sat','slept','slipped','sounded','spoke','spilled','stood','started',
  'stayed','stirred','stopped','struck','swept','took','tore','told',
  'thought','threw','touched','traveled','tried','turned','understood',
  'unraveled','used','vanished','visited','woke','wandered','wanted',
  'watched','waited','whispered','wielded','withdrew','won','worked',
  'wrote','yielded',
]);

/**
 * Returns { ok: true } when the title reads as a noun phrase, or
 * { ok: false, reason: string } when the second word is a finite verb form.
 *
 * @param {string} title
 * @returns {{ ok: boolean, reason?: string }}
 */
export function isNounPhraseTitle(title) {
  if (!title || typeof title !== 'string') return { ok: true };
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return { ok: true };
  const second = words[1].replace(/[^A-Za-z]/g, '').toLowerCase();
  if (!second) return { ok: true };
  if (FINITE_VERB_SET.has(second)) {
    return {
      ok: false,
      reason: `campaign title second word "${words[1]}" is a finite verb form — the title must be a noun phrase, not a sentence`
    };
  }
  return { ok: true };
}
