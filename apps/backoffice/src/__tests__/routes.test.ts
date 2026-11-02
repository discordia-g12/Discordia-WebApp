import { describe, expect, it } from 'vitest';
import { pathForSection, sectionFromPath, SECTIONS } from '../routes';

describe('rutas del backoffice', () => {
  it('la sección sale del primer segmento de la URL', () => {
    expect(sectionFromPath('/servidores')).toBe('servidores');
    expect(sectionFromPath('/expedientes/u1')).toBe('expedientes');
    expect(sectionFromPath('/observabilidad/')).toBe('observabilidad');
  });

  it('una ruta desconocida o la raíz no es una sección', () => {
    expect(sectionFromPath('/')).toBeNull();
    expect(sectionFromPath('/callback')).toBeNull();
    expect(sectionFromPath('/admin')).toBeNull();
  });

  it('cada sección tiene una URL que vuelve a la misma sección', () => {
    for (const section of SECTIONS) {
      expect(sectionFromPath(pathForSection(section.id))).toBe(section.id);
    }
  });
});
