const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const fetchApi = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.erro?.mensagem || `API Error: ${response.status}`);
  }

  return response.json();
};
