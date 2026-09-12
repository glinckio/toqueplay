/** Etapa de um torneio, no formato que a API devolve. */
export interface StageLike {
  id: string;
  name?: string | null;
  date: string;
  startTime?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  maxTeams?: number | null;
}

/**
 * Próxima etapa que ainda não aconteceu.
 *
 * Num circuito de 6 etapas com 2 já realizadas, é a etapa 3 que interessa a quem abre a tela —
 * mostrar sempre a primeira faria o torneio parecer parado no passado. Se todas já passaram,
 * devolve a última, que é o retrato mais fiel do estado do torneio.
 */
export function nextPendingStage<T extends StageLike>(stages: T[] | undefined | null): T | null {
  if (!stages || stages.length === 0) return null;

  const ordenadas = [...stages].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  // Compara pelo fim do dia: etapa que acontece hoje ainda e a proxima, nao uma etapa passada.
  const agora = Date.now();
  const fimDoDia = (iso: string) => {
    const d = new Date(iso);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  };

  return ordenadas.find((st) => fimDoDia(st.date) >= agora) ?? ordenadas[ordenadas.length - 1];
}

/** Posição da etapa na sequência (1-based), para rotular "Etapa 3 de 6". */
export function stageIndex<T extends StageLike>(stages: T[] | undefined | null, stageId: string): number {
  if (!stages) return 0;
  const ordenadas = [...stages].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  return ordenadas.findIndex((st) => st.id === stageId) + 1;
}
