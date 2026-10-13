/** Reuse the previous Set unless a visible indicator actually changes. */
export function updateSectionStatus(previous: Set<string>, ids: string[], check: (id: string) => boolean) {
  let next = previous;
  for (const id of ids) {
    const complete = check(id);
    if (previous.has(id) !== complete) {
      if (next === previous) next = new Set(previous);
      if (complete) next.add(id); else next.delete(id);
    }
  }
  return next;
}

export function affectedSections(name: string | undefined, ids: string[]) {
  if (!name) return ids; // load/reset affects every section
  const root = name.split('.')[0];
  if (root === 'address') return ['propertyAddress'];
  if (root === 'primaryContact') return ids.includes('primaryContact') ? ['primaryContact'] : ['propertyAddress'];
  return ids.includes(root) ? [root] : [];
}
