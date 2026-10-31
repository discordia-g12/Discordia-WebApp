import { Page, expect } from '@playwright/test';
import { execSync } from 'child_process';

export const TEST_USER_EMAIL = process.env.E2E_EMAIL ?? 'discordia.chat.service@gmail.com';
/** Sin valor por defecto: en local va en apps/web/.env.e2e.local, en el CI en el secret E2E_PASSWORD. */
export const TEST_USER_PASSWORD = process.env.E2E_PASSWORD ?? '';

/** La contraseña del usuario de prueba, o un error que dice de dónde sacarla. */
export function testUserPassword(): string {
  if (!TEST_USER_PASSWORD) {
    throw new Error('Falta E2E_PASSWORD: ponela en apps/web/.env.e2e.local (ver e2e.md) o en el entorno');
  }
  return TEST_USER_PASSWORD;
}
export const TEST_USER_ID = 'auth0|6ae25c494d4ba47b0ff49739';

/**
 * Contenedores de Postgres donde limpiar: E2E_POSTGRES_CONTAINER si está definida; si no, los que estén
 * corriendo del compose de la raíz del orquestador (discordia-postgres, discordia-postgres-local) o del
 * servicio local-postgres de deploy/ (su nombre depende del proyecto de compose).
 */
function postgresContainers(): string[] {
  if (process.env.E2E_POSTGRES_CONTAINER) return [process.env.E2E_POSTGRES_CONTAINER];
  try {
    const names = execSync(`docker ps --format '{{.Names}} {{.Label "com.docker.compose.service"}}'`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return names
      .split('\n')
      .map((line) => line.trim().split(' '))
      .filter(([name, service]) => /^discordia-postgres(-local)?$/.test(name) || service === 'local-postgres')
      .map(([name]) => name);
  } catch {
    // Sin docker en este host (CI): no hay base que limpiar
    return [];
  }
}

/**
 * Limpia los servidores de prueba generados por el usuario para asegurar aislamiento total.
 */
export function cleanTestServers() {
  for (const container of postgresContainers()) {
    try {
      execSync(
        `docker exec ${container} psql -U postgres -d server_roles_db -c "DELETE FROM servers WHERE owner_id = '${TEST_USER_ID}';"`,
        { stdio: 'ignore' }
      );
    } catch {
      // Continúa silenciosamente si la base no está en ese contenedor
    }
  }
  try {
    execSync(`curl -s -X DELETE http://localhost:8000/api/v1/servers/test-reset`, { stdio: 'ignore' });
  } catch {
    // Continúa silenciosamente si no responde
  }
}

/**
 * Inicia sesión completa con el usuario de pruebas verificado.
 */
export async function loginWithTestUser(page: Page) {
  await page.goto('/');

  const loginButton = page.getByTestId('btn-submit-login');
  await expect(loginButton).toBeEnabled({ timeout: 10000 });

  await page.getByRole('textbox', { name: 'correo electrónico' }).fill(TEST_USER_EMAIL);
  await page.getByRole('textbox', { name: 'contraseña' }).fill(testUserPassword());
  await loginButton.click();

  const serverRail = page.getByRole('navigation', { name: 'Servidores y mensajes directos' });
  await expect(serverRail).toBeVisible({ timeout: 20000 });
}

/**
 * Crea un servidor a través del modal y espera su renderizado en el ServerRail.
 */
export async function createServerViaUI(page: Page, serverName: string) {
  await page.getByRole('button', { name: 'Añadir un servidor' }).click();
  await page.getByRole('textbox', { name: 'Nombre del servidor' }).fill(serverName);
  await page.getByRole('button', { name: 'Crear /' }).click();
  await expect(page.getByRole('button', { name: new RegExp(serverName) })).toBeVisible({ timeout: 15000 });
}


const MOCK_URL = 'http://localhost:8000';

/** Corre contra mock-backend.mjs (CI) y no contra Kong: solo el mock tiene /__test. */
export async function isMockBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${MOCK_URL}/__test/ping`);
    return res.ok && (await res.json()).mock === true;
  } catch {
    return false;
  }
}

/** Solo mock: el canal de texto de un servidor creado en el test, buscado por nombre. */
export async function mockTextChannelId(serverName: string): Promise<{ serverId: string; channelId: string }> {
  const servers = (await (await fetch(`${MOCK_URL}/api/v1/servers`)).json()) as {
    id: string;
    name: string;
    channels: { id: string; type: string }[];
  }[];
  const server = servers.find((s) => s.name === serverName);
  if (!server) throw new Error(`No está el servidor ${serverName} en el mock`);
  return { serverId: server.id, channelId: server.channels.find((c) => c.type === 'text')!.id };
}

/** Solo mock: un mensaje de otro miembro, con las menciones que hubiera calculado Chat-Engine. */
export async function mockMessageFromOther(
  channelId: string,
  content: string,
  mentions: { users: string[]; roles: string[]; everyone: boolean }
) {
  await fetch(`${MOCK_URL}/__test/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelId, content, mentions }),
  });
}

/** Solo mock: un rol en el servidor. */
export async function mockRole(serverId: string, name: string): Promise<string> {
  const res = await fetch(`${MOCK_URL}/__test/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serverId, name }),
  });
  return ((await res.json()) as { id: string }).id;
}
