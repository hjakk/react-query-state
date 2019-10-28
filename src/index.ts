import * as React from 'react'
import _query from '@hjk/query'


const hasProp = Object.prototype.hasOwnProperty

function mapState(newState: any, state: any, force?: boolean): void {
  for (const k in newState) {
    if (!force && !hasProp.call(state, k)) continue
    state[k] = newState[k]
  }
}

function updateState(this: any, newState: any): void {
  mapState(newState, this.state)
  this.forceUpdate(newState)
}

function runListeners(this: any, data: any): void {
  this.listeners.forEach((fn: any) => fn(data))
  this.setTimer()
}

function addListener(this: any, props: any): void {
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

function handleRouterParams(this: any, { history, location }: any): void {
  if (!hasProp.call(this.history, 'push')) {
    this.history.push = history.push
    if (location) mapState(_query.parse(location.search), this.state)
    const _search = _query.stringify(this.state)
    if (!location || location.search !== _search) history.push({ search: _search })
  }
}

export default function createUrlState(defaultState: any): any {
  const state = {}
  const history: { [key: string]: any } = {}
  const listeners: any[] = []

  mapState(defaultState, state, true)

  const setTimer = (): void => {
    clearTimeout(history.timer)
    if (history.push) {
      history.timer = setTimeout(() => {
        history.push({ search: _query.stringify(state) })
      }, 1000)
    }
  }

  const forceUpdate = runListeners.bind({ listeners, setTimer })
  const init = handleRouterParams.bind({ state, history })
  const set = updateState.bind({ state, forceUpdate })
  const use = addListener.bind({ state, listeners, init })

  return { state, set, use, init }
}
