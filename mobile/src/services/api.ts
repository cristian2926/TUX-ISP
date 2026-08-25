import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://tuxtell.duckdns.org/api';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Error de red' }));
    throw new Error(err.detail ?? `Error ${res.status}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export type LoginAdminResponse = { access_token: string; token_type: string };
export type LoginClienteResponse = {
  access_token: string;
  token_type: string;
  role: string;
  cliente_id: number;
  nombre: string;
};

export async function loginAdmin(
  email: string,
  password: string,
): Promise<LoginAdminResponse> {
  const body = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Credenciales incorrectas' }));
    throw new Error(err.detail ?? 'Credenciales incorrectas');
  }
  return res.json();
}

export async function loginCliente(
  telefono: string,
  pin: string,
): Promise<LoginClienteResponse> {
  return request('/auth/cliente/login', {
    method: 'POST',
    body: JSON.stringify({ telefono, pin }),
  });
}

// ── Cliente (app móvil) ───────────────────────────────────────────────────────

export type MiCuenta = {
  id: number;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  estado: 'activo' | 'suspendido' | 'anulado';
  plan: { nombre: string; bajada_mbps: number; subida_mbps: number; precio: number } | null;
  fecha_vencimiento: string | null;
  fecha_instalacion: string | null;
};

export async function getMiCuenta(): Promise<MiCuenta> {
  return request('/cliente/me');
}

export type Pago = {
  id: number;
  mes_pagado: string;
  fecha_pago: string;
  monto: number;
  metodo_pago: string;
  referencia: string | null;
};

export async function getMisPagos(page = 1): Promise<{ items: Pago[]; total: number; pages: number }> {
  return request(`/cliente/mis-pagos?page=${page}&per_page=12`);
}

// ── Admin: Clientes ───────────────────────────────────────────────────────────

export type ClienteListItem = {
  id: number;
  nombre: string;
  telefono: string | null;
  usuario_pppoe: string;
  estado: 'activo' | 'suspendido' | 'anulado';
  plan: { nombre: string; precio: number } | null;
  fecha_vencimiento: string | null;
};

export async function getClientes(params?: {
  page?: number;
  search?: string;
  estado?: string;
}): Promise<{ items: ClienteListItem[]; total: number; pages: number }> {
  const q = new URLSearchParams({
    page: String(params?.page ?? 1),
    per_page: '20',
    ...(params?.search ? { search: params.search } : {}),
    ...(params?.estado ? { estado: params.estado } : {}),
  });
  return request(`/clientes?${q}`);
}

export type ClienteDetalle = ClienteListItem & {
  direccion: string | null;
  zona: { nombre: string } | null;
  pin_app: string | null;
  password_pppoe: string;
  fecha_instalacion: string | null;
};

export async function getCliente(id: number): Promise<ClienteDetalle> {
  return request(`/clientes/${id}`);
}

export async function crearCliente(data: Record<string, unknown>): Promise<{ mikrotik_ok: boolean }> {
  return request('/clientes', { method: 'POST', body: JSON.stringify(data) });
}

export async function suspenderCliente(id: number): Promise<void> {
  return request(`/clientes/${id}/suspender`, { method: 'POST' });
}

export async function activarCliente(id: number): Promise<void> {
  return request(`/clientes/${id}/activar`, { method: 'POST' });
}

export async function getZonas(): Promise<{ id: number; nombre: string }[]> {
  const data: { items: { id: number; nombre: string }[] } = await request('/zonas?per_page=100');
  return data.items ?? data;
}

export async function getPlanes(): Promise<{ id: number; nombre: string; precio: number }[]> {
  return request('/planes?activo=true');
}
