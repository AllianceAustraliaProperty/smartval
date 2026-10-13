import { useEffect, useRef, useState } from 'react';
import { affectedSections, updateSectionStatus } from './section-status';

export function useSectionStatus(watch: any, getValues: any, errors: any, ids: string[],
  getData: (data: any, id: string) => any, isComplete: (data: any, id: string) => boolean,
  hasErrors: (errors: any, id: string) => boolean) {
  const completed = useRef(new Set<string>());
  const invalid = useRef(new Set<string>());
  const [completedSections, setCompleted] = useState(completed.current);
  const [sectionsWithErrors, setErrors] = useState(invalid.current);
  useEffect(() => {
    const update = (value: any, name?: string) => {
      const next = updateSectionStatus(completed.current, affectedSections(name, ids),
        id => isComplete(getData(value, id), id));
      if (next !== completed.current) { completed.current = next; setCompleted(next); }
    };
    update(getValues());
    const subscription = watch((value: any, info: { name?: string }) => update(value, info.name));
    return () => subscription.unsubscribe();
  }, [watch, getValues, ids, getData, isComplete]);
  useEffect(() => {
    const next = updateSectionStatus(invalid.current, ids, id => hasErrors(errors, id));
    if (next !== invalid.current) { invalid.current = next; setErrors(next); }
  }, [errors, ids, hasErrors]);
  return { completedSections, sectionsWithErrors };
}
