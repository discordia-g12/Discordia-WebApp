// Constantes y tipos de ServerSettings, compartidos por sus pestañas.

export type TabType =
  | 'overview'
  | 'roles'
  | 'emojis'
  | 'boost'
  | 'channels'
  | 'moderation'
  | 'audit-log'
  | 'members'
  | 'bans'
  | 'notifications';

export const PERMISSION_CATEGORIES = [
  {
    category: 'General Server Permissions',
    permissions: [
      { id: 'ADMINISTRATOR', name: 'Administrator', desc: 'Grants all permissions and bypasses channel overrides.' },
      { id: 'MANAGE_SERVER', name: 'Manage Server', desc: 'Change server name, region, icon and vanity URL.' },
      { id: 'MANAGE_ROLES', name: 'Manage Roles', desc: 'Create, edit and delete roles lower than this one.' },
      { id: 'MANAGE_CHANNELS', name: 'Manage Channels', desc: 'Create, organize and delete channels in this server.' },
      { id: 'VIEW_[]', name: 'View Audit Log', desc: 'View administrative actions executed in this server.' },
    ],
  },
  {
    category: 'Membership Permissions',
    permissions: [
      { id: 'CREATE_INSTANT_INVITE', name: 'Create Invite', desc: 'Create permanent and temporary invite links.' },
      { id: 'KICK_MEMBERS', name: 'Kick Members', desc: 'Remove members from this server with optional reason.' },
      { id: 'BAN_MEMBERS', name: 'Ban Members', desc: 'Permanently ban accounts and delete recent messages.' },
      { id: 'CHANGE_NICKNAME', name: 'Change Nickname', desc: 'Allow members to customize their server nickname.' },
    ],
  },
  {
    category: 'Text Permissions',
    permissions: [
      { id: 'SEND_MESSAGES', name: 'Send Messages', desc: 'Post messages in text and thread channels.' },
      { id: 'ATTACH_FILES', name: 'Attach Files', desc: 'Upload images, videos, audio and documents.' },
      { id: 'ADD_REACTIONS', name: 'Add Reactions', desc: 'Add new emoji reactions to published messages.' },
      { id: 'MENTION_EVERYONE', name: 'Mention @everyone', desc: 'Trigger alerts to all members via @everyone and @here.' },
      { id: 'MANAGE_MESSAGES', name: 'Manage Messages', desc: 'Delete and pin messages authored by other members.' },
    ],
  },
  {
    category: 'Voice Permissions',
    permissions: [
      { id: 'CONNECT', name: 'Connect', desc: 'Join voice channels and hear participants.' },
      { id: 'SPEAK', name: 'Speak', desc: 'Transmit microphone audio in connected channels.' },
      { id: 'STREAM', name: 'Video & Screenshare', desc: 'Share webcam video or desktop screens.' },
      { id: 'MUTE_MEMBERS', name: 'Mute Members', desc: 'Server-mute other participants in voice rooms.' },
      { id: 'DEAFEN_MEMBERS', name: 'Deafen Members', desc: 'Server-deafen participants in voice rooms.' },
      { id: 'MOVE_MEMBERS', name: 'Move Members', desc: 'Move participants between different voice channels.' },
    ],
  },
];

export const PRESET_ROLE_COLORS = [
  '#99aab5', // Default
  '#5865f2', // Blurple
  '#23a55a', // Green
  '#f0b232', // Amber
  '#eb459e', // Fuchsia
  '#da373c', // Red
  '#00a8fc', // Cyan
  '#9b59b6', // Violet
];
