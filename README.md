# StarForge

An **Obsidian** plugin for creating interactive 2D star maps inside your vault.

## Features

- ⭐ **2D Star Map** – Place stars on a coordinate grid with custom colours, sizes, types, and factions
- 🔗 **Linked Notes** – Click a star to open its associated Markdown note (auto-creates the file if it doesn't exist)
- 🚀 **Trade Routes** – Draw connection lines between stars to represent trade, travel, or any relationship
- 🖱️ **Pan & Zoom** – Drag to pan, scroll to zoom, zoom towards cursor position
- 🔍 **Hover Tooltips** – Hover over a star to see its name, type, and faction
- 🎨 **Glow Effects** – Stars have a subtle glow; different colours for different star types
- ⚙️ **Settings** – Configurable zoom level, label visibility, and trade line opacity

## How to Use

### Define a star map in any note

Wrap your data in a `starmap` code block:

````
```starmap
stars:
  - name: "Alpha"
    x: 0
    y: 0
    color: "#ffcc00"
    size: 4
    type: "Yellow Dwarf"
    faction: "Terran Federation"
    note: "Lore/Alpha"

  - name: "Beta"
    x: 15
    y: -8
    color: "#aaddff"
    size: 5
    type: "Blue Giant"

  - name: "Gamma"
    x: -10
    y: 12
    color: "#ff6644"
    size: 3
    type: "Red Dwarf"
    faction: "Zargon Empire"

tradeLines:
  - from: "Alpha"
    to: "Beta"
    volume: "high"
    color: "#44ff88"
    label: "Trade Route"

  - from: "Alpha"
    to: "Gamma"
    volume: "low"
    dashed: true
    label: "Blockaded"
```
````

### Open the map

1. Click the **globe icon** in the ribbon (left sidebar)
2. Or run the command **"Open current note as Star Map"**
3. Click any star with a `note:` field to open its linked file

## Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from [releases](https://github.com/KennyRN/starForge/releases)
2. Copy them to your vault's `.obsidian/plugins/starforge/` folder
3. Enable the plugin in **Settings → Community Plugins**

## Development

```bash
npm install
npm run dev    # Watch mode
npm run build  # Production build
```

## License

MIT
