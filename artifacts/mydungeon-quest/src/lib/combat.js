// THE COMBAT FOLD — moved WHOLE from App.jsx (Task 57, Section 3) so the
// proving seed can fold a scripted battle through the SAME primitive the
// live table folds: one fold, two callers, zero drift. The bytes below are
// the App's own, unchanged beyond the export keyword — the law did not
// move, only its address did.
import { expandSpawn } from 'fatescript/protocol';
import { sealInitiative } from 'fatescript/rules';

export function applyCombat(current, update, hero, aids = {}) {
  if (!update) return current;
  if (update.op === 'end') return null;
  const next = current ? structuredClone(current) : { active: true, round: 1, enemies: [], order: [] };
  for (const enemy of update.enemy_add || []) if (!next.enemies.some((e) => e.id === enemy.id)) next.enemies.push(enemy);
  // THE BESTIARY LAW (Directive X, Law I): instances enter through the ONE
  // engine expansion — sealed species, deterministic letters, threat-table
  // hit points — so the client derives exactly what the bench derives.
  if (update.spawn) {
    for (const instance of expandSpawn(update.spawn, aids.bestiary || [])) {
      if (!next.enemies.some((e) => e.id === instance.id)) next.enemies.push(instance);
    }
  }
  for (const patch of update.enemy_update || []) {
    const enemy = next.enemies.find((e) => e.id === patch.id); if (!enemy) continue;
    enemy.hp = Math.max(0, Math.min(enemy.maxHp, enemy.hp + Number(patch.hp_delta || 0)));
    if (patch.zone) enemy.zone = patch.zone;
  }
  next.enemies = next.enemies.filter((enemy) => !(update.enemy_remove || []).includes(enemy.id));
  next.round += Number(update.round_delta || 0);
  // THE ROUND LAW (Directive X, Law III): the order is sealed ONCE at the
  // opening — device draws for the player's side, one pool draw per enemy
  // species group — and never reshuffled after; the downed and the fled
  // keep their seats. The sealed order rides the journal in stateAfter,
  // so a reload reads the seats, never re-rolls them.
  if (update.op === 'start') {
    const draws = (update.initiative?.entropy || []).map((entry) => ({ group: entry.group, value: (aids.entropy || [])[entry.index]?.value ?? 0 }));
    next.order = sealInitiative({ hero, party: aids.party || [], enemies: next.enemies, draws });
  }
  return next;
}
