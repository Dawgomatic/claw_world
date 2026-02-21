// SWE100821: Resizable split-pane layout — monitor left, 3D world right.

import { useCallback, useRef, type ReactNode } from 'react';
import { useUIStore } from '../store/ui-store.ts';

interface Props {
  left: ReactNode;
  right: ReactNode;
}

export function SplitLayout({ left, right }: Props) {
  const splitRatio = useUIStore((s) => s.splitRatio);
  const setSplitRatio = useUIStore((s) => s.setSplitRatio);
  const dragging = useRef(false);

  const onMouseDown = useCallback(() => {
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setSplitRatio(e.clientX / window.innerWidth);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [setSplitRatio]);

  const leftW = `${splitRatio * 100}%`;
  const rightW = `${(1 - splitRatio) * 100}%`;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950">
      <div style={{ width: leftW }} className="flex-shrink-0 overflow-hidden">
        {left}
      </div>
      <div
        onMouseDown={onMouseDown}
        className="w-1 cursor-col-resize bg-gray-700 hover:bg-indigo-500 transition-colors flex-shrink-0"
      />
      <div style={{ width: rightW }} className="flex-grow overflow-hidden">
        {right}
      </div>
    </div>
  );
}
