// Constantes y tipos de UserSettings, compartidos por sus pestañas.

export type SettingsTab =
  | 'profile'
  | 'security'
  | 'premium'
  | 'billing'
  | 'appearance'
  | 'voice'
  | 'notifications';

export const STATUS_CONFIG: Record<
  'online' | 'idle' | 'dnd' | 'invisible',
  { label: string; color: string }
> = {
  online: { label: 'Online', color: '#23a55a' },
  idle: { label: 'Idle', color: '#f0b232' },
  dnd: { label: 'Do Not Disturb', color: '#f23f43' },
  invisible: { label: 'Invisible', color: '#80848e' },
};

export const BACKUP_CODES = [
  'A8F4-B92C',
  '39DE-81FC',
  '7B12-9A4E',
  '55D2-CC41',
  '901A-EE88',
  '2F44-B109',
  '88AA-1122',
  '66FE-3310',
];
