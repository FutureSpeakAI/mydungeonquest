// ---- THE DOOR LAW OF THE GLASS (regression bench) ----
//
// Judged headless, keyless, no phone required. Laws under judgment:
//   1. House pages (exact host, dot-boundary subdomains) stay in the glass.
//   2. Every parser trick — userinfo, backslash-authority, case, trailing
//      dots, lookalike suffixes, percent and unicode dress-up — resolves
//      OUTWARD. A doubtful door never keeps the glass.
//   3. Script and data pseudo-URLs are dropped cold: neither kept nor
//      handed to the system.

import assert from 'node:assert/strict';
import { hostOf, staysInGlass, openableOutside } from './door.js';

const HOUSE = 'mydungeon.quest';

// ---- 1. the house stays in the glass ---------------------------------------
assert.equal(staysInGlass('https://mydungeon.quest/', HOUSE), true, 'the front door');
assert.equal(staysInGlass('https://mydungeon.quest/play?seat=2#turn', HOUSE), true, 'deep rooms');
assert.equal(staysInGlass('https://play.mydungeon.quest/x', HOUSE), true, 'a subdomain wing');
assert.equal(staysInGlass('https://MYDUNGEON.QUEST/', HOUSE), true, 'shouted case is still the house');
assert.equal(staysInGlass('https://mydungeon.quest./', HOUSE), true, 'a trailing dot is still the house');
assert.equal(staysInGlass('https://mydungeon.quest:8443/dev', HOUSE), true, 'another port, same house');
assert.equal(staysInGlass('http://mydungeon.quest/', HOUSE), true, 'plain http still answers to the host law');
assert.equal(staysInGlass('about:blank', HOUSE), true, 'the blank slate is the glass itself');

// ---- 2. every trick resolves outward ----------------------------------------
assert.equal(staysInGlass('https://checkout.stripe.com/c/pay/x', HOUSE), false, 'the toll-road leaves');
assert.equal(staysInGlass('https://accounts.google.com/o/oauth2/auth', HOUSE), false, 'the parlor leaves');
assert.equal(staysInGlass('https://evilmydungeon.quest/', HOUSE), false, 'no dot, no kinship');
assert.equal(staysInGlass('https://mydungeon.quest.evil.com/', HOUSE), false, 'the house name worn as a mask');
assert.equal(staysInGlass('https://mydungeon.quest@evil.com/', HOUSE), false, 'userinfo dress-up');
assert.equal(staysInGlass('https://evil.com\\@mydungeon.quest/', HOUSE), false, 'backslash ends the authority — Chromium law');
assert.equal(staysInGlass('https://evil.com\\@mydungeon.quest:443\\x', HOUSE), false, 'backslash tricks, twice over');
assert.equal(staysInGlass('https://mydungeon%2equest/', HOUSE), false, 'percent dress-up is no host');
assert.equal(staysInGlass('https://mydungeоn.quest/', HOUSE), false, 'a unicode lookalike is no host');
assert.equal(staysInGlass('https://[::1]/', HOUSE), false, 'bracket hosts are not vouched for');
assert.equal(staysInGlass('//mydungeon.quest/x', HOUSE), false, 'scheme-relative carries no scheme');
assert.equal(staysInGlass('', HOUSE), false, 'nothing is not a door');
assert.equal(staysInGlass('https://mydungeon.quest/', null), false, 'no house host, no glass');

// hostOf reads the true destination
assert.equal(hostOf('https://evil.com\\@mydungeon.quest/'), 'evil.com', 'the backslash reveals the true host');
assert.equal(hostOf('https://user:pass@mydungeon.quest/'), 'mydungeon.quest', 'credentials are stripped');
assert.equal(hostOf('mydungeon.quest/path'), null, 'schemeless is unreadable');

// ---- 3. pseudo-URLs are dropped cold ----------------------------------------
for (const cold of ['javascript:alert(1)', 'data:text/html,<h1>x</h1>', 'blob:https://mydungeon.quest/u', 'about:srcdoc']) {
  assert.equal(staysInGlass(cold, HOUSE), false, `${cold.split(':')[0]}: never keeps the glass`);
  assert.equal(openableOutside(cold), false, `${cold.split(':')[0]}: never handed to the system`);
}
// while true outside doors ARE handed over
assert.equal(openableOutside('https://checkout.stripe.com/'), true, 'web doors open outside');
assert.equal(openableOutside('intent://scan/#Intent;scheme=zxing;end'), true, 'app doors open outside');
assert.equal(openableOutside('mailto:innkeeper@mydungeon.quest'), true, 'letters open outside');

console.log('door: PASS — the house stays in the glass, every trick resolves outward, pseudo-doors drop cold.');
