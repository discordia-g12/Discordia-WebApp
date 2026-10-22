// Lógica compartida entre la web y la app mobile (paso 1.2 de docs/TODO-REDISENO.md).
// Sin dependencias de plataforma: nada de import.meta.env / process.env ni APIs del DOM más allá de fetch.
// La configuración (URL de la API, token) entra por configureClient.
export * from './types';
export * from './api/client';
export * from './api/errors';
export * from './api/mock';
export * from './api/users';
export * from './api/passwordReset';
export * from './api/channelLayout';
export * from './api/servers';
export * from './api/roles';
export * from './api/moderation';
export * from './api/messages';
export * from './api/voice';
