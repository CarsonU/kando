import { useCallback, useEffect, useMemo, useState } from 'react';

// Device-local (not synced) set of collapsed column ids. Kept separate from the
// board doc under STORAGE_KEY so collapsing a column never touches synced data.
const KEY = 'kanban-collapsed-columns-v1';

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useCollapsedColumns() {
  const [ids, setIds] = useState<string[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* ignore write failures (private mode, quota, etc.) */
    }
  }, [ids]);

  const toggle = useCallback((columnId: string) => {
    setIds((prev) =>
      prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId],
    );
  }, []);

  const collapsed = useMemo(() => new Set(ids), [ids]);
  return { collapsed, toggle };
}
