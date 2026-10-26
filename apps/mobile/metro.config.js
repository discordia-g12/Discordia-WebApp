const { getDefaultConfig } = require('expo/metro-config');

// Expo detecta el monorepo (workspaces del package.json de la raíz) y ya observa y resuelve desde la raíz:
// los paquetes de packages/* y el código de la web que se importa con @shared/* (tsconfig.json).
const config = getDefaultConfig(__dirname);

module.exports = config;
