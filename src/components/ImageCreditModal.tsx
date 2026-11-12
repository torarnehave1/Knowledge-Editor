import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBrand } from '../branding';

// Photo credit for one image in a node. Stored on the node as imageAttributions[<image url>],
// the same shape vegvisr-frontend (GNewViewer) writes and shows, so both viewers agree.
export interface ImageAttribution {
  provider: 'custom' | string;
  photographer: string | null;
  photographer_url: string | null;
  custom_attribution: string | null;
  requires_attribution: boolean;
  [key: string]: any;
}

const TEXT = {
  no: {
    title: 'Kreditering av bilde',
    name: 'Fotograf',
    namePh: 'Navn på fotografen',
    url: 'Lenke (valgfri)',
    urlPh: 'https://…',
    extra: 'Tilleggstekst (valgfri)',
    extraPh: 'For eksempel «Modell: Kari»',
    badUrl: 'Lenken må begynne med https:// eller http://',
    save: 'Lagre',
    remove: 'Fjern kreditering',
    cancel: 'Avbryt',
  },
  en: {
    title: 'Image credit',
    name: 'Photographer',
    namePh: "Photographer's name",
    url: 'Link (optional)',
    urlPh: 'https://…',
    extra: 'Extra text (optional)',
    extraPh: 'For example "Model: Kari"',
    badUrl: 'The link must start with https:// or http://',
    save: 'Save',
    remove: 'Remove credit',
    cancel: 'Cancel',
  },
};

interface Props {
  imageUrl: string;
  current: ImageAttribution | null;
  onSave: (attribution: ImageAttribution) => void;
  onRemove: () => void;
  onClose: () => void;
}

export default function ImageCreditModal({ imageUrl, current, onSave, onRemove, onClose }: Props) {
  const t = TEXT[useBrand().lang];
  const [name, setName] = useState(current?.photographer || '');
  const [url, setUrl] = useState(current?.photographer_url || '');
  const [extra, setExtra] = useState(current?.custom_attribution || '');
  const urlOk = !url.trim() || /^https?:\/\//i.test(url.trim());
  const canSave = urlOk && !!(name.trim() || extra.trim());

  const save = () => {
    if (!canSave) return;
    onSave({
      ...(current || {}),
      provider: 'custom',
      photographer: name.trim() || null,
      photographer_url: url.trim() || null,
      custom_attribution: extra.trim() || null,
      requires_attribution: true,
    });
  };

  const field = 'w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#4f46e5)]';

  // Portal to <body>: the node card is a motion.div with a transform, which would pin a
  // position:fixed overlay to the card instead of the window.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.title}
        className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{t.title}</h3>
          <button onClick={onClose} aria-label={t.cancel} className="p-1 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X size={18} />
          </button>
        </div>
        <img src={imageUrl} alt="" className="w-full max-h-40 object-cover rounded-lg" style={{ margin: 0 }} />
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.name}</span>
          <input autoFocus className={field} value={name} placeholder={t.namePh} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.url}</span>
          <input className={field} value={url} placeholder={t.urlPh} inputMode="url" onChange={(e) => setUrl(e.target.value)} />
          {!urlOk && <span className="text-xs text-red-600">{t.badUrl}</span>}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t.extra}</span>
          <input className={field} value={extra} placeholder={t.extraPh} onChange={(e) => setExtra(e.target.value)} />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          {current ? (
            <button onClick={onRemove} className="text-sm text-red-600 hover:underline">{t.remove}</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200">{t.cancel}</button>
            <button
              onClick={save}
              disabled={!canSave}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'var(--color-accent, #4f46e5)' }}
            >
              {t.save}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
