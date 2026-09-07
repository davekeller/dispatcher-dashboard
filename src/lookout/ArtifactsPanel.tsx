import EmptyState from '../ui/EmptyState'

/** Reserved workspace for durable Lookout output. */
export default function ArtifactsPanel() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 font-lookout">
      <EmptyState title="No artifacts yet." body="Lookout artifacts will appear here when they are created." />
    </div>
  )
}
