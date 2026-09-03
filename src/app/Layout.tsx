import { Outlet } from 'react-router'
import { ActionProvider } from '../actions/ActionContext'
import ActionDialogs from '../actions/ActionDialogs'
import { LookoutProvider } from '../lookout/LookoutContext'
import LookoutSidebar from '../lookout/LookoutSidebar'
import Toast from '../ui/Toast'
import DevPanel from './DevPanel'
import Header from './Header'
import LeftNav from './LeftNav'

/** Three panes: nav · main · Lookout. Lookout is mounted once here and reads derived
 *  state itself; pages tell it which driver to focus through LookoutContext. */
export default function Layout() {
  return (
    <LookoutProvider>
      <ActionProvider>
        <div className="flex h-screen overflow-hidden bg-canvas text-ink">
          <LeftNav />
          <main className="flex min-w-0 flex-1 flex-col">
            <Header />
            <div className="min-h-0 flex-1 overflow-auto">
              <Outlet />
            </div>
          </main>
          <LookoutSidebar />
        </div>
        <ActionDialogs />
        <Toast />
        <DevPanel />
      </ActionProvider>
    </LookoutProvider>
  )
}
