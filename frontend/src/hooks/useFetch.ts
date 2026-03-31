import { useState, useEffect } from 'react';
import { fetchApi } from '../services/api';

interface State<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export const useFetch = <T>(endpoint: string) => {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const data = await fetchApi<T>(endpoint);
        if (isMounted) setState({ data, loading: false, error: null });
      } catch (err) {
        if (isMounted) setState({ data: null, loading: false, error: (err as Error).message });
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [endpoint]);

  return state;
};
