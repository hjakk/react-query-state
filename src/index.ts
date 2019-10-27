const React = require('react')


function stringify(data: any, prevKey?: string | null): string {
  let _q: string = ''
  for (const key in data) {
    if (!data.hasOwnProperty(key)) continue

    const _v: any = data[key]
    const _k: string = prevKey ? `${ prevKey }[${ Array.isArray(data) ? '' : key }]` : key
    if (_v !== undefined && _v !== null && _v !== '') {
      if (_q) _q += '&'
      if (typeof _v === 'object') {
        _q += stringify(_v, `${ _k }`)
      }
      else {
        _q += encodeURIComponent(_k)
        _q += `=${ encodeURIComponent(_v) }`
      }
    }
  }
  return _q
}

function parse(str: string) {
  str = str.replace(/^\?/, '')
  const params: any = {}
  const arr: string[] = str.split('&')
  let i: number = -1
  while (++i < arr.length) {
    let [_key, _value] = arr[i].split('=')
    _key = decodeURIComponent(_key)
    _value = decodeURIComponent(_value)
    if (/\[\]$|\[(\d+)\]$/.test(_key)) {
      const _rootKey: string = _key.replace(/\[\]$|\[(\d+)\]$/, '')
      if (!params[_rootKey]) params[_rootKey] = []
      const index: string[] | null = _key.match(/\[(\d+)\]/)
      if (index) params[_rootKey][index[1]] = _value
      else params[_rootKey].push(_value)
    }
    else if (/\[(.+)\]$/.test(_key)) {
      const _rootKey: string = _key.replace(/\[(.+)\]$/, '')
      if (!params[_rootKey]) params[_rootKey] = {}
      const _k: string[] | null = _key.match(/\[(.+)\]$/)
      if (_k) params[_rootKey][_k[1]] = _value
    }
    else {
      params[_key] = _value
    }
  }
  return params
}



const hasProp = Object.prototype.hasOwnProperty

function mapState(newState: any, state: any, force?: boolean) {
  for (let k in newState) {
    if (!force && !hasProp.call(state, k)) continue
    state[k] = newState[k]
  }
}

function updateState(this: any, newState: any) {
  mapState(newState, this.state)
  this.forceUpdate(newState)
}

function runListeners(this: any, data: any) {
  this.listeners.forEach((fn: any) => fn(data))
  this.setTimer()
}

function addListener(this: any, props: any) {
  if (props) this.handleRouter(props)
  const [, setState] = React.useState({})
  if (this.listeners.includes(setState)) return
  this.listeners.push(setState)
}

function handleRouterParams(this: any, { history, location }: any) {
  if (!hasProp.call(this.history, 'push')) {
    this.history.push = history.push
    if (location) mapState(parse(location.search), this.state)
  }
}

function createUrlState(defaultState: any) {
  const state = {}
  const history: { [key: string]: any } = {}
  const listeners: any[] = []

  mapState(defaultState, state, true)

  const setTimer = () => {
    clearTimeout(history.timer)
    if (history.push) {
      history.timer = setTimeout(() => {
        history.push({ search: stringify(state) })
      }, 1000)
    }
  }

  const forceUpdate = runListeners.bind({ listeners, setTimer })
  const handleRouter = handleRouterParams.bind({ state, history })
  const set = updateState.bind({ state, forceUpdate })
  const use = addListener.bind({ state, listeners, handleRouter })

  return { state, set, use }
}

module.exports = createUrlState