// THE GALLERY HOOK & THE FRAME (lean door, XX Law V) — the two small pieces
// the entry itself needs: the table wears faces through useGallery, and the
// Frame is shared modal chrome. They sit in their own module so the heavy
// overlay folios can arrive lazily without the entry dragging them along.
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { db } from '../lib/db.js';

export function useGallery(campaign) {
  const [gallery, setGallery] = useState({});
  useEffect(() => {
    let urls = [], alive = true;
    (async () => {
      // (Directive XIV) The table itself now wears faces on a chip — the
      // hook must stand quietly when no tale is open yet.
      if (!campaign) { if (alive) setGallery({}); return; }
      const rows = await db.media.where('campaignId').equals(campaign.id).toArray();
      const latest = {};
      for (const row of rows) {
        if (row.kind !== 'paint' || !row.blob || !row.label) continue;
        if (!latest[row.label] || latest[row.label].createdAt < row.createdAt) latest[row.label] = row;
      }
      const out = {};
      for (const [label, row] of Object.entries(latest)) { const u = URL.createObjectURL(row.blob); urls.push(u); out[label] = u; }
      if (alive) setGallery(out); else urls.forEach(URL.revokeObjectURL);
    })();
    return () => { alive = false; urls.forEach(URL.revokeObjectURL); };
  }, [campaign?.id, campaign?.logs?.length]);
  return gallery;
}

export function Frame({ title, icon, onClose, children, wide = false }) {
  return <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section className={`modal ${wide ? 'wide' : ''}`}><header><span>{icon}<h2>{title}</h2></span><button onClick={onClose} aria-label="Close"><X/></button></header>{children}</section></div>;
}
