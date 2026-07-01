const jsonHeaders = { 'Content-Type': 'application/json' }

function createHeaders(key, session) {
  const token = session?.access_token || key
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
  }
}

async function parseResponse(response) {
  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) return { data: null, error: data || { message: response.statusText }, status: response.status }
  return { data, error: null, status: response.status }
}

class QueryBuilder {
  constructor(client, table, options = {}) {
    this.client = client
    this.table = table
    this.method = options.method || 'GET'
    this.body = options.body
    this.params = new URLSearchParams()
    this.headers = {}
    this.expectSingle = false
    this.expectMaybeSingle = false
  }

  select(columns = '*') { this.params.set('select', columns); return this }
  eq(column, value) { this.params.append(column, `eq.${value}`); return this }
  neq(column, value) { this.params.append(column, `neq.${value}`); return this }
  order(column, options = {}) {
    const direction = options.ascending === false ? 'desc' : 'asc'
    const nulls = options.nullsFirst === true ? '.nullsfirst' : options.nullsFirst === false ? '.nullslast' : ''
    this.params.append('order', `${column}.${direction}${nulls}`)
    return this
  }
  insert(payload) { this.method = 'POST'; this.body = payload; this.headers.Prefer = 'return=representation'; return this }
  update(payload) { this.method = 'PATCH'; this.body = payload; this.headers.Prefer = 'return=representation'; return this }
  delete() { this.method = 'DELETE'; return this }
  upsert(payload, options = {}) {
    this.method = 'POST'
    this.body = payload
    this.headers.Prefer = 'resolution=merge-duplicates,return=representation'
    if (options.onConflict) this.params.set('on_conflict', options.onConflict)
    return this
  }
  single() { this.expectSingle = true; return this }
  maybeSingle() { this.expectMaybeSingle = true; return this }

  async execute() {
    const url = new URL(`${this.client.url}/rest/v1/${this.table}`)
    this.params.forEach((value, key) => url.searchParams.append(key, value))
    const response = await fetch(url, {
      method: this.method,
      headers: { ...createHeaders(this.client.key, this.client.session), ...jsonHeaders, ...this.headers },
      body: this.body === undefined ? undefined : JSON.stringify(this.body),
    })
    const result = await parseResponse(response)
    if (!result.error && (this.expectSingle || this.expectMaybeSingle) && Array.isArray(result.data)) {
      if (result.data.length === 1) result.data = result.data[0]
      else if (result.data.length === 0 && this.expectMaybeSingle) result.data = null
      else if (this.expectSingle) result.error = { message: 'JSON object requested, multiple (or no) rows returned' }
    }
    return result
  }

  then(resolve, reject) { return this.execute().then(resolve, reject) }
}

class RpcBuilder {
  constructor(client, name, args) { this.client = client; this.name = name; this.args = args; this.expectSingle = false }
  single() { this.expectSingle = true; return this }
  async execute() {
    const response = await fetch(`${this.client.url}/rest/v1/rpc/${this.name}`, {
      method: 'POST',
      headers: { ...createHeaders(this.client.key, this.client.session), ...jsonHeaders },
      body: JSON.stringify(this.args || {}),
    })
    const result = await parseResponse(response)
    if (!result.error && this.expectSingle && Array.isArray(result.data)) result.data = result.data[0] || null
    return result
  }
  then(resolve, reject) { return this.execute().then(resolve, reject) }
}

function createAuth(client) {
  const storageKey = `sb-${new URL(client.url).hostname.split('.')[0]}-auth-token`
  const readSession = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || 'null')
      return parsed?.currentSession || parsed?.session || parsed || null
    } catch { return null }
  }
  const writeSession = session => {
    client.session = session
    if (session) localStorage.setItem(storageKey, JSON.stringify({ currentSession: session }))
    else localStorage.removeItem(storageKey)
  }
  client.session = readSession()
  const notify = (event, session) => client.listeners.forEach(listener => listener(event, session))
  return {
    async getSession() { client.session = readSession(); return { data: { session: client.session }, error: null } },
    async getUser() {
      client.session = readSession()
      if (!client.session?.access_token) return { data: { user: null }, error: null }
      const response = await fetch(`${client.url}/auth/v1/user`, { headers: createHeaders(client.key, client.session) })
      const result = await parseResponse(response)
      return { data: { user: result.data }, error: result.error }
    },
    async signInWithPassword(credentials) {
      const response = await fetch(`${client.url}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: { ...createHeaders(client.key), ...jsonHeaders }, body: JSON.stringify(credentials),
      })
      const result = await parseResponse(response)
      if (!result.error) { writeSession(result.data); notify('SIGNED_IN', result.data) }
      return { data: { session: result.data, user: result.data?.user || null }, error: result.error }
    },
    async signOut() { writeSession(null); notify('SIGNED_OUT', null); return { error: null } },
    onAuthStateChange(callback) { client.listeners.add(callback); return { data: { subscription: { unsubscribe: () => client.listeners.delete(callback) } } } },
  }
}

export function createClient(url, key) {
  const client = { url: url.replace(/\/$/, ''), key, session: null, listeners: new Set() }
  client.auth = createAuth(client)
  client.from = table => new QueryBuilder(client, table)
  client.rpc = (name, args) => new RpcBuilder(client, name, args)
  client.functions = { invoke: async (name, options = {}) => {
    const response = await fetch(`${client.url}/functions/v1/${name}`, {
      method: 'POST', headers: { ...createHeaders(client.key, client.session), ...jsonHeaders }, body: JSON.stringify(options.body || {}),
    })
    return parseResponse(response)
  } }
  client.storage = { from: bucket => ({
    upload: async (path, file, options = {}) => {
      const headers = { ...createHeaders(client.key, client.session) }
      if (options.contentType) headers['Content-Type'] = options.contentType
      if (options.upsert) headers['x-upsert'] = 'true'
      const response = await fetch(`${client.url}/storage/v1/object/${bucket}/${path}`, { method: 'POST', headers, body: file })
      return parseResponse(response)
    },
    getPublicUrl: path => ({ data: { publicUrl: `${client.url}/storage/v1/object/public/${bucket}/${path}` } }),
  }) }
  return client
}
