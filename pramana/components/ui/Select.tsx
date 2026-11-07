"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { AnchoredPopover } from "./AnchoredPopover";
import "./Select.css";

type Option = { value: string; label: string };

export function Select({ value, onChange, options, disabled, id, "aria-label": label, "aria-labelledby": labelledBy, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}) {
  const listId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const search = useRef({ text: "", at: 0 });
  const close = useCallback(() => setOpen(false), []);
  const selected = options.findIndex(option => option.value === value);

  useEffect(() => { if (disabled) close(); }, [disabled, close]);
  useEffect(() => {
    if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  function choose(index: number) {
    const option = options[index];
    if (option) onChange(option.value);
    close();
    trigger.current?.focus();
  }

  return <>
    <button ref={trigger} id={id} type="button" role="combobox" aria-label={label} aria-labelledby={labelledBy} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open ? `${listId}-${active}` : undefined} disabled={disabled} className={`input t-body planner-select-trigger ${className}`} onClick={() => { setActive(Math.max(0, selected)); setOpen(!open); }} onKeyDown={event => {
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const start = open ? active : Math.max(0, selected);
        setActive(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : !open ? start : (start + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
        setOpen(true);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (open) choose(active); else { setActive(Math.max(0, selected)); setOpen(true); }
      } else if (event.key === "Escape" && open) {
        event.preventDefault(); event.stopPropagation(); close();
      } else if (event.key === "Tab") close();
      else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        const now = Date.now();
        search.current = { text: (now - search.current.at < 700 ? search.current.text : "") + event.key.toLowerCase(), at: now };
        const match = options.findIndex(option => option.label.toLowerCase().startsWith(search.current.text));
        if (match >= 0) { setActive(match); setOpen(true); }
      }
    }}><span className="truncate">{options[selected]?.label ?? "Choose an option"}</span><ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 muted"/></button>
    {open && !disabled && <AnchoredPopover anchor={trigger} onClose={close} id={listId} role="listbox" className="planner-select-menu">
      {options.map((option, index) => <div id={`${listId}-${index}`} key={option.value} role="option" aria-selected={option.value === value} data-highlighted={active === index} className="t-body planner-select-option" onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span className="min-w-0 flex-1">{option.label}</span>{option.value === value && <Check size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0"/>}
      </div>)}
    </AnchoredPopover>}
  </>;
}
