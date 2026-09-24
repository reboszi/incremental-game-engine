import type { Resource } from './types'

export function ResourceView({ resource }: { resource: Resource }) {
  const value = resource.initialValue
  const suffix = resource.unit ? ` ${resource.unit}` : ''
  const max = resource.maxValue
  const hasMax = max !== null && max > 0 && Number.isFinite(max)
  const percent = hasMax ? Math.max(0, Math.min(100, (value / max) * 100)) : 0

  return (
    <div className="resource-view">
      <span className="resource-view-icon" aria-hidden="true">{resource.icon || '◇'}</span>
      <span className="resource-view-info">
        <span className="resource-view-name">{resource.name}</span>
        <span className="resource-view-value">
          {resource.displayMode === 'value' || max === null ? `${value}${suffix}` : `${value} / ${max}${suffix}`}
        </span>
        {resource.displayMode === 'bar' && (
          <span className="resource-view-track" role="progressbar" aria-label={resource.name}
            aria-valuemin={0} aria-valuemax={hasMax ? max : 100} aria-valuenow={hasMax ? Math.max(0, Math.min(max, value)) : 0}>
            <span className="resource-view-fill" style={{ width: `${percent}%` }} />
          </span>
        )}
        {resource.displayMode === 'bar' && !hasMax && <span className="resource-view-hint">Set a positive maximum</span>}
      </span>
    </div>
  )
}
