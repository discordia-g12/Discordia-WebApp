// Lógica compartida entre la web y la app mobile (paso 1.2 de docs/TODO-REDISENO.md).
// Sin dependencias de plataforma: nada de import.meta.env / process.env ni APIs del DOM más allá de fetch.
// La configuración entra por configureClient (URL de la API) y configureAuth (Auth0); la plataforma
// aporta su adaptador de autenticación con setAuthAdapter.
export * from './types';
export * from './auth/adapter';
export * from './auth/config';
export * from './auth/errors';
export * from './auth/auth0';
export * from './auth/session';
export * from './auth/roles';
export * from './auth/forms';
export * from './api/client';
export * from './api/errors';
export * from './api/mock';
export * from './api/users';
export * from './api/images';
export * from './api/passwordReset';
export * from './api/channelLayout';
export * from './api/servers';
export * from './api/roles';
export * from './api/moderation';
export * from './api/serverTransfer';
export * from './api/messages';
export * from './api/attachments';
export * from './api/readStates';
export * from './api/voice';
export * from './api/twoFactor';
export * from './api/friends';
export * from './api/blocks';
export * from './api/conversations';
export * from './api/presence';

// Hooks de React (React Query y perfiles), los mismos en web y mobile
export * from './hooks/useApi';
export * from './hooks/messageCache';
export * from './hooks/useUnread';
export * from './hooks/useUserProfiles';
export * from './hooks/useChatSocket';
export * from './hooks/inboxCache';
export * from './hooks/useFriends';
export * from './hooks/useConversations';
export * from './hooks/useInbox';

// Ajustes del servidor: roles, miembros y baneos (estado y reglas compartidos)
export * from './admin/permissions';
export * from './admin/roles';
export * from './admin/members';

// Backoffice de staff: estado de la plataforma (health checks agregados por el backend)
export * from './admin/platformStatus';

// Chat: fechas y agrupado de los mensajes; tiempo real sin React
export * from './chat/format';
export * from './chat/mentions';
export * from './realtime/chatSocket';
export * from './realtime/inboxSocket';

// Mensajes directos: las reglas de producto, iguales en web y mobile
export * from './dm/inboxList';
export * from './dm/actions';
export * from './dm/errors';
export * from './dm/friendRequestJoke';

// Voz: la sala y la presencia son las mismas en web y mobile; cada app registra su VoicePlatform
export * from './voice/platform';
export * from './hooks/useVoiceRoom';
export * from './hooks/useVoicePresence';
