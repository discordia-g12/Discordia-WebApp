import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES, getPreferences, initPreferences, sanitizePreferences, usePreferences } from '../preferences';
import { levelFromRms, selectedDevice, SYSTEM_DEVICE } from '../../features/voice/audioDevices';

describe('preferencias de este navegador', () => {
  afterEach(() => {
    localStorage.removeItem('discordia_preferences');
    usePreferences.setState(DEFAULT_PREFERENCES);
  });

  it('sin nada guardado, o con algo roto, son las de por defecto', () => {
    expect(sanitizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences('no es un objeto')).toEqual(DEFAULT_PREFERENCES);
    expect(sanitizePreferences({ sounds: 'sí', messageMode: 'gigante', inputDeviceId: '' })).toEqual(DEFAULT_PREFERENCES);
  });

  it('respeta lo guardado y acota los números', () => {
    const prefs = sanitizePreferences({ sounds: false, messageMode: 'compact', chatFontSize: 40, outputVolume: -5, outputDeviceId: 'abc' });
    expect(prefs).toMatchObject({ sounds: false, messageMode: 'compact', chatFontSize: 20, outputVolume: 0, outputDeviceId: 'abc' });
  });

  it('setPreference guarda en localStorage y getPreferences lo lee sin las funciones', () => {
    usePreferences.getState().setPreference('unreadBadge', false);
    expect(JSON.parse(localStorage.getItem('discordia_preferences') ?? '{}').unreadBadge).toBe(false);
    expect(getPreferences()).toEqual({ ...DEFAULT_PREFERENCES, unreadBadge: false });
  });

  it('el tamaño de letra del chat va en una variable de <html>', () => {
    initPreferences();
    expect(document.documentElement.style.getPropertyValue('--chat-font-size')).toBe('15px');
    usePreferences.getState().setPreference('chatFontSize', 17);
    expect(document.documentElement.style.getPropertyValue('--chat-font-size')).toBe('17px');
  });
});

describe('dispositivos de audio', () => {
  it('un dispositivo desconectado se muestra como el del sistema', () => {
    const devices = [SYSTEM_DEVICE, { id: 'mic-1', label: 'USB' }];
    expect(selectedDevice(devices, 'mic-1')).toBe('mic-1');
    expect(selectedDevice(devices, 'mic-viejo')).toBe('default');
  });

  it('el nivel del micrófono va de 0 a 100', () => {
    expect(levelFromRms(0)).toBe(0);
    expect(levelFromRms(-1)).toBe(0);
    expect(levelFromRms(0.1)).toBeGreaterThan(30);
    expect(levelFromRms(1)).toBe(100);
  });
});
