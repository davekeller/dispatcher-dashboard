import { Route, Routes } from 'react-router'
import Layout from './app/Layout'
import ActiveShiftPage from './views/shift/ActiveShiftPage'
import RouteFilePage from './views/route/RouteFilePage'
import EmptyState from './ui/EmptyState'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-6">
      <EmptyState title={`${title} isn't built for this exercise.`} body="Active Shift is the view a dispatcher lives in; this is here to show it sits inside a product." />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ActiveShiftPage />} />
        <Route path="routes/:driverId" element={<RouteFilePage />} />
        <Route path="drivers" element={<Placeholder title="Drivers" />} />
        <Route path="routes" element={<Placeholder title="Routes" />} />
        <Route path="reports" element={<Placeholder title="Reports" />} />
        <Route path="*" element={<Placeholder title="This page" />} />
      </Route>
    </Routes>
  )
}
