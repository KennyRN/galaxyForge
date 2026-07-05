export interface Star {
  id: string;
  name: string;
  x: number;
  y: number;
  color?: string;
  size?: number;
  note?: string;        // path to a .md file
  faction?: string;
  type?: string;        // e.g. "blue giant", "red dwarf", "yellow"
}

export interface TradeLine {
  id: string;
  from: string;         // star id
  to: string;           // star id
  color?: string;
  width?: number;
  dashed?: boolean;
  label?: string;
  volume?: 'low' | 'medium' | 'high';
}

export interface StarMapData {
  stars: Star[];
  tradeLines: TradeLine[];
}

export interface ViewportState {
  offsetX: number;
  offsetY: number;
  zoom: number;
}
