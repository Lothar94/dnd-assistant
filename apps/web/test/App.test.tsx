import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';

function renderApp() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('shows the server as up when /health answers ok', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ status: 'ok', service: 'server' }));
    renderApp();
    expect(await screen.findByText(/operativo/)).toBeTruthy();
  });

  it('shows the server as down when /health fails', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 500 }));
    renderApp();
    expect(await screen.findByText(/caído/)).toBeTruthy();
  });
});
