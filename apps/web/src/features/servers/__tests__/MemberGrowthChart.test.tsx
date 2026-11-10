import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as core from '@discordia/core';
import { MemberGrowthChart } from '../MemberGrowthChart';

const mockResponse: core.MemberGrowthResponse = {
  server_id: 'srv-1',
  period: {
    start_date: '2026-11-01',
    end_date: '2026-11-05',
    days: 5,
  },
  current_member_count: 10,
  data: [
    { date: '2026-11-01', member_count: 8, joined: 1, left: 0 },
    { date: '2026-11-02', member_count: 9, joined: 1, left: 0 },
    { date: '2026-11-03', member_count: 11, joined: 2, left: 0 },
    { date: '2026-11-04', member_count: 10, joined: 0, left: 1 },
    { date: '2026-11-05', member_count: 10, joined: 0, left: 0 },
  ],
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('MemberGrowthChart (CA 1: Gráfico de evolución)', () => {
  it('renderiza las métricas resumidas y el gráfico día a día', () => {
    vi.spyOn(core, 'useMemberGrowthQuery').mockReturnValue({
      data: mockResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof core.useMemberGrowthQuery>);

    renderWithClient(<MemberGrowthChart serverId="srv-1" />);

    // Verificamos que se renderizan las tarjetas de resumen
    expect(screen.getByText('Miembros actuales')).toBeTruthy();
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);

    expect(screen.getByText('Crecimiento neto')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy(); // 10 - 8 = +2

    expect(screen.getByText('Altas en período')).toBeTruthy();
    expect(screen.getByText('+4')).toBeTruthy(); // 1 + 1 + 2 = 4

    expect(screen.getByText('Bajas en período')).toBeTruthy();
    expect(screen.getByText('-1')).toBeTruthy(); // 1

    // Verificamos que se renderiza el SVG
    expect(screen.getByRole('img', { name: 'Línea de evolución de miembros día a día' })).toBeTruthy();

    // Verificamos botones de período
    expect(screen.getByRole('button', { name: '7 días' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '14 días' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '30 días' })).toBeTruthy();
  });

  it('permite cambiar el período seleccionado', () => {
    const mockQuery = vi.spyOn(core, 'useMemberGrowthQuery').mockReturnValue({
      data: mockResponse,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof core.useMemberGrowthQuery>);

    renderWithClient(<MemberGrowthChart serverId="srv-1" />);

    const btn7d = screen.getByRole('button', { name: '7 días' });
    fireEvent.click(btn7d);

    expect(mockQuery).toHaveBeenCalledWith('srv-1', { days: 7 });
  });

  it('muestra estado de carga cuando isLoading es true', () => {
    vi.spyOn(core, 'useMemberGrowthQuery').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof core.useMemberGrowthQuery>);

    renderWithClient(<MemberGrowthChart serverId="srv-1" />);
    expect(screen.getByRole('status', { name: 'Cargando' })).toBeTruthy();
  });

  it('muestra mensaje de error cuando falla la consulta', () => {
    vi.spyOn(core, 'useMemberGrowthQuery').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
    } as unknown as ReturnType<typeof core.useMemberGrowthQuery>);

    renderWithClient(<MemberGrowthChart serverId="srv-1" />);
    expect(screen.getByText(/\/ No se pudieron cargar las métricas de crecimiento: Network error/)).toBeTruthy();
  });
});
