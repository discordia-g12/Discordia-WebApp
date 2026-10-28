import http from 'http';
import { WebSocketServer } from 'ws';

const PORT = 8000;

let servers = [];

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
    return send(200, { ok: true });
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
    ]);
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
      items: [{ id: 'm1', user_id: 'auth0|6ae25c494d4ba47b0ff49739', nickname: null, role_ids: [] }],
      total: 1,
      limit: 50,
      offset: 0,
    });
  }

  // Roles
  if (path.includes('/roles')) {
    return send(200, []);
  }

  // Chat messages history
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

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'subscribe') {
        return;
      }
      const response = {
        id: `msg-${Date.now()}`,
        content: data.content || '',
        authorId: data.authorId || 'auth0|6ae25c494d4ba47b0ff49739',
        channelId: data.channelId || '',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      ws.send(JSON.stringify(response));
    } catch {
      // ignore
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Mock Backend] Running on http://localhost:${PORT}`);
});
