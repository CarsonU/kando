import type { BoardState } from './types';

/**
 * Thin client for the persistence API. All requests are same-origin under
 * `/api` — nginx proxies it to the backend in production, Vite proxies it in
 * dev — so no base URL or CORS handling is needed here.
 */

export interface BoardResponse {
  version: number;
  board: BoardState | null;
}

const BASE = '/api';

export async function fetchBoard(signal?: AbortSignal): Promise<BoardResponse> {
  const res = await fetch(`${BASE}/board`, { signal });
  if (!res.ok) throw new Error(`GET /board failed: ${res.status}`);
  return res.json();
}

export async function fetchVersion(signal?: AbortSignal): Promise<number> {
  const res = await fetch(`${BASE}/version`, { signal });
  if (!res.ok) throw new Error(`GET /version failed: ${res.status}`);
  const data = (await res.json()) as { version: number };
  return data.version;
}

/** Persist the whole board; returns the new server version. */
export async function saveBoardRemote(board: BoardState): Promise<number> {
  const res = await fetch(`${BASE}/board`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(board),
  });
  if (!res.ok) throw new Error(`PUT /board failed: ${res.status}`);
  const data = (await res.json()) as { version: number };
  return data.version;
}
