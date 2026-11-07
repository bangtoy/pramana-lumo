"use client";
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { ChatMessage } from '@/lib/contracts';
import { AnchoredPopover } from '@/components/ui/AnchoredPopover';

type PlanChoice = NonNullable<ChatMessage['plan_choices']>[number];

export function InspectionPlanSelect({ plans, disabled, onChoose }: { plans: PlanChoice[]; disabled: boolean; onChoose: (plan: PlanChoice) => void }) {
  const listId = useId(), trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false), [search, setSearch] = useState(''), [active, setActive] = useState(0);
  const close = useCallback(() => setOpen(false), []);
  const terms = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = plans.filter(plan => terms.every(term => `${plan.title} ${plan.vehicle} ${plan.id}`.toLocaleLowerCase().includes(term)));
  const activeIndex = Math.min(active, Math.max(0, filtered.length - 1));
  useEffect(() => { if (disabled) close(); }, [disabled, close]);
  useEffect(() => { if (open) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' }); }, [open, activeIndex, search, listId]);

  function choose(plan: PlanChoice) {
    close(); trigger.current?.focus(); onChoose(plan);
  }

  return <div className="space-y-2 pt-1" data-inspection-plan-select>
    <p className="t-label muted font-normal">Inspection plan</p>
    <button ref={trigger} type="button" aria-label="Choose inspection plan" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${listId}-dialog` : undefined} disabled={disabled || !plans.length} className="input t-body-lg flex w-full min-h-12 items-center justify-between gap-3 text-left disabled:opacity-60" onClick={() => { setSearch(''); setActive(0); setOpen(!open); }} onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setSearch(''); setActive(event.key === 'ArrowUp' ? plans.length - 1 : 0); setOpen(true); } }}>
      <span className="min-w-0 whitespace-normal">Choose inspection plan</span><ChevronDown size={18} strokeWidth={1.5} className="shrink-0 muted" aria-hidden="true"/>
    </button>
    <p className="t-body-sm muted">{plans.length ? `${plans.length} plans available · Search by name or vehicle` : 'No active plans available. Ask your supervisor to prepare a plan.'}</p>
    {open && !disabled && <AnchoredPopover anchor={trigger} onClose={close} id={`${listId}-dialog`} role="dialog" aria-label="Choose inspection plan" maxHeight={360} className="panel floating flex flex-col overflow-hidden bg-[var(--color-surface)]">
      <div className="shrink-0 p-2 border-b border-[var(--color-line)]">
        <div className="relative"><Search size={18} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 muted pointer-events-none" aria-hidden="true"/>
          <input autoFocus role="combobox" type="search" aria-label="Search inspection plans" aria-autocomplete="list" aria-expanded="true" aria-controls={listId} aria-activedescendant={filtered.length ? `${listId}-${activeIndex}` : undefined} value={search} placeholder="Search plans…" className="input t-body-lg w-full min-h-12 !pl-10" onChange={event => { setSearch(event.target.value); setActive(0); }} onKeyDown={event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(filtered.length ? (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length : 0); }
            else if (event.key === 'Enter') { event.preventDefault(); if (!event.nativeEvent.isComposing && filtered[activeIndex]) choose(filtered[activeIndex]); }
            else if (event.key === 'Tab') { close(); trigger.current?.focus(); }
          }}/>
        </div>
      </div>
      <div id={listId} role="listbox" aria-label="Inspection plans" className="min-h-0 overflow-y-auto overscroll-contain p-1">
        {filtered.map((plan, index) => <div id={`${listId}-${index}`} key={plan.id} role="option" aria-selected={false} className={`cursor-pointer rounded-lg px-3 py-3 min-h-12 ${index === activeIndex ? 'bg-[var(--color-accent-subtle)] text-[var(--color-on-accent-subtle)]' : 'text-[var(--color-text-strong)]'}`} onPointerMove={() => setActive(index)} onPointerDown={event => { if (event.pointerType === 'mouse') event.preventDefault(); }} onClick={() => choose(plan)}>
          <p className="t-body-lg whitespace-normal [overflow-wrap:anywhere]">{plan.title}</p>
          <p className="t-body-sm muted mt-0.5 whitespace-normal [overflow-wrap:anywhere]">{plan.vehicle}{plans.some(other => other.id !== plan.id && other.title === plan.title) ? ` · ${plan.id}` : ''}</p>
        </div>)}
      </div>
      {!filtered.length && <p role="status" className="t-body-sm muted px-4 py-3">No plans match “{search}”. Try another name or vehicle.</p>}
    </AnchoredPopover>}
  </div>;
}
