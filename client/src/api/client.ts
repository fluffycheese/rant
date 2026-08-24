// Typed API client — thin fetch wrappers over the RANT REST API

export type User = {
  id: string;
  username: string;
}

export type Profile = {
  id: string; name: string; description: string | null;
  createdAt: number; updatedAt: number;
}

export type Site = {
  id: string; profileId: string; name: string; description: string | null;
  createdAt: number; updatedAt: number;
}

export type Rack = {
  id: string; siteId: string; name: string; description: string | null;
  uHeight: number; createdAt: number; updatedAt: number;
}

export type DeviceTemplate = {
  id: string; name: string; category: string; manufacturer: string | null;
  model: string | null; portCount: number;
  portLayout: Array<{ label: string; connectorType: string; position: number; groupName?: string | null; groupLayout?: 'single_row' | 'double_row' | null }>;
  uHeight: number; color: string; createdAt: number; updatedAt: number;
}

export type Device = {
  id: string; rackId: string; templateId: string | null; name: string;
  category: string; positionU: number | null;
  color: string; notes: string | null; createdAt: number; updatedAt: number;
}

export type Port = {
  id: string; deviceId: string; label: string; connectorType: string;
  position: number; groupName: string | null; groupLayout: 'single_row' | 'double_row' | null;
  notes: string | null; createdAt: number;
}

export type CableLink = {
  id: string; portAId: string; portASlot: 'front' | 'back';
  portBId: string; portBSlot: 'front' | 'back';
  cableType: string; color: string | null; label: string | null;
  notes: string | null; createdAt: number; updatedAt: number;
}

export type LinkSlot = 'front' | 'back'

export type RackDevice = Device & {
  template: DeviceTemplate | null;
  rack: Rack;
  site: Site;
  ports: Port[];
}

export type RackViewPayload = {
  rack: Rack;
  site: Site;
  devices: RackDevice[];
  internalLinks: CableLink[];
}

// Backward compatibility alias
export type CanvasPayload = RackViewPayload

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Request failed')
  }
  return res.json() as Promise<T>
}

// ── API ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login:  (username: string, password: string) =>
      request<{ ok: boolean; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
    logout: () =>
      request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    me:     () =>
      request<{ authenticated: boolean; user?: User; proxyAuth?: boolean }>('/auth/me'),
  },
  profiles: {
    list:   ()             => request<Profile[]>('/profiles'),
    get:    (id: string)   => request<Profile>(`/profiles/${id}`),
    create: (d: Partial<Profile>) => request<Profile>('/profiles', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<Profile>) => request<Profile>(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string)   => request<{ ok: boolean }>(`/profiles/${id}`, { method: 'DELETE' }),
    sites:  (id: string)   => request<Site[]>(`/profiles/${id}/sites`),
    crossSiteLinks: (id: string) => request<any[]>(`/profiles/${id}/cross-site-links`),
    topology: (id: string) => request<{ mermaidData: string }>(`/profiles/${id}/topology`),
  },
  sites: {
    get:    (id: string)   => request<Site>(`/sites/${id}`),
    create: (d: Partial<Site>) => request<Site>('/sites', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<Site>) => request<Site>(`/sites/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string)   => request<{ ok: boolean }>(`/sites/${id}`, { method: 'DELETE' }),
    racks:  (id: string)   => request<Rack[]>(`/sites/${id}/racks`),
    topology: (id: string) => request<{ mermaidData: string }>(`/sites/${id}/topology`),
  },
  racks: {
    get:    (id: string)   => request<Rack>(`/racks/${id}`),
    create: (d: Partial<Rack>) => request<Rack>('/racks', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<Rack>) => request<Rack>(`/racks/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string)   => request<{ ok: boolean }>(`/racks/${id}`, { method: 'DELETE' }),
    view:   (id: string)   => request<RackViewPayload>(`/racks/${id}/view`),
    canvas: (id: string)   => request<RackViewPayload>(`/racks/${id}/view`),
  },
  devices: {
    get:           (id: string)                => request<Device>(`/devices/${id}`),
    create:        (d: Partial<Device>)         => request<Device>('/devices', { method: 'POST', body: JSON.stringify(d) }),
    update:        (id: string, d: Partial<Device>) => request<Device>(`/devices/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete:        (id: string)                => request<{ ok: boolean }>(`/devices/${id}`, { method: 'DELETE' }),
    ports:         (id: string)                => request<Port[]>(`/devices/${id}/ports`),
  },
  ports: {
    get:    (id: string)   => request<Port>(`/ports/${id}`),
    create: (d: Partial<Port>) => request<Port>('/ports', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<Port>) => request<Port>(`/ports/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string)   => request<{ ok: boolean }>(`/ports/${id}`, { method: 'DELETE' }),
  },
  links: {
    create: (d: Partial<CableLink>) => request<CableLink>('/links', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<CableLink>) => request<CableLink>(`/links/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string)            => request<{ ok: boolean }>(`/links/${id}`, { method: 'DELETE' }),
  },
  templates: {
    list:        ()              => request<DeviceTemplate[]>('/templates'),
    get:         (id: string)    => request<DeviceTemplate>(`/templates/${id}`),
    create:      (d: Partial<DeviceTemplate>) => request<DeviceTemplate>('/templates', { method: 'POST', body: JSON.stringify(d) }),
    update:      (id: string, d: Partial<DeviceTemplate>) => request<DeviceTemplate>(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete:      (id: string)    => request<{ ok: boolean }>(`/templates/${id}`, { method: 'DELETE' }),
    instantiate: (id: string, d: { rackId: string; name: string; positionU?: number }) =>
      request<{ device: Device; ports: Port[] }>(`/templates/${id}/instantiate`, { method: 'POST', body: JSON.stringify(d) }),
  },
  users: {
    list:   () => request<User[]>('/users'),
    create: (d: any) => request<User>('/users', { method: 'POST', body: JSON.stringify(d) }),
    delete: (id: string) => request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' }),
  },
}
