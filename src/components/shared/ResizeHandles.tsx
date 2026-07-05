// Invisible edge/corner hit-areas that let the user resize the frameless
// window. Because `decorations: false` hides the native window chrome,
// Tauri/the OS has no border to hit-test for resizing — we have to opt in
// per-edge via `startResizeDragging`.

import { getCurrentWindow } from '@tauri-apps/api/window';
import type { CSSProperties, PointerEvent } from 'react';

//Define direction enum to resize windows size
type Direction =
  | 'North'
  | 'South'
  | 'East'
  | 'West'
  | 'NorthEast'
  | 'NorthWest'
  | 'SouthEast'
  | 'SouthWest';

const EDGE = 6; // px hit-area along straight edges
const CORNER = 10; // px hit-area at corners (square)

const CURSOR: Record<Direction, string> = {
  North: 'ns-resize',
  South: 'ns-resize',
  East: 'ew-resize',
  West: 'ew-resize',
  NorthEast: 'nesw-resize',
  SouthWest: 'nesw-resize',
  NorthWest: 'nwse-resize',
  SouthEast: 'nwse-resize',
};

function startResize(direction: Direction) {
  return (e: PointerEvent) => {
    if (e.button !== 0) return; // left click only
    e.preventDefault();
    getCurrentWindow().startResizeDragging(direction).catch(console.error);
  };
}

function handleStyle(direction: Direction, rect: CSSProperties): CSSProperties {
  return {
    position: 'absolute',
    cursor: CURSOR[direction],
    zIndex: 50,
    ...rect,
  };
}

export function ResizeHandles() {
  return (
    <>
      {/* Straight edges */}
      <div onPointerDown={startResize('North')} style={handleStyle('North', { top: 0, left: CORNER, right: CORNER, height: EDGE })} />
      <div onPointerDown={startResize('South')} style={handleStyle('South', { bottom: 0, left: CORNER, right: CORNER, height: EDGE })} />
      <div onPointerDown={startResize('West')} style={handleStyle('West', { left: 0, top: CORNER, bottom: CORNER, width: EDGE })} />
      <div onPointerDown={startResize('East')} style={handleStyle('East', { right: 0, top: CORNER, bottom: CORNER, width: EDGE })} />

      {/* Corners */}
      <div onPointerDown={startResize('NorthWest')} style={handleStyle('NorthWest', { top: 0, left: 0, width: CORNER, height: CORNER })} />
      <div onPointerDown={startResize('NorthEast')} style={handleStyle('NorthEast', { top: 0, right: 0, width: CORNER, height: CORNER })} />
      <div onPointerDown={startResize('SouthWest')} style={handleStyle('SouthWest', { bottom: 0, left: 0, width: CORNER, height: CORNER })} />
      <div onPointerDown={startResize('SouthEast')} style={handleStyle('SouthEast', { bottom: 0, right: 0, width: CORNER, height: CORNER })} />
    </>
  );
}
