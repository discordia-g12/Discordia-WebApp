import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import {
  validateAttachmentFile,
  uploadAttachment,
  resolveAttachmentUrl,
  formatAttachmentSize,
  ATTACHMENT_MAX_BYTES,
} from '../attachments';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('attachments api', () => {
  beforeEach(() => configureClient({ baseUrl: 'http://api.test' }));
  afterEach(() => vi.restoreAllMocks());

  describe('validateAttachmentFile', () => {
    it('permite formatos válidos dentro del límite', () => {
      expect(validateAttachmentFile({ name: 'foto.jpg', type: 'image/jpeg', size: 1024 })).toBeNull();
      expect(validateAttachmentFile({ name: 'foto.png', type: 'image/png', size: 2048 })).toBeNull();
      expect(validateAttachmentFile({ name: 'anim.gif', type: 'image/gif', size: 4096 })).toBeNull();
      expect(validateAttachmentFile({ name: 'doc.pdf', type: 'application/pdf', size: 8192 })).toBeNull();
      expect(validateAttachmentFile({ name: 'notas.txt', type: 'text/plain', size: 512 })).toBeNull();
      expect(validateAttachmentFile({ name: 'archivo.zip', type: 'application/zip', size: 1024 })).toBeNull();
    });

    it('rechaza formato no soportado (CA 2)', () => {
      const err = validateAttachmentFile({ name: 'malware.exe', type: 'application/x-msdownload', size: 1024 });
      expect(err).toBe(
        'Formato de archivo no permitido. Usá imágenes (JPG, PNG, WebP, GIF) o documentos (PDF, TXT, ZIP).'
      );
    });

    it('rechaza archivo demasiado grande (CA 3)', () => {
      const err = validateAttachmentFile({
        name: 'foto.png',
        type: 'image/png',
        size: ATTACHMENT_MAX_BYTES + 1,
      });
      expect(err).toBe('El archivo supera el tamaño máximo permitido de 10 MB.');
    });
  });

  describe('uploadAttachment', () => {
    it('sube el archivo al endpoint del canal y devuelve el adjunto', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse(
          {
            id: 'att-123',
            name: 'foto.png',
            url: 'http://api.test/uploads/foto.png',
            size: 2048,
            contentType: 'image/png',
          },
          201
        )
      );

      const blob = new Blob(['dummy content'], { type: 'image/png' });
      const att = await uploadAttachment('c1', blob, 'foto.png');

      expect(att.id).toBe('att-123');
      expect(att.name).toBe('foto.png');
      expect(att.url).toBe('http://api.test/uploads/foto.png');
      expect(att.type).toBe('image/png');
      expect(att.contentType).toBe('image/png');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('http://api.test/api/v1/chat/channels/c1/attachments');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBeInstanceOf(FormData);
    });

    it('resuelve URLs relativas agregando la baseUrl configurada', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse(
          {
            id: 'att-456',
            name: 'foto.png',
            url: '/api/v1/chat/uploads/attachments/c1/att-456-foto.png',
            size: 1024,
            contentType: 'image/png',
          },
          201
        )
      );

      const blob = new Blob(['x'], { type: 'image/png' });
      const att = await uploadAttachment('c1', blob, 'foto.png');
      expect(att.url).toBe('http://api.test/api/v1/chat/uploads/attachments/c1/att-456-foto.png');
    });
  });

  describe('resolveAttachmentUrl', () => {
    it('mantiene URLs absolutas intactas', () => {
      expect(resolveAttachmentUrl('https://s3.amazonaws.com/bucket/pic.png')).toBe(
        'https://s3.amazonaws.com/bucket/pic.png'
      );
      expect(resolveAttachmentUrl('http://cdn.com/file.pdf')).toBe('http://cdn.com/file.pdf');
    });

    it('antepone baseUrl a rutas relativas', () => {
      expect(resolveAttachmentUrl('/api/v1/chat/uploads/file.png')).toBe(
        'http://api.test/api/v1/chat/uploads/file.png'
      );
      expect(resolveAttachmentUrl('uploads/file.png')).toBe('http://api.test/uploads/file.png');
    });

    it('maneja strings vacíos o undefined', () => {
      expect(resolveAttachmentUrl('')).toBe('');
      expect(resolveAttachmentUrl(undefined)).toBe('');
    });
  });

  describe('formatAttachmentSize', () => {
    it('formatea tamaños adecuadamente', () => {
      expect(formatAttachmentSize(500)).toBe('500 B');
      expect(formatAttachmentSize(2048)).toBe('2.0 KB');
      expect(formatAttachmentSize(5 * 1024 * 1024)).toBe('5.0 MB');
      expect(formatAttachmentSize(undefined)).toBe('');
    });
  });
});

