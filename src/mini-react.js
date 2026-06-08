const stateStore = new Map()
let currentInstance = ''
let hookIndex = 0
let rootNode = null
let rootVNode = null
let renderQueued = false
let pendingEffects = []

export function createElement(type, props, ...children) {
  return { type, props: props || {}, children: children.flat(Infinity) }
}

export const Fragment = ({ children }) => children
export const StrictMode = ({ children }) => children

export function useState(initial) {
  const key = `${currentInstance}:${hookIndex++}`
  if (!stateStore.has(key)) stateStore.set(key, typeof initial === 'function' ? initial() : initial)
  const setState = value => {
    const previous = stateStore.get(key)
    stateStore.set(key, typeof value === 'function' ? value(previous) : value)
    queueRender()
  }
  return [stateStore.get(key), setState]
}

export function useMemo(factory) {
  hookIndex++
  return factory()
}

export function useEffect(effect, dependencies = []) {
  const key = `${currentInstance}:effect:${hookIndex++}`
  const previous = stateStore.get(key)
  const changed = !previous || dependencies.length !== previous.dependencies.length ||
    dependencies.some((dependency, index) => dependency !== previous.dependencies[index])

  if (changed) {
    pendingEffects.push(() => {
      previous?.cleanup?.()
      const cleanup = effect()
      stateStore.set(key, { dependencies, cleanup })
    })
  }
}

function queueRender() {
  if (renderQueued) return
  renderQueued = true
  queueMicrotask(() => { renderQueued = false; renderRoot() })
}

function setProperty(element, name, value) {
  if (name === 'children' || name === 'key') return
  if (name === 'className') { element.setAttribute('class', value || ''); return }
  if (name === 'style' && value && typeof value === 'object') {
    Object.assign(element.style, value)
    return
  }
  if (name.startsWith('on') && typeof value === 'function') {
    element.addEventListener(name.slice(2).toLowerCase(), value)
    return
  }
  if (name === 'autoFocus') { if (value) queueMicrotask(() => element.focus()); return }
  if (name === 'disabled') { element.disabled = Boolean(value); return }
  if (name === 'value') { element.value = value ?? ''; return }
  if (name === 'strokeWidth') { element.setAttribute('stroke-width', value); return }
  if (value === true) element.setAttribute(name, '')
  else if (value !== false && value != null) element.setAttribute(name, value)
}

function build(vnode, path = '0') {
  if (vnode == null || vnode === false || vnode === true) return document.createTextNode('')
  if (typeof vnode === 'string' || typeof vnode === 'number') return document.createTextNode(String(vnode))
  if (Array.isArray(vnode)) {
    const fragment = document.createDocumentFragment()
    vnode.forEach((child, i) => fragment.appendChild(build(child, `${path}.${i}`)))
    return fragment
  }
  if (typeof vnode.type === 'function') {
    const previousInstance = currentInstance
    const previousHook = hookIndex
    currentInstance = `${path}:${vnode.type.name || 'component'}`
    hookIndex = 0
    const output = vnode.type({ ...vnode.props, children: vnode.children })
    const node = build(output, `${path}.c`)
    currentInstance = previousInstance
    hookIndex = previousHook
    return node
  }
  const isSvg = vnode.type === 'svg' || path.includes('.svg')
  const element = isSvg
    ? document.createElementNS('http://www.w3.org/2000/svg', vnode.type)
    : document.createElement(vnode.type)
  if (vnode.type === 'svg') path += '.svg'
  Object.entries(vnode.props || {}).forEach(([name, value]) => setProperty(element, name, value))
  vnode.children.forEach((child, i) => element.appendChild(build(child, `${path}.${i}`)))
  return element
}

function renderRoot() {
  if (!rootNode || !rootVNode) return
  const active = document.activeElement
  const activeId = active?.dataset?.focusId
  const selection = active && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null
  currentInstance = 'root'
  hookIndex = 0
  pendingEffects = []
  const next = build(rootVNode)
  rootNode.replaceChildren(next)
  const effects = pendingEffects
  pendingEffects = []
  effects.forEach(run => queueMicrotask(run))
  if (activeId) {
    const replacement = rootNode.querySelector(`[data-focus-id="${activeId}"]`)
    if (replacement) {
      replacement.focus()
      if (selection && replacement.setSelectionRange) replacement.setSelectionRange(...selection)
    }
  }
}

export function createRoot(node) {
  rootNode = node
  return { render(vnode) { rootVNode = vnode; renderRoot() } }
}

export default { createElement, Fragment }
