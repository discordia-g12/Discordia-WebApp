// Constantes y tipos de OwnProfileView, compartidos por sus pestañas.

export type ProfileMode = 'view' | 'edit' | 'saving';

export const PRESET_BANNER_COLORS = [
  '#5865f2', // Blurple
  '#3ba55d', // Green
  '#faa81a', // Amber / Orange
  '#eb459e', // Pink
  '#ed4245', // Red
  '#593695', // Purple
  '#23272a', // Dark
  '#00a8fc', // Cyan / Light Blue
];

export const STATUS_CONFIG: Record<
  'online' | 'idle' | 'dnd' | 'invisible',
  { label: string; color: string; desc: string }
> = {
  online: { label: 'Online', color: '#23a55a', desc: 'Available for chats and calls' },
  idle: { label: 'Idle', color: '#f0b232', desc: 'Away from keyboard' },
  dnd: { label: 'Do Not Disturb', color: '#f23f43', desc: 'Mute desktop notifications' },
  invisible: { label: 'Invisible', color: '#80848e', desc: 'Appear offline to friends' },
};
