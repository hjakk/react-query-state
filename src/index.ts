import * as React from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import _query from '@hjk/query'


const _win = typeof window !== 'undefined' ? window : null
type AnyObject<T = { [key: string]: any }> = { [K in keyof T]: any }
type Listener = (data: AnyObject) => void
type Callback = (changed: AnyObject, state: AnyObject) => void

interface QueryState<T = AnyObject> {
  defaultState: T
  state: T
  listeners: Listener[]
  history: ReturnType<typeof useHistory>
  location: ReturnType<typeof useLocation>
  callback?: Callback
  init(): void
  use(): void
  set(state: Partial<T>): void
  update(): void
  onChange(data: Callback): void
  [key: string]: any
}

function QS<T>(this: QueryState, defaultState: T) {
  this.defaultState = defaultState
  const params = _win ? _query.parse(_win.location.search) || {} : {}
  this.state = { ...this.defaultState, ...params }
  this.listeners = []
  return this
}

QS.prototype.init = function(this: QueryState) {
  this.history = useHistory()
  this.location = useLocation()
  const search = _query.stringify(this.state)
  if (!this.location.search && search) {
    this.history.replace({ search })
    return
  }
  if (this.prevent) {
    this.prevent = false
    if (this.location.search !== `?${ search }`) {
      clearTimeout(this.timer)
      this.history.push({ search })
    }
  }
  else if (this.location.search !== `?${ search }`) {
    const params = _query.parse(this.location.search)
    if (params) this.state = params
  }
}

QS.prototype.use = function(this: QueryState) {
  const [, setState] = React.useState({})
  React.useEffect(() => () => {
    const i = this.listeners.indexOf(setState)
    if (i >= 0) this.listeners.splice(i, 1)
  }, [])
  if (!this.listeners.includes(setState)) {
    this.listeners.push(setState)
  }
}

QS.prototype.set = function(this: QueryState, newState: AnyObject) {
  this.prevent = true
  this.state = { ...this.state }
  const changed: AnyObject = {}
  for (const k in newState) {
    if (this.state[k] !== newState[k]) changed[k] = newState[k]
    this.state[k] = newState[k]
  }
  this.listeners.forEach((run) => run(this.state))
  if (this.callback) this.callback(changed, this.state)
  this.update()
}

QS.prototype.update = function(this: QueryState) {
  clearTimeout(this.timer)
  this.timer = setTimeout(() => {
    this.history.push({ search: _query.stringify(this.state) })
  }, 1000)
}

QS.prototype.onChange = function(this: QueryState, onChange: Callback) {
  this.callback = onChange
}

interface StateProps<T = AnyObject> {
  state: AnyObject<T>
  init: QueryState['init']
  use: QueryState['use']
  set(state: Partial<AnyObject<T>>): void
  onChange: QueryState['onChange']
}

export default <T extends AnyObject>(defaultState: T): StateProps<T> => new (QS as any)(defaultState)
