"use client";

import { useRef, useState } from "react";

/**
 * Native drag-to-reorder for a list of cards, the pattern of the 005 list
 * editor: a card becomes draggable only while its handle is pressed, so text
 * inside the card stays selectable. The up/down buttons stay the keyboard and
 * touch path; the handle is `aria-hidden`.
 */
export function useReorder(onMove: (from: number, to: number) => void) {
  const [armed, setArmed] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);

  function itemProps(index: number) {
    return {
      draggable: armed === index,
      onDragStart: (event: React.DragEvent) => {
        dragFrom.current = index;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
      },
      onDragOver: (event: React.DragEvent) => {
        if (dragFrom.current === null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        const from = dragFrom.current;
        dragFrom.current = null;
        setArmed(null);
        if (from !== null && from !== index) onMove(from, index);
      },
      onDragEnd: () => {
        dragFrom.current = null;
        setArmed(null);
      },
    };
  }

  function handleProps(index: number) {
    return {
      "aria-hidden": true as const,
      onPointerDown: () => setArmed(index),
      onPointerUp: () => setArmed(null),
    };
  }

  return { itemProps, handleProps };
}
