import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ROLE_CLAIM } from '@discordia/core';
import App from '../App';
import type { AuthDriver } from '../auth/driver';
import { setAuthDriver, useBackofficeSession } from '../auth/session';
import { grafanaLinks } from '../sections/grafana';

/** Access token de prueba (sin firma): el cliente solo lee el claim de rol, la firma la valida Kong. */
const tokenWith = (role: string) => ['e30', btoa(JSON.stringify({ sub: 'auth0|1', [ROLE_CLAIM]: role })), 'firma'].join('.');

function fakeDriver(start: () => Promise<string | null>): AuthDriver {
  return {
    start,
    getToken: async () => tokenWith('staff'),
    getUser: async () => ({ name: 'Ana Staff', email: 'ana@discordia.lol' }),
    login: async () => 'done',
    logout: async () => 'done',
  };
}

describe('backoffice', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    useBackofficeSession.setState({ status: 'loading', user: null, error: null });
  });

  afterEach(() => {
    cleanup();
    setAuthDriver(null);
  });

  it('el staff ve el backoffice, con todo en "próximamente" salvo Grafana', async () => {
    setAuthDriver(fakeDriver(async () => tokenWith('staff')));
    render(<App />);

    expect(await screen.findByRole('navigation', { name: 'Secciones del backoffice' })).toBeTruthy();
    // "/" lleva a la primera sección
    await waitFor(() => expect(window.location.pathname).toBe('/usuarios'));
    expect(screen.getAllByText('próximamente').length).toBeGreaterThan(0);
    expect(screen.getByText('Ana Staff')).toBeTruthy();
  });

  it('cada sección tiene su URL y Observabilidad enlaza a Grafana', async () => {
    setAuthDriver(fakeDriver(async () => tokenWith('staff')));
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /observabilidad/i }));
    expect(window.location.pathname).toBe('/observabilidad');

    const links = grafanaLinks();
    expect(links.resources).toMatch(/\/d\/discordia-recursos$/);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(links.home);
    expect(hrefs).toContain(links.resources);
    expect(screen.queryByText('próximamente')).toBeNull();
  });

  it('una cuenta sin el rol staff no ve el backoffice', async () => {
    setAuthDriver(fakeDriver(async () => tokenWith('user')));
    render(<App />);

    expect(await screen.findByText('Esta cuenta no es staff de la plataforma.')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'Secciones del backoffice' })).toBeNull();
  });

  it('si la Action de Auth0 rechaza el login, tampoco', async () => {
    setAuthDriver(
      fakeDriver(async () => {
        throw Object.assign(new Error('access_denied'), { error: 'access_denied', error_description: 'staff_only' });
      }),
    );
    render(<App />);

    expect(await screen.findByText('Esta cuenta no es staff de la plataforma.')).toBeTruthy();
  });

  it('sin sesión ofrece entrar', async () => {
    setAuthDriver(fakeDriver(async () => null));
    render(<App />);

    // BlockButton agrega la barra final: "Entrar /"
    expect(await screen.findByRole('button', { name: /^Entrar/ })).toBeTruthy();
  });

  it('si Auth0 falla, muestra el error y permite reintentar', async () => {
    let attempts = 0;
    setAuthDriver(
      fakeDriver(async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('no se pudo conectar con Auth0');
        return tokenWith('staff');
      }),
    );
    render(<App />);

    expect(await screen.findByText('No pudimos verificar tu sesión.')).toBeTruthy();
    expect(screen.getByText('/ no se pudo conectar con Auth0')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /^Reintentar/ }));
    expect(await screen.findByRole('navigation', { name: 'Secciones del backoffice' })).toBeTruthy();
  });

  it('salir pide confirmación: cancelar no cierra la sesión, confirmar sí', async () => {
    let logouts = 0;
    setAuthDriver({
      ...fakeDriver(async () => tokenWith('staff')),
      logout: async () => {
        logouts += 1;
        return 'done';
      },
    });
    render(<App />);
    await screen.findByRole('navigation', { name: 'Secciones del backoffice' });

    fireEvent.click(screen.getByRole('button', { name: /Salir/ }));
    expect(await screen.findByRole('alertdialog', { name: '¿Cerrar sesión?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /cancelar/ }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(logouts).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: /Salir/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^Cerrar sesión/ }));
    await waitFor(() => expect(logouts).toBe(1));
    expect(await screen.findByRole('button', { name: /^Entrar/ })).toBeTruthy();
  });
});
