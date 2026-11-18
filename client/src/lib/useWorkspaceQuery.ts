'use client';

import { useEffect, useReducer, useState } from 'react';
import { errorMessage, useAuth } from '@/context/AuthContext';

export function useWorkspaceQuery<T>(endpoint: string) {
  const { apiFetch, user } = useAuth();
  const userId = user?.id;
  const [version, reload] = useReducer((value: number) => value + 1, 0);
  const [result, setResult] = useState<{ endpoint: string; userId: string; data?: T; error?: string }>();
  useEffect(() => {
    if (!userId) return;
    let current = true;
    const controller = new AbortController();
    void apiFetch<T>(endpoint, { signal: controller.signal }).then(
      data => { if (current) setResult({ endpoint, userId, data }); },
      error => { if (current) setResult({ endpoint, userId, error: errorMessage(error, 'Unable to load workspace data.') }); },
    );
    return () => { current = false; controller.abort(); };
  }, [apiFetch, userId, endpoint, version]);
  return { ...(result?.endpoint === endpoint && result?.userId === userId ? result : {}), reload };
}
