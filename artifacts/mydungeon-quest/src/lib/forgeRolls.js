// Compat seat — the Hooked World cut addresses the engine by its old
// in-game path; the engine answers from its true home.
export * from 'fatescript/forgeRolls';

// THE LOOK DIE (G3) — the deep forge promises a die beside every field.
// 0.9.1: the look table moved to the smith's one seat (Directive XIII);
// this seat re-exports it so every old address still answers, arithmetic
// unchanged: a seed in, a value out, deterministic for the proving rig.
export { LOOKS, rollLook } from 'fatescript/smith';
