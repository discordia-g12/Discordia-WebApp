// Datos y respuestas simuladas para desarrollo sin backend y para tests. Se importa aparte
// (@discordia/core/testing) para que nunca entre al bundle de producción por el import principal.
export * from './data';
export * from './apiMock';
export * from './dmMock';
export * from './callMock';
