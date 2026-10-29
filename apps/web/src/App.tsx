import { healthResponseSchema } from '@dnd/shared';
import { useQuery } from '@tanstack/react-query';

async function fetchHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return healthResponseSchema.parse(await res.json());
}

export function App() {
  const { data, isError } = useQuery({ queryKey: ['health'], queryFn: fetchHealth, retry: false });
  const status = isError ? 'caído' : data ? 'operativo' : 'comprobando…';

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">D&amp;D Assistant</h1>
      <p className="mt-2 text-slate-600">Servidor: {status}</p>
    </main>
  );
}
