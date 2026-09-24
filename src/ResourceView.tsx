import type { Resource } from './types'

export function ResourceView({ resource }: { resource: Resource }) {
  const value = resource.initialValue
  const suffix = resource.unit ? ` ${resource.unit}` : ''
  const max = resource.maxValue
  const percent = max !== null && max > 0 ? Math.max(0, Math.min(100, value / max * 100)) : 0

  return (
    <div className="resource-view">
      <span className="resource-view-name">{resource.name}</span>
      <span className="resource-view-value">
        {resource.displayMode === 'value' ? `${value}${suffix}` :
          max === null ? `${value}${suffix}` : `${value} / ${max}${suffix}`}
      </span>
      {resource.displayMode === 'bar' && max !== null && (
        <div className="resource-view-track">
          <div className="resource-view-fill" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  )
}
