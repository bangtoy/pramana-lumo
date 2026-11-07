"use client";

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/** Keeps a small popover in the viewport and outside its parent's scroll clipping. */
export function AnchoredPopover({ anchor, onClose, children, id, role, className, align = "start", minWidth = 0, maxHeight: heightLimit = 256, "aria-label": label, "aria-labelledby": labelledBy }: {
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  id?: string;
  role?: "listbox" | "menu" | "dialog";
  className?: string;
  align?: "start" | "end";
  minWidth?: number;
  maxHeight?: number;
  "aria-label"?: string;
  "aria-labelledby"?: string;
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
      const opensAbove = below < heightLimit && above > below;
      const maxHeight = Math.max(0, Math.min(heightLimit, opensAbove ? above : below));
      const width = Math.min(Math.max(rect.width, minWidth, align === "end" ? 168 : 0), window.innerWidth - edge * 2);
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
    function focusOutside(event: FocusEvent) {
      if (!anchor.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) onClose();
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); anchor.current?.focus(); }
    }
    place();
    window.addEventListener("resize", place);
    document.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", focusOutside);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", focusOutside);
      document.removeEventListener("keydown", escape);
    };
  }, [anchor, align, minWidth, heightLimit, onClose]);

  return createPortal(<div ref={panel} id={id} role={role} aria-label={label} aria-labelledby={labelledBy} className={className} style={{ position: "fixed", zIndex: 60, transitionProperty: "none", ...position }}>{children}</div>, document.body);
}
