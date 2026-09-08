import { Link, Route, Routes } from 'react-router'
import Layout from './app/Layout'
import ActiveShiftPage from './views/shift/ActiveShiftPage'
import RouteFilePage from './views/route/RouteFilePage'
import MapPage from './views/map/MapPage'
import SettingsPage from './views/settings/SettingsPage'
import Button from './ui/Button'
import EmptyState from './ui/EmptyState'

function NotFound() {
  return (
    <div className="p-6">
      <EmptyState title="Nothing here." body="The board is the whole product for now." action={<Link to="/"><Button size="sm">Back to the board</Button></Link>} />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ActiveShiftPage />} />
        <Route path="routes/:driverId" element={<RouteFilePage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
