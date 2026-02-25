'use client';

import { useToastContext } from '@/contexts/ToastContext';
import { useCallback } from 'react';

export function useToast() {
  const { addToast } = useToastContext();

  const toast = {
    success: useCallback((message: string, duration?: number) => {
      addToast(message, 'success', duration);
    }, [addToast]),

    error: useCallback((message: string, duration?: number) => {
      addToast(message, 'error', duration);
    }, [addToast]),

    info: useCallback((message: string, duration?: number) => {
      addToast(message, 'info', duration);
    }, [addToast]),
  };

  return toast;
}
