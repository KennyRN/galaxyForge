# Example Sector

> A small sample star map to demonstrate StarForge.

```starmap
systems:
  - sysid: "QXMVPA"
    name: "Alpha"
    x: 0.00
    y: 0.00
    z: 0.00
    color: "#ffcc00"
    size: 4
    type: "Yellow Dwarf"
    faction: "Terran Federation"

  - sysid: "BGHJKL"
    name: "Beta"
    x: 15.00
    y: -8.00
    z: 3.20
    color: "#aaddff"
    size: 5
    type: "Blue Giant"
    faction: "Terran Federation"

  - sysid: "XWZRTC"
    name: "Gamma"
    x: -10.00
    y: 12.00
    z: -1.50
    color: "#ff6644"
    size: 3
    type: "Red Dwarf"
    faction: "Zargon Empire"

  - sysid: "DEMFKL"
    x: -5.00
    y: -12.00
    z: 6.80
    color: "#88ff88"
    size: 2
    type: "Uncharted"

tradeLines:
  - from: "QXMVPA"
    to: "BGHJKL"
    volume: "high"
    color: "#44ff88"
    label: "Trade Route"

  - from: "QXMVPA"
    to: "XWZRTC"
    volume: "low"
    color: "#ff8844"
    dashed: true
    label: "Blockaded"

  - from: "BGHJKL"
    to: "XWZRTC"
    volume: "medium"
    color: "#aaaaff"
```

## Notes

- **QXMVPA (Alpha)** – Capital system of the Terran Federation.
- **BGHJKL (Beta)** – Major industrial hub.
- **XWZRTC (Gamma)** – Zargon outpost; trade restricted.
- **DEMFKL** – An uncharted system (no name assigned; uses sysid as fallback).
