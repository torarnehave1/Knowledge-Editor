import { useState } from 'react';
import { FileText, StickyNote, Type, Info, Image as ImageIcon, Youtube, Code, MessageSquare, Film } from 'lucide-react';
import { NodeType } from '../types';
import { useStore } from '../store/useStore';
import { knowledgeService } from '../services/knowledgeService';
import RealtimeVideoPicker from './RealtimeVideoPicker';
import { buildRealtimeVideoInfo, recordingLabel } from '../services/realtimeVideos';

// `templateId` entries pull content from a canonical graphTemplates row.
// `contactMarker` entries insert a tiny SSOT marker that the contact-form web
// component (served from the Component Registry graph) mounts live — no blob.
const CONTACT_ENDPOINT = 'https://brand-worker.torarnehave.workers.dev/__contact';

export interface SectionType {
  type: NodeType;
  label: string;
  icon: any;
  color: string;
  templateId?: string;
  contactMarker?: boolean;
  videoPicker?: boolean;
}

export const nodeTypes: SectionType[] = [
  { type: 'fulltext', label: 'Full Text', icon: FileText, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  { type: 'notes', label: 'Work Note', icon: StickyNote, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { type: 'title', label: 'Title', icon: Type, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { type: 'info', label: 'Info Box', icon: Info, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { type: 'image', label: 'Image', icon: ImageIcon, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  { type: 'youtube-video', label: 'YouTube', icon: Youtube, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { type: 'realtime-video', label: 'Realtime Video', icon: Film, color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', videoPicker: true },
  { type: 'html-node', label: 'HTML Section', icon: Code, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { type: 'html-node', label: 'Kontaktskjema', icon: MessageSquare, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', contactMarker: true },
];

// Shared by the desktop sidebar and the mobile add-section sheet. `onAdded`
// fires once a node has actually been created (not when a picker only opens).
export function useAddSection(onAdded?: () => void) {
  const { addNode } = useStore();
  const [insertingTemplate, setInsertingTemplate] = useState<string | null>(null);
  const [isVideoPickerOpen, setIsVideoPickerOpen] = useState(false);

  const handleAddSection = async (item: SectionType) => {
    if (item.videoPicker) {
      // Pick the recording first — a realtime-video node without a path
      // renders an empty player, so the node is created from the selection.
      setIsVideoPickerOpen(true);
      return;
    }
    if (item.contactMarker) {
      // SSOT marker — the contact-form component mounts it live (in the editor
      // iframe and on the published page). graph/node ids are stamped on save.
      addNode('html-node', {
        label: 'Kontaktskjema',
        // Self-contained marker: carries its own <script> so it mounts anywhere
        // it renders in an iframe/page (editor, gnew-viewer, published) without
        // depending on host-side injection. graph/node ids stamped on save.
        info: `<div data-vegvisr-contact data-endpoint="${CONTACT_ENDPOINT}"></div><script src="https://api.vegvisr.org/components/contact-form.js" defer></script>`,
        color: '#0f2a43',
      });
      onAdded?.();
      return;
    }
    if (!item.templateId) {
      addNode(item.type);
      onAdded?.();
      return;
    }
    if (insertingTemplate) return;
    setInsertingTemplate(item.label);
    try {
      const nodes = await knowledgeService.getTemplateNodes(item.templateId);
      const source = nodes.find((n) => n.type === 'html-node') || nodes[0];
      if (!source) throw new Error('Template has no nodes');
      addNode('html-node', { label: source.label, info: source.info, color: source.color });
      onAdded?.();
    } catch (err) {
      console.error(`Failed to insert "${item.label}" template`, err);
      alert(`Kunne ikke hente malen «${item.label}». Prøv igjen.`);
    } finally {
      setInsertingTemplate(null);
    }
  };

  const videoPicker = (
    <RealtimeVideoPicker
      open={isVideoPickerOpen}
      onClose={() => setIsVideoPickerOpen(false)}
      onSelect={(rec) => {
        setIsVideoPickerOpen(false);
        addNode('realtime-video', {
          label: recordingLabel(rec),
          color: '#e0ecff',
          info: buildRealtimeVideoInfo(rec),
          path: rec.path,
          publicUrl: rec.url || null,
          bibl: rec.url ? [rec.url] : [],
        });
        onAdded?.();
      }}
    />
  );

  return { handleAddSection, insertingTemplate, videoPicker };
}
