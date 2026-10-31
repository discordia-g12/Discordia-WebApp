import http from 'http';
import { WebSocketServer } from 'ws';

const PORT = 8000;
const TEST_USER_ID = 'auth0|6ae25c494d4ba47b0ff49739';
// Otro miembro de todos los servidores, para las menciones (#46)
const OTHER_USER = { user_id: 'auth0|e2e-ana', username: 'ana_e2e', display_name: 'Ana E2E' };

let servers = [];
// Mensajes por canal, roles por servidor y hasta qué mensaje leyó el usuario de prueba en cada canal
let messages = {};
let roles = {};
let readUpTo = {};
let nextMessage = 1;

// Mismas expresiones que Chat-Engine (src/helpers/mentions.ts)
const USER_MENTION = /<@([^\s<>@&]{1,128})>/g;
const ROLE_MENTION = /<@&([^\s<>@&]{1,128})>/g;
const EVERYONE = /(?<![\w@])@everyone(?![\w-])/;

/** Como Chat-Engine al enviar. En el mock el único que escribe es el dueño: tiene MENTION_EVERYONE. */
function parseMentions(content, serverId) {
  const unique = (re) => [...new Set([...content.matchAll(re)].map((m) => m[1]))];
  const serverRoles = (roles[serverId] ?? []).map((r) => r.id);
  return {
    users: unique(USER_MENTION),
    roles: unique(ROLE_MENTION).filter((id) => serverRoles.includes(id)),
    everyone: EVERYONE.test(content),
  };
}

function serverOfChannel(channelId) {
  return servers.find((srv) => srv.channels.some((ch) => ch.id === channelId))?.id;
}

function addMessage({ channelId, authorId, content, mentions }) {
  const message = {
    id: `msg-${String(nextMessage++).padStart(6, '0')}`,
    content,
    authorId,
    channelId,
    createdAt: new Date().toISOString(),
    mentions: mentions ?? { users: [], roles: [], everyone: false },
  };
  (messages[channelId] ??= []).push(message);
  return message;
}

/** Como GET /unread de Chat-Engine, para el usuario de prueba (que no tiene roles propios). */
function unreadChannels() {
  return Object.entries(messages)
    .map(([channelId, list]) => {
      const pending = list.filter((m) => m.id > (readUpTo[channelId] ?? '') && m.authorId !== TEST_USER_ID);
      const mentionCount = pending.filter((m) => m.mentions.everyone || m.mentions.users.includes(TEST_USER_ID)).length;
      return { channelId, unreadCount: Math.min(pending.length, 100), mentionCount: Math.min(mentionCount, 100) };
    })
    .filter((c) => c.unreadCount > 0);
}

function markRead(channelId) {
  const last = messages[channelId]?.at(-1);
  if (last) readUpTo[channelId] = last.id;
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  let json = {};
  if (body) {
    try {
      json = JSON.parse(body);
    } catch {
      // Si viene multipart/form-data
      const match = body.match(/name="name"\r?\n\r?\n([^\r\n]+)/);
      if (match) json.name = match[1];
    }
  }

  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  // Health check
  if (path === '/' || path === '/livez' || path === '/readyz' || path === '/health' || path === '/api/v1/health') {
    return send(200, { status: 'healthy' });
  }

  // Reset test servers
  if (path === '/api/v1/servers/test-reset' && req.method === 'DELETE') {
    servers = [];
    messages = {};
    roles = {};
    readUpTo = {};
    return send(200, { ok: true });
  }

  // Solo en el mock: los tests lo usan para saber dónde corren y para cargar datos de otros usuarios
  if (path === '/__test/ping') {
    return send(200, { mock: true });
  }
  if (path === '/__test/messages' && req.method === 'POST') {
    return send(201, addMessage({ authorId: OTHER_USER.user_id, ...json }));
  }
  if (path === '/__test/roles' && req.method === 'POST') {
    const role = {
      id: `role-${Date.now()}`,
      name: json.name || 'rol',
      color: null,
      position: (roles[json.serverId]?.length ?? 0) + 1,
      permissions_bitmask: 0,
      is_default: false,
    };
    (roles[json.serverId] ??= []).push(role);
    return send(201, role);
  }

  // Current user profile
  if (path === '/api/v1/users/me') {
    if (req.method === 'PATCH') {
      return send(200, {
        user_id: 'auth0|6ae25c494d4ba47b0ff49739',
        username: 'discordia_test',
        display_name: json.display_name || 'Discordia Test',
        bio: json.bio || '',
      });
    }
    return send(200, {
      user_id: 'auth0|6ae25c494d4ba47b0ff49739',
      username: 'discordia_test',
      display_name: 'Discordia Test',
    });
  }

  // Bulk users
  if (path === '/api/v1/users/bulk') {
    return send(200, [
      {
        user_id: 'auth0|6ae25c494d4ba47b0ff49739',
        username: 'discordia_test',
        display_name: 'Discordia Test',
      },
      OTHER_USER,
    ]);
  }

  // Chat: no leídos y marcar leído
  if (path === '/api/v1/chat/unread') {
    return send(200, { channels: unreadChannels() });
  }
  const readMatch = path.match(/^\/api\/v1\/chat\/channels\/([^/]+)\/read$/);
  if (readMatch && req.method === 'POST') {
    markRead(readMatch[1]);
    res.writeHead(204);
    return res.end();
  }
  if (path === '/api/v1/chat/read-states/read-all' && req.method === 'POST') {
    Object.keys(messages).forEach(markRead);
    res.writeHead(204);
    return res.end();
  }

  // Servers
  if (path === '/api/v1/servers' && req.method === 'GET') {
    return send(200, servers);
  }

  if (path === '/api/v1/servers' && req.method === 'POST') {
    const srvName = json.name || 'Servidor Test';
    const sId = `srv-${Date.now()}`;
    const chId = `ch-${Date.now()}-general`;
    const newServer = {
      id: sId,
      name: srvName,
      owner_id: 'auth0|6ae25c494d4ba47b0ff49739',
      icon_url: null,
      created_at: new Date().toISOString(),
      channels: [{ id: chId, name: 'general', type: 'text', server_id: sId, position: 0 }],
      categories: [],
    };
    servers.unshift(newServer);
    return send(201, newServer);
  }

  // Channels
  const chMatch = path.match(/^\/api\/v1\/servers\/([^/]+)\/channels$/);
  if (chMatch && req.method === 'POST') {
    const srv = servers.find((s) => s.id === chMatch[1]) || servers[0];
    const newChannel = {
      id: `ch-${Date.now()}`,
      name: json.name || 'nuevo-canal',
      type: json.type || 'text',
      server_id: srv?.id || chMatch[1],
      position: srv?.channels.length || 1,
    };
    srv?.channels.push(newChannel);
    return send(201, newChannel);
  }

  // Categories
  const catMatch = path.match(/^\/api\/v1\/servers\/([^/]+)\/categories$/);
  if (catMatch && req.method === 'POST') {
    const srv = servers.find((s) => s.id === catMatch[1]) || servers[0];
    const newCat = {
      id: `cat-${Date.now()}`,
      name: json.name || 'CATEGORIA',
      server_id: srv?.id || catMatch[1],
      channels: [],
    };
    srv?.categories.push(newCat);
    return send(201, newCat);
  }

  // Invites
  const invMatch = path.match(/^\/api\/v1\/servers\/([^/]+)\/invites$/);
  if (invMatch && req.method === 'POST') {
    return send(201, {
      code: `inv-${Date.now().toString(36)}`,
      server_id: invMatch[1],
      created_at: new Date().toISOString(),
    });
  }

  // Server members
  if (path.includes('/members')) {
    return send(200, {
      items: [
        { id: 'm1', user_id: 'auth0|6ae25c494d4ba47b0ff49739', nickname: null, role_ids: [] },
        { id: 'm2', user_id: OTHER_USER.user_id, nickname: null, role_ids: [] },
      ],
      total: 2,
      limit: 50,
      offset: 0,
    });
  }

  // Roles (GET: los del servidor, con el por defecto primero)
  const rolesMatch = path.match(/^\/api\/v1\/servers\/([^/]+)\/roles$/);
  if (rolesMatch && req.method === 'GET') {
    const everyone = { id: `${rolesMatch[1]}-everyone`, name: '@everyone', color: null, position: 0, permissions_bitmask: 0, is_default: true };
    return send(200, [everyone, ...(roles[rolesMatch[1]] ?? [])]);
  }
  if (path.includes('/roles')) {
    return send(200, []);
  }

  // Chat messages history
  const historyMatch = path.match(/^\/api\/v1\/chat\/channels\/([^/]+)\/messages$/);
  if (historyMatch) {
    return send(200, { messages: messages[historyMatch[1]] ?? [] });
  }
  if (path.includes('/messages')) {
    return send(200, { messages: [] });
  }

  // Default fallback
  send(200, []);
});

// WebSocket Server for chat
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws, request) => {
  // /api/v1/chat/channels/:channelId/ws
  const wsChannelId = request.url?.match(/\/channels\/([^/?]+)\/ws/)?.[1] ?? '';
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'subscribe') {
        return;
      }
      const channelId = data.channelId || wsChannelId;
      const content = data.content || '';
      const response = addMessage({
        channelId,
        authorId: data.authorId || 'auth0|6ae25c494d4ba47b0ff49739',
        content,
        mentions: parseMentions(content, serverOfChannel(channelId)),
      });
      // Como Chat-Engine: enviar marca el canal leído para quien escribe
      markRead(channelId);
      ws.send(JSON.stringify(response));
    } catch {
      // ignore
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Mock Backend] Running on http://localhost:${PORT}`);
});
