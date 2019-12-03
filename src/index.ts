import * as React from 'react'
import _query from '@hjk/query'


const hasProp = Object.prototype.hasOwnProperty


type AnyObject = { [key: string]: any }

function mapState(newState: AnyObject, state: AnyObject, force?: boolean): AnyObject {
  const _changed: AnyObject = {}
  for (const k in newState) {
    // if (!force && !hasProp.call(state, k)) continue
    if (state[k] !== newState[k]) {
      state[k] = newState[k]
      _changed[k] = newState[k]
    }
  }
  return _changed
}

interface UpdateStateScope {
  state: AnyObject
  forceUpdate(newState: AnyObject): void
  run(changed: AnyObject): void
}

function updateState(this: UpdateStateScope, newState: AnyObject): void {
  const _changed = mapState(newState, this.state)
  this.forceUpdate(newState)
  this.run(_changed)
}


interface RunCallbacksScope {
  callbacks: { action?: (changed: AnyObject) => void }
}

function runCallbacks(this: RunCallbacksScope, changed: AnyObject): void {
  this.callbacks.action && this.callbacks.action!(changed)
}


type Listener = (data: AnyObject) => void

interface RunListenersScope {
  listeners: Listener[]
  setTimer(): void
}

function runListeners(this: RunListenersScope, data: AnyObject): void {
  this.listeners.forEach((fn) => fn(data))
  this.setTimer()
}


interface AddListenerScope {
  state: AnyObject
  listeners: Listener[]
  init({ history, location }: AnyObject): void
}

function addListener(this: AddListenerScope, props?: AnyObject): void {
  const [, setState] = React.useState({})
  React.useEffect(() => {
    return (): void => {
      const i = this.listeners.indexOf(setState)
      if (i > -1) this.listeners.splice(i, 1)
    }
  }, [])
  if (!this.listeners.includes(setState)) this.listeners.push(setState)
  if (props) this.init(props)
}


interface HandleRouterParamsScope {
  state: AnyObject
  defaultState: AnyObject
  history: AnyObject
  listeners: Listener[]
}

function isEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true
  if (!obj1 || !obj2) return false

  const k1 = Object.keys(obj1);
  const k2 = Object.keys(obj2);
  if (k1.length !== k2.length) return false
  return !k1.some((k) => obj1[k] !== obj2[k])
}


function handleNoParams(_search: string, history: InitProps['history'], location: InitProps['location']): void {
  if (!location || location.search !== (_search ? `?${ _search }` : _search)) {
    history.replace({ search: _search })
  }
}

function handleRouterParams(this: HandleRouterParamsScope, { history, location }: InitProps): void {
  if (!hasProp.call(this.history, 'push')) {
    this.history.push = history.push
    if (location) {
      this.history.params = _query.parse(location.search)
      if (this.history.params) mapState(this.history.params, this.state)
    }
    const _search = _query.stringify(this.state)
    handleNoParams(_search, history, location)
  }
  else if (this.history.pathname !== location.pathname || this.history.search !== location.search) {
    if (this.history.prevent) {
      this.history.prevent = false
      return
    }
    clearTimeout(this.history.timer)
    this.history.timer = setTimeout(() => {
      const params = _query.parse(location.search)
      if (!params) {
        const _search = _query.stringify(this.state)
        handleNoParams(_search, history, location)
        return
      }
      else if (isEqual(this.history.params, params)) return
      mapState({ ...this.defaultState, ...params }, this.state)
      this.history.params = params
      this.listeners.forEach((fn) => fn(params))
    }, 500)
  }
  this.history.pathname = location.pathname
  this.history.search = location.search
}


interface HandleCallbackScope {
  callbacks: RunCallbacksScope['callbacks']
}

function handleCallback(this: HandleCallbackScope, fn: RunCallbacksScope['callbacks']['action'], params?: AnyObject): void {
  this.callbacks.action = fn
  if (params) mapState(params, this.callbacks, true)
}


interface InitProps extends AnyObject {
  history: AnyObject
  location: AnyObject
}

interface UrlState {
  state: any
  set(newState: AnyObject): void
  use(props?: InitProps): void
  init(props: InitProps): void
  onChange(fn: RunCallbacksScope['callbacks']['action'], params?: AnyObject): void
}

interface HistoryProps {
  push?: (params: { search: string }) => void
  timer?: any
  prevent?: boolean
}

export default function createUrlState(defaultState: AnyObject): UrlState {
  const state = {}
  const history: HistoryProps = {}
  const listeners: any[] = []
  const callbacks = {}

  mapState(defaultState, state, true)

  const setTimer = (): void => {
    clearTimeout(history.timer)
    if (history.push) {
      history.timer = setTimeout(() => {
        history.prevent = true
        history.push!({ search: _query.stringify(state) })
      }, 1000)
    }
  }

  const forceUpdate = runListeners.bind({ listeners, setTimer })
  const run = runCallbacks.bind({ callbacks })
  const set = updateState.bind({ state, run, forceUpdate })
  const init = handleRouterParams.bind({ state, defaultState, listeners, history })
  const use = addListener.bind({ state, listeners, init })
  const onChange = handleCallback.bind({ callbacks })

  return { state, set, use, init, onChange }
}
