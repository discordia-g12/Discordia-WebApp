import { ApiError } from './errors';

/**
 * Reglas de las imágenes que se suben (avatar e ícono de servidor). Son las mismas que valida el backend
 * (ADR-003 de Auth-User-Service): acá solo se revisa lo barato antes de mandar el archivo; el backend
 * vuelve a validar el contenido real, recorta a 256×256 y lo guarda en S3.
 */
export const IMAGE_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp';
export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(IMAGE_UPLOAD_ACCEPT.split(','));

/** Las subidas tardan más que un pedido común, sobre todo desde el celular. */
export const UPLOAD_TIMEOUT_MS = 30_000;

/**
 * Un archivo para subir: File o Blob en la web; en React Native, el objeto { uri, name, type } que su
 * FormData acepta como archivo.
 */
export type UploadableFile = Blob | { uri: string; name: string; type: string };

/**
 * Agrega el archivo al formulario con nombre (los servicios rechazan un archivo sin nombre). En React Native
 * el nombre ya viene en el objeto y el tercer argumento se ignora.
 */
export function appendFile(form: FormData, field: string, file: UploadableFile, fallbackName: string): void {
  if (file instanceof Blob) {
    form.append(field, file, typeof File !== 'undefined' && file instanceof File && file.name ? file.name : fallbackName);
  } else {
    form.append(field, file as unknown as Blob);
  }
}

/** Mensaje para mostrar si el archivo no se puede subir, o null si está bien. */
export function imageFileError(file: { type?: string; size: number }): string | null {
  if (!file.type || !ALLOWED_TYPES.has(file.type)) return 'Formato no permitido: usá JPEG, PNG o WebP.';
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) return 'La imagen pesa más de 5 MB.';
  return null;
}

/** Mensaje para mostrar cuando el backend rechaza la imagen o no la puede guardar. */
export function imageUploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400 || err.status === 422) {
      return 'La imagen no es válida: usá JPEG, PNG o WebP de hasta 5 MB y 4096×4096 px.';
    }
    if (err.status === 413) return 'La imagen pesa más de 5 MB.';
    if (err.status === 503) return 'No se pudo guardar la imagen. Probá de nuevo en un rato.';
  }
  return 'No se pudo subir la imagen.';
}
