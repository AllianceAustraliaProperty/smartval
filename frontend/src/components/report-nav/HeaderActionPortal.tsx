'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface HeaderActionPortalProps {
  children: React.ReactNode;
}

export const HeaderActionPortal: React.FC<HeaderActionPortalProps> = ({ children }) => {
  const [target, setTarget] = useState<HTMLElement | null>(() => {
    if (typeof document !== 'undefined') {
      return document.getElementById('report-card-header-action');
    }
    return null;
  });

  useEffect(() => {
    const el = document.getElementById('report-card-header-action');
    if (el && el !== target) {
      setTarget(el);
    }
  }, [target]);

  if (!target) return null;
  return createPortal(children, target);
};
