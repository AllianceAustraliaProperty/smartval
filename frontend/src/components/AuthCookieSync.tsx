'use client';

import { useEffect } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AuthCookieSync() {
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      try {
        if (!isMounted) return;
        if (user) {
          const token = await user.getIdToken();
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            keepalive: true,
          });
        } else {
          await fetch('/api/auth/session', { method: 'DELETE', keepalive: true });
        }
      } catch (_) {
        // swallow errors to avoid interrupting navigation
      }
    });

    const intervalId = setInterval(async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          await user.getIdToken(true);
        } catch {
          // ignore
        }
      }
    }, 45 * 60 * 1000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  return null;
}


