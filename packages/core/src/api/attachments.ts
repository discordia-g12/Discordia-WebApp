import { api, getClientConfig } from './client';
import { appendFile, UploadableFile } from './images';
import type { MessageAttachment } from '../types';

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const ATTACHMENT_ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
  '.zip',
];

export const ATTACHMENT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
];

export const ATTACHMENT_ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.zip';

/**
 * Convierte URLs relativas de adjuntos (ej. /api/v1/chat/uploads/...) a URLs absolutas
 * usando baseUrl del cliente configurado, asegurando que tanto web como mobile puedan resolverlas.
 */
export function resolveAttachmentUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const baseUrl = getClientConfig().baseUrl.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${baseUrl}${path}`;
}

/**
 * Da formato legible al tamaño en bytes de un archivo (B, KB, MB).
 */
export function formatAttachmentSize(bytes?: number | string): string {
  if (bytes === undefined || bytes === null) return '';
  const num = typeof bytes === 'number' ? bytes : Number(bytes);
  if (Number.isNaN(num)) return typeof bytes === 'string' ? bytes : '';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Valida formato y tamaño del archivo antes de subirlo.
 * Devuelve el mensaje de error o null si es válido.
 */
export function validateAttachmentFile(file: {
  name?: string;
  type?: string;
  size?: number;
}): string | null {
  if (file.size !== undefined && file.size > ATTACHMENT_MAX_BYTES) {
    return 'El archivo supera el tamaño máximo permitido de 10 MB.';
  }

  const name = file.name || '';
  const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')).toLowerCase() : '';
  const isExtAllowed = ATTACHMENT_ALLOWED_EXTENSIONS.includes(ext);
  const isMimeAllowed = file.type ? ATTACHMENT_ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) : false;

  if (!isExtAllowed && !isMimeAllowed) {
    return 'Formato de archivo no permitido. Usá imágenes (JPG, PNG, WebP, GIF) o documentos (PDF, TXT, ZIP).';
  }

  return null;
}

/**
 * Sube un archivo adjunto a un canal.
 */
export async function uploadAttachment(
  channelId: string,
  file: UploadableFile,
  fallbackName = 'archivo'
): Promise<MessageAttachment> {
  const form = new FormData();
  appendFile(form, 'file', file, fallbackName);

  const response = await api.post<MessageAttachment>(
    `/api/v1/chat/channels/${channelId}/attachments`,
    form,
    { timeoutMs: 45_000 }
  );

  return {
    ...response,
    url: resolveAttachmentUrl(response.url),
    type: response.type ?? response.contentType,
    contentType: response.contentType ?? response.type,
  };
}

