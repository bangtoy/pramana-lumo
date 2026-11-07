"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { jakartaDay } from "@/lib/waktu";
import { AnchoredPopover } from "./AnchoredPopover";
import "./Select.css";
import "./DatePicker.css";

const fullDate = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDate = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const monthDate = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" });
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
function parse(day: string) {
  const date = new Date(`${day}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? date : null;
}
function offset(day: string, days: number) {
  const date = parse(day)!;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function monthOffset(day: string, months: number) {
  const date = parse(day)!, dayOfMonth = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(date); last.setUTCMonth(last.getUTCMonth() + 1); last.setUTCDate(0);
  date.setUTCDate(Math.min(dayOfMonth, last.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

export function DatePicker({ value, onChange, min, max, disabled, placeholder = "Select date", className = "", "aria-label": label }: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label": string;
}) {
  const calendarId = useId(), titleId = `${calendarId}-title`;
  const trigger = useRef<HTMLButtonElement>(null);
  const today = jakartaDay();
  const lower = min && parse(min) ? min : "0001-01-01", upper = max && parse(max) ? max : "9999-12-31";
  const clamp = (day: string) => day < lower ? lower : day > upper ? upper : day;
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(value && parse(value) ? value : today);
  const [month, setMonth] = useState(`${focused.slice(0, 7)}-01`);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => { if (disabled) close(); }, [disabled, close]);
  useEffect(() => { if (open) document.getElementById(`${calendarId}-${focused}`)?.focus({ preventScroll: true }); }, [open, focused, calendarId]);

  function show() {
    const start = clamp(value && parse(value) ? value : today);
    setFocused(start); setMonth(`${start.slice(0, 7)}-01`); setOpen(true);
  }
  function choose(day: string) {
    onChange(day); close(); trigger.current?.focus();
  }
  function move(day: string) {
    const next = clamp(day);
    setFocused(next); setMonth(`${next.slice(0, 7)}-01`);
  }
  function keydown(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const date = parse(day)!;
    const change = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[event.key];
    if (change !== undefined) { event.preventDefault(); move(offset(day, change)); }
    else if (event.key === "Home" || event.key === "End") { event.preventDefault(); const weekday = (date.getUTCDay() + 6) % 7; move(offset(day, event.key === "Home" ? -weekday : 6 - weekday)); }
    else if (event.key === "PageUp" || event.key === "PageDown") { event.preventDefault(); move(monthOffset(day, (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1))); }
  }
  const start = offset(month, -(parse(month)!.getUTCDay() + 6) % 7);
  const days = Array.from({ length: 42 }, (_, index) => offset(start, index));
  const date = parse(value);
  return <>
    <button ref={trigger} type="button" className={`input t-body planner-select-trigger date-picker-trigger ${className}`} aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? calendarId : undefined} data-value={value} disabled={disabled} onClick={() => open ? close() : show()} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); show(); } }}>
      <span className={`truncate ${value ? "" : "muted"}`}>{date ? shortDate.format(date) : value || placeholder}</span><CalendarDays size={16} strokeWidth={1.5} aria-hidden="true" className="muted shrink-0"/>
    </button>
    {open && !disabled && <AnchoredPopover anchor={trigger} onClose={close} id={calendarId} role="dialog" aria-label={`${label} calendar`} minWidth={288} maxHeight={400} className="planner-select-menu date-picker-menu">
      <div className="date-picker-header" data-calendar-month={month.slice(0, 7)}>
        <button type="button" className="date-picker-icon" aria-label="Previous month" disabled={month <= lower.slice(0, 7) + "-01"} onClick={() => move(monthOffset(focused, -1))}><ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true"/></button>
        <span id={titleId} className="t-body font-medium" aria-live="polite">{monthDate.format(parse(month)!)}</span>
        <button type="button" className="date-picker-icon" aria-label="Next month" disabled={month >= upper.slice(0, 7) + "-01"} onClick={() => move(monthOffset(focused, 1))}><ChevronRight size={16} strokeWidth={1.5} aria-hidden="true"/></button>
      </div>
      <table role="grid" aria-labelledby={titleId} className="date-picker-grid">
        <thead><tr>{weekdays.map(day => <th key={day} scope="col" className="t-label muted font-normal"><abbr title={day}>{day.slice(0, 2)}</abbr></th>)}</tr></thead>
        <tbody>{Array.from({ length: 6 }, (_, week) => <tr key={week}>{days.slice(week * 7, week * 7 + 7).map(day => <td key={day} role="gridcell" aria-selected={day === value}>
          <button id={`${calendarId}-${day}`} type="button" className="t-body date-picker-day" tabIndex={day === focused ? 0 : -1} aria-label={fullDate.format(parse(day)!)} aria-current={day === today ? "date" : undefined} data-value={day} data-selected={day === value} data-outside={day.slice(0, 7) !== month.slice(0, 7)} disabled={day < lower || day > upper} onClick={() => choose(day)} onKeyDown={event => keydown(event, day)}>{Number(day.slice(-2))}</button>
        </td>)}</tr>)}</tbody>
      </table>
      <div className="date-picker-footer"><button type="button" className="t-body-sm date-picker-text" disabled={today < lower || today > upper} onClick={() => choose(today)}>Today</button><button type="button" className="t-body-sm date-picker-text" disabled={!value} onClick={() => choose("")}>Clear date</button></div>
    </AnchoredPopover>}
  </>;
}
