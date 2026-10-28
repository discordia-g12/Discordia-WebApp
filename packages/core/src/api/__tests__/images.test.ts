import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configureClient } from '../client';
import { ApiError } from '../errors';
import { IMAGE_UPLOAD_MAX_BYTES, imageFileError, imageUploadErrorMessage } from '../images';
import { createServer } from '../servers';
import { updateMyProfile, uploadMyAvatar } from '../users';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('imageFileError', () => {
  it('acepta JPEG, PNG y WebP de hasta 5 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(imageFileError({ type, size: IMAGE_UPLOAD_MAX_BYTES })).toBeNull();
    }
  });

  it('rechaza otros formatos y archivos más grandes', () => {
    expect(imageFileError({ type: 'image/gif', size: 10 })).toBe('Formato no permitido: usá JPEG, PNG o WebP.');
    expect(imageFileError({ type: '', size: 10 })).toBe('Formato no permitido: usá JPEG, PNG o WebP.');
    expect(imageFileError({ type: 'image/png', size: IMAGE_UPLOAD_MAX_BYTES + 1 })).toBe('La imagen pesa más de 5 MB.');
  });
});

describe('imageUploadErrorMessage', () => {
  it('traduce los rechazos del backend por código', () => {
    expect(imageUploadErrorMessage(new ApiError({ status: 422 }))).toMatch(/no es válida/);
    expect(imageUploadErrorMessage(new ApiError({ status: 400 }))).toMatch(/no es válida/);
    expect(imageUploadErrorMessage(new ApiError({ status: 413 }))).toBe('La imagen pesa más de 5 MB.');
    expect(imageUploadErrorMessage(new ApiError({ status: 503 }))).toMatch(/Probá de nuevo/);
    expect(imageUploadErrorMessage(new Error('red'))).toBe('No se pudo subir la imagen.');
  });
});

describe('uploadMyAvatar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    configureClient({
      baseUrl: 'http://localhost:8000',
      getToken: vi.fn().mockResolvedValue('jwt-token'),
      onAuthFailure: vi.fn(),
      timeoutMs: 500,
      sendForm: undefined,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sube el archivo como multipart en el campo "file" y devuelve el perfil con la URL nueva', async () => {
    const url = 'https://discordia-g12-media.s3.us-east-1.amazonaws.com/avatars/abc.webp';
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ user_id: 'u1', username: 'mar', avatar_url: url }));
    globalThis.fetch = fetchMock;
    const file = new File(['x'], 'yo.png', { type: 'image/png' });

    const profile = await uploadMyAvatar(file);

    const [requestUrl, init] = fetchMock.mock.calls[0];
    expect(requestUrl).toBe('http://localhost:8000/api/v1/users/me/profile/avatar');
    expect(init.method).toBe('PATCH');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body.get('file') as File).name).toBe('yo.png');
    // El navegador arma el Content-Type con el boundary: no hay que fijarlo a mano
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(profile.avatar).toBe(url);
    expect(profile.id).toBe('u1');
  });

  it('le pone nombre al archivo si llega un Blob sin nombre (el backend lo exige)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ user_id: 'u1', username: 'mar' }));
    globalThis.fetch = fetchMock;

    await uploadMyAvatar(new Blob(['x'], { type: 'image/png' }));

    expect((fetchMock.mock.calls[0][1].body.get('file') as File).name).toBe('avatar');
  });

  it('un rechazo del backend llega como ApiError con su código', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(jsonResponse({ detail: 'Format not allowed' }, 422));

    await expect(uploadMyAvatar(new File(['x'], 'yo.png', { type: 'image/png' }))).rejects.toMatchObject({ status: 422 });
  });

  it('updateMyProfile no manda avatar_url si no se le pasa', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ user_id: 'u1', username: 'mar' }));
    globalThis.fetch = fetchMock;

    await updateMyProfile({ display_name: 'Mar' });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ display_name: 'Mar' });
  });

  it('con sendForm configurado (mobile), los formularios van por ahí con el token y los JSON siguen por fetch', async () => {
    const sendForm = vi.fn().mockResolvedValue(jsonResponse({ user_id: 'u1', username: 'mar', avatar_url: 'https://x/a.webp' }));
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ user_id: 'u1', username: 'mar' }));
    globalThis.fetch = fetchMock;
    configureClient({ sendForm });

    const profile = await uploadMyAvatar(new File(['x'], 'yo.png', { type: 'image/png' }));
    await updateMyProfile({ display_name: 'Mar' });

    expect(sendForm).toHaveBeenCalledTimes(1);
    const [url, init] = sendForm.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/users/me/profile/avatar');
    expect(init.method).toBe('PATCH');
    expect(init.headers.Authorization).toBe('Bearer jwt-token');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(profile.avatar).toBe('https://x/a.webp');
    // El PATCH de texto no pasa por sendForm
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('un error de red de sendForm llega como NetworkError', async () => {
    configureClient({ sendForm: vi.fn().mockRejectedValue(new Error('sin red')) });

    await expect(uploadMyAvatar(new Blob(['x']))).rejects.toMatchObject({ name: 'NetworkError' });
  });
});

describe('createServer', () => {
  beforeEach(() => {
    configureClient({
      baseUrl: 'http://localhost:8000',
      getToken: vi.fn().mockResolvedValue('jwt-token'),
      onAuthFailure: vi.fn(),
      timeoutMs: 500,
      sendForm: undefined,
    });
  });

  const rawServer = { id: 's1', name: 'Torton', owner_id: 'me', created_at: '2026-01-01T00:00:00Z', channels: [], categories: [] };

  it('manda el ícono con su nombre, o "icon" si es un Blob sin nombre', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ ...rawServer, icon_url: 'https://x/i.webp' }));
    globalThis.fetch = fetchMock;

    const server = await createServer({ name: 'Torton', icon: new File(['x'], 'mio.png', { type: 'image/png' }) });
    await createServer({ name: 'Torton', icon: new Blob(['x'], { type: 'image/png' }) });

    expect((fetchMock.mock.calls[0][1].body.get('icon') as File).name).toBe('mio.png');
    expect((fetchMock.mock.calls[1][1].body.get('icon') as File).name).toBe('icon');
    expect(server.iconUrl).toBe('https://x/i.webp');
  });

  it('sin ícono no manda el campo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(rawServer));
    globalThis.fetch = fetchMock;

    await createServer({ name: 'Torton' });

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('name')).toBe('Torton');
    expect(body.has('icon')).toBe(false);
  });
});
