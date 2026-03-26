# LegendLayer.setSource

## Summary
LegendLayer.setSource switches the legend data source and marks legend state dirty for redraw. The layer unsubscribes from previous source signals and subscribes to the new source when available. Use this when changing scalar fields or colormaps interactively.

## Syntax
```ts
LegendLayer.setSource(source: OverlayLegendSource): void
layer.setSource(source);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `source` | `OverlayLegendSource` | Yes | New legend source object or explicit scale/colormap descriptor. |

## Returns
`void` - No return value.

## Type Details
### OverlayLegendExplicitSource

```ts
type OverlayLegendExplicitSource = {
    scaleTransform: ScaleTransformDescriptor | ScaleTransform;
    colormap: Colormap | BuiltinColormapName;
    colormapStops?: ReadonlyArray<Color4>;
};
```

### OverlayLegendSource

```ts
type OverlayLegendSource = PointCloud | GlyphField | DataMaterial | OverlayLegendExplicitSource;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const legend = wgpu.createOverlay.legend({
    source: { scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }, colormap: "viridis" }
});
legend.setSource({
    scaleTransform: { mode: "linear", domainMin: -2, domainMax: 2 },
    colormap: "plasma"
});
```

## See Also
- [WasmGPU.createOverlay.legend](./wasmgpu-createoverlay-legend.md)
- [LegendLayer.update](./wasmgpu-world-legendlayer-update.md)
- [OverlaySystem.invalidate](./wasmgpu-world-overlaysystem-invalidate.md)
