// Image upload + drag/paste extraction — parity with the legacy GNewViewer
// node edit modal (vegvisr-frontend/src/views/GNewViewer.vue, handleDrop /
// handleNodeContentPaste / uploadAndInsertImage).
//
// Upload target: api-worker `/upload` → R2 (MY_R2_BUCKET) → returns
// { url: "https://blog.vegvisr.org/<timestamp>.<ext>" }. No auth header; CORS is `*`.

const UPLOAD_ENDPOINT = 'https://api.vegvisr.org/upload';

const IMAGE_EXTENSION_RE = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|heic|tiff?)(\?.*)?$/i;

// MIME → extension, used when the dropped/pasted blob has no usable filename.
// The worker derives the R2 key's extension from the filename and 400s without one.
const MIME_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/tiff': 'tiff',
};

export const isImageFile = (file: File): boolean =>
  file.type.startsWith('image/') || IMAGE_EXTENSION_RE.test(file.name || '');

export const looksLikeImageUrl = (url: string): boolean =>
  IMAGE_EXTENSION_RE.test(url) || url.includes('imgix') || url.includes('r2') ||
  url.includes('blog.vegvisr.org');

// Give the blob a filename the worker can read an extension from.
const filenameFor = (file: File): string => {
  const name = file.name || '';
  if (name && /\.[a-z0-9]+$/i.test(name)) return name;
  const ext = MIME_EXTENSION[file.type] || 'png';
  return `${name || 'pasted-image'}.${ext}`;
};

export const altTextFor = (source: string): string =>
  source.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim() || 'image';

// Markdown form is the legacy one: ![alt|width: 300px](url).
// NodeRenderer's `img` override splits alt on '|' and applies the styles.
export const buildImageSnippet = (url: string, altText: string, isHtmlNode: boolean): string =>
  isHtmlNode
    ? `<img src="${url}" alt="${altText}" style="max-width: 100%; height: auto;" />\n`
    : `\n![${altText}|width: 300px](${url})\n`;

// Pull an image URL out of a drop that carried no file — the macOS Photos app and
// the Vegvisr photos app both hand over text/uri-list; browsers dragging an <img>
// hand over text/html; some sources only give text/plain.
export const imageUrlFromDataTransfer = (dt: DataTransfer | null): string | null => {
  if (!dt) return null;

  const uriList = dt.getData('text/uri-list');
  if (uriList) {
    const first = uriList.split('\n').map((l) => l.trim()).find((l) => l && !l.startsWith('#'));
    if (first) return first;
  }

  const html = dt.getData('text/html');
  if (html) {
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m) return m[1];
  }

  const plain = dt.getData('text/plain')?.trim();
  if (plain && /^https?:\/\//i.test(plain)) return plain.split(/\s+/)[0];

  return null;
};

// Pull a pasted image out of the clipboard: by MIME type first, then by file
// extension for sources that hand over a File with no usable type.
export const imageFileFromClipboard = (clipboardData: DataTransfer | null): File | null => {
  if (!clipboardData) return null;

  for (const item of Array.from(clipboardData.items || [])) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }

  const files = clipboardData.files;
  if (files && files.length > 0 && isImageFile(files[0])) return files[0];

  return null;
};

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file, filenameFor(file));
  formData.append('type', 'image');

  const response = await fetch(UPLOAD_ENDPOINT, { method: 'POST', body: formData });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Upload failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`);
  }

  const data: any = await response.json();
  const url =
    data?.url ||
    (Array.isArray(data?.urls) && data.urls.length > 0 ? data.urls[0] : null) ||
    data?.imageUrl ||
    data?.path ||
    data?.link;

  if (!url) throw new Error(`Upload returned no image URL: ${JSON.stringify(data)}`);
  return url as string;
};
