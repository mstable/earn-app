import React, { FC } from 'react'
import { render } from 'react-dom'
import { HashRouter, Route, Switch, Redirect, useHistory } from 'react-router-dom'
import { useEffectOnce } from 'react-use'

import * as serviceWorker from './serviceWorker'
import { Providers } from './context'
import { Updaters } from './updaters'
import { Layout } from './components/layout/Layout'
import { Home } from './components/pages'
import { NotFound } from './components/pages/NotFound'
import { Earn } from './components/pages/Earn'
import { EarnPage } from './components/pages/Earn/Pool'
import { AdminPage } from './components/pages/Earn/Admin'
import { useNetwork } from './context/NetworkProvider'
import { useSelectedMasset } from './context/SelectedMassetNameProvider'

const Routes: FC = () => {
  const { supportedMassets } = useNetwork()
  const [massetName] = useSelectedMasset()
  const history = useHistory()

  useEffectOnce(() => {
    // Redirect for legacy links (without hash)
    if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/ipfs/')) {
      window.location.hash = window.location.pathname
      window.location.pathname = ''
    }

    if (supportedMassets.includes(massetName)) return

    // Redirect if not supported masset
    const tab = window.location.hash.split('/')?.[2]
    if (tab) history.push(`/musd/${tab}`)
  })

  return (
    <Switch>
      <Route exact path="/" component={Home} />
      <Route exact path="/:massetName/earn" component={Earn} />
      <Route exact path="/:massetName/earn/admin" component={AdminPage} />
      <Route exact path="/:massetName/earn/:slugOrAddress" component={EarnPage} />
      <Route exact path="/:massetName/earn/:slugOrAddress/:userAddress" component={EarnPage} />
      <Redirect exact path="/earn" to="/musd/earn" />
      <Route component={NotFound} />
    </Switch>
  )
}

const Root: FC = () => {
  return (
    <HashRouter>
      <Providers>
        <Updaters />
        <Layout>
          <Routes />
        </Layout>
      </Providers>
    </HashRouter>
  )
}

render(<Root />, document.querySelector('#root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
