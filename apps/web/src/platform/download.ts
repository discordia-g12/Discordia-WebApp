/**
 * Descarga un archivo generado en memoria (un CSV exportado): Blob, enlace con `download` y clic. La URL del
 * Blob se libera después del clic.
 */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revocar en el mismo tick cancela la descarga en algunos navegadores
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
