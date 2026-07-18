// ============================================================
// THE RETRACTION INSTRUMENT (Directive XI, Law I; hoisted 0.9.0).
// The pour may only ever GROW: any narration node removed, or any
// narration text rewritten to anything but a strict extension of
// what stood, is a retraction — the crime the curtain retired.
// ONE law, two doors: G5 arms it over the live sitting, and tooth
// 19 proves its bite on a synthetic mid-pour node swap before any
// court trusts its silence. The function is self-contained by law
// — page.evaluate serializes it whole, so it may close over
// nothing. (X-Card redaction lawfully removes entries; the courts
// that arm this never invoke it.)
// ============================================================
export function armRetractionObserver(): void {
  const w = window as unknown as { __retractions: string[] };
  w.__retractions = [];
  const arm = () => {
    const main = document.querySelector('main.adventure-log');
    if (!main) { setTimeout(arm, 100); return; }
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') {
          const parent = record.target.parentElement;
          if (!parent || !parent.closest('.narration')) continue;
          const oldText = record.oldValue || '';
          const nowText = record.target.textContent || '';
          if (!nowText.startsWith(oldText)) w.__retractions.push(`rewrote "…${oldText.slice(-40)}" -> "…${nowText.slice(-40)}"`);
        } else if (record.type === 'childList' && record.removedNodes.length) {
          for (const node of Array.from(record.removedNodes)) {
            const el = node as Element;
            const inNarration = el.nodeType === 1
              ? ((el.classList && el.classList.contains('narration')) || Boolean(el.querySelector && el.querySelector('.narration')) || Boolean((record.target as Element).closest && (record.target as Element).closest('.narration')))
              : Boolean((record.target as Element).closest && (record.target as Element).closest('.narration'));
            if (inNarration) w.__retractions.push(`removed <${el.nodeName.toLowerCase()}> "${(el.textContent || '').slice(0, 60)}"`);
          }
        }
      }
    });
    observer.observe(main, { subtree: true, childList: true, characterData: true, characterDataOldValue: true });
  };
  arm();
}
