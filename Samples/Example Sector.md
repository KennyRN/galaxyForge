# Example Sector

> A small sample star map to demonstrate StarForge.

```starmap
stars:
  - name: "Alpha"
    x: 0
    y: 0
    color: "#ffcc00"
    size: 4
    type: "Yellow Dwarf"
    faction: "Terran Federation"
    note: "Samples/Alpha"

  - name: "Beta"
    x: 15
    y: -8
    color: "#aaddff"
    size: 5
    type: "Blue Giant"
    faction: "Terran Federation"
    note: "Samples/Beta"

  - name: "Gamma"
    x: -10
    y: 12
    color: "#ff6644"
    size: 3
    type: "Red Dwarf"
    faction: "Zargon Empire"
    note: "Samples/Gamma"

  - name: "Delta"
    x: -5
    y: -12
    color: "#88ff88"
    size: 2
    type: "Uncharted"
    note: "Samples/Delta"

tradeLines:
  - from: "Alpha"
    to: "Beta"
    volume: "high"
    color: "#44ff88"
    label: "Trade Route"

  - from: "Alpha"
    to: "Gamma"
    volume: "low"
    color: "#ff8844"
    dashed: true
    label: "Blockaded"

  - from: "Beta"
    to: "Gamma"
    volume: "medium"
    color: "#aaaaff"
```

## Notes

- **Alpha** – Capital system of the Terran Federation.
- **Beta** – Major industrial hub.
- **Gamma** – Zargon outpost; trade is heavily restricted.
- **Delta** – An uncharted system with unknown potential.
