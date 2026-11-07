"use client";

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/** Keeps a small popover in the viewport and outside its parent's scroll clipping. */
export function AnchoredPopover({ anchor, onClose, children, id, role, className, align = "start" }: {
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  id?: string;
  role?: "listbox" | "menu";
  className?: string;
  align?: "start" | "end";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 256 });

  useLayoutEffect(() => {
    function place() {
      const trigger = anchor.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const gap = 4, edge = 8;
      const below = window.innerHeight - rect.bottom - gap - edge;
      const above = rect.top - gap - edge;
      const opensAbove = below < 200 && above > below;
      const maxHeight = Math.max(0, Math.min(256, opensAbove ? above : below));
      const width = Math.min(Math.max(rect.width, align === "end" ? 168 : 0), window.innerWidth - edge * 2);
      if (panel.current) panel.current.style.width = `${width}px`;
      const height = Math.min((panel.current?.scrollHeight ?? maxHeight) + 2, maxHeight);
      setPosition({
        top: opensAbove ? Math.max(edge, rect.top - gap - height) : rect.bottom + gap,
        left: Math.max(edge, Math.min(align === "end" ? rect.right - width : rect.left, window.innerWidth - width - edge)),
        width,
        maxHeight,
      });
    }
    function outside(event: PointerEvent) {
      if (!anchor.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) onClose();
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); anchor.current?.focus(); }
    }
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [anchor, align, onClose]);

  return createPortal(<div ref={panel} id={id} role={role} className={className} style={{ position: "fixed", zIndex: 60, transitionProperty: "none", ...position }}>{children}</div>, document.body);
}
