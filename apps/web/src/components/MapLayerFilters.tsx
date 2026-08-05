type MapLayerFiltersProps = {
  showPaths: boolean
  showWater: boolean
  waterLoading?: boolean
  pathsLoading?: boolean
  pathsHint?: string
  onPathsChange: (value: boolean) => void
  onWaterChange: (value: boolean) => void
}

export function MapLayerFilters({
  showPaths,
  showWater,
  waterLoading,
  pathsLoading,
  pathsHint,
  onPathsChange,
  onWaterChange,
}: MapLayerFiltersProps) {
  return (
    <div className="map-layer-filters" role="group" aria-label="Map overlays">
      <label className={`map-layer-filters__item ${showPaths ? 'is-on' : ''}`}>
        <input
          type="checkbox"
          checked={showPaths}
          onChange={(event) => onPathsChange(event.target.checked)}
        />
        <span>
          Walking paths
          {pathsLoading ? '…' : ''}
          {pathsHint ? ` (${pathsHint})` : ''}
        </span>
      </label>
      <label className={`map-layer-filters__item ${showWater ? 'is-on' : ''}`}>
        <input
          type="checkbox"
          checked={showWater}
          onChange={(event) => onWaterChange(event.target.checked)}
        />
        <span>
          Water
          {waterLoading ? '…' : ''}
        </span>
      </label>
    </div>
  )
}
