import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toISODate } from '../dateUtils';

interface DatePickerProps {
  anchorEl: HTMLElement | null;
  /** Currently selected due date ('YYYY-MM-DD'), or null when unset. */
  value: string | null;
  /** Called with an ISO date to set, or null to clear. */
  onSelect: (iso: string | null) => void;
  onClose: () => void;
}

const WIDTH = 220;

interface QuickDay {
  iso: string;
  weekday: string;
  date: string;
  label?: string;
}

/** Build the quick list: Today, then the next 6 days, each with weekday + short date. */
function buildQuickDays(): QuickDay[] {
  const days: QuickDay[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let offset = 0; offset <= 6; offset++) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    days.push({
      iso: toISODate(d),
      weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
      date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : undefined,
    });
  }
  return days;
}

export default function DatePicker({ anchorEl, value, onSelect, onClose }: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });
  const [days] = useState(buildQuickDays);

  // Position the portaled popover next to the anchor card, clamped to viewport.
  useLayoutEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    const height = rootRef.current?.offsetHeight ?? 320;
    const left = Math.min(Math.max(r.right - WIDTH, 8), window.innerWidth - WIDTH - 8);
    const top =
      r.bottom + 6 + height > window.innerHeight
        ? Math.max(8, r.top - height - 6)
        : r.bottom + 6;
    setPos({ top, left });
  }, [anchorEl, showCalendar]);

  // Close on outside click or Escape.
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  function choose(iso: string | null) {
    onSelect(iso);
    onClose();
  }

  return createPortal(
    <div
      className="date-picker"
      ref={rootRef}
      style={{ top: pos.top, left: pos.left, width: WIDTH }}
    >
      <div className="date-picker__heading">Due date</div>

      <ul className="date-picker__list">
        {days.map((day) => (
          <li key={day.iso}>
            <button
              type="button"
              className={`date-picker__option${day.iso === value ? ' is-selected' : ''}`}
              onClick={() => choose(day.iso)}
            >
              <span className="date-picker__weekday">{day.label ?? day.weekday}</span>
              <span className="date-picker__date">{day.date}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="date-picker__footer">
        {showCalendar ? (
          <input
            type="date"
            className="date-picker__input"
            defaultValue={value ?? ''}
            autoFocus
            onChange={(e) => choose(e.target.value || null)}
          />
        ) : (
          <button
            type="button"
            className="date-picker__calendar"
            onClick={() => setShowCalendar(true)}
          >
            <CalendarIcon />
            Pick a date…
          </button>
        )}
        {value && (
          <button type="button" className="date-picker__clear" onClick={() => choose(null)}>
            Clear
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
