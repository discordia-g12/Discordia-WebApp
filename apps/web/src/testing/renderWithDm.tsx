import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { setApiMock, useSession } from '@discordia/core';
import { CURRENT_USER_ID, USERS, createApiMock, type ApiMockOptions } from '@discordia/core/testing';
import { useUIStore } from '../app/uiStore';
import { useCurrentUserStore } from '../features/profile/currentUserStore';
import { DmProviders } from './DmProviders';

/** Renderiza con los mocks de DMs de core, con sesión y el socket inbox: lo mismo que ve la app con VITE_USE_MOCK. */
export function renderWithDm(ui: ReactElement, options: ApiMockOptions = {}, prepare?: (mock: ReturnType<typeof createApiMock>) => void) {
  const mock = createApiMock(options);
  prepare?.(mock);
  setApiMock(mock);
  useSession.setState({ status: 'authenticated' });
  useCurrentUserStore.setState({ currentUser: USERS[CURRENT_USER_ID] });
  useUIStore.setState({ selectedServerId: 'home', selectedDm: null, activeModal: null, toast: null });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<DmProviders client={client}>{ui}</DmProviders>);
  return { mock, client };
}
