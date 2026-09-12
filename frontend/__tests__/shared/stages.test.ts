import { nextPendingStage, stageIndex } from "@/shared/stages";

const etapa = (id: string, diasDeHoje: number) => {
  const d = new Date();
  d.setDate(d.getDate() + diasDeHoje);
  return { id, date: d.toISOString() };
};

describe("nextPendingStage", () => {
  it("devolve a primeira etapa que ainda nao aconteceu", () => {
    const stages = [etapa("e1", -30), etapa("e2", -10), etapa("e3", 5), etapa("e4", 40)];
    expect(nextPendingStage(stages)?.id).toBe("e3");
  });

  // Etapa que acontece hoje ainda e a proxima: so vira passado depois que o dia acaba.
  it("considera a etapa de hoje como pendente", () => {
    expect(nextPendingStage([etapa("passada", -5), etapa("hoje", 0)])?.id).toBe("hoje");
  });

  // Circuito encerrado: mostrar a ultima e mais fiel que nao mostrar nada.
  it("cai para a ultima quando todas ja passaram", () => {
    expect(nextPendingStage([etapa("e1", -30), etapa("e2", -10)])?.id).toBe("e2");
  });

  it("ordena antes de escolher, sem confiar na ordem recebida", () => {
    const stages = [etapa("tarde", 20), etapa("cedo", 3), etapa("passada", -2)];
    expect(nextPendingStage(stages)?.id).toBe("cedo");
  });

  it("devolve null sem etapas", () => {
    expect(nextPendingStage([])).toBeNull();
    expect(nextPendingStage(undefined)).toBeNull();
  });
});

describe("stageIndex", () => {
  it("numera pela ordem cronologica, nao pela ordem do array", () => {
    const stages = [etapa("tarde", 20), etapa("cedo", 3)];
    expect(stageIndex(stages, "cedo")).toBe(1);
    expect(stageIndex(stages, "tarde")).toBe(2);
  });
});
