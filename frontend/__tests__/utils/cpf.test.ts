import { formatCPF, unformatCPF } from "@/utils/cpf";

describe("formatCPF", () => {
  it("aplica a mascara conforme o usuario digita", () => {
    expect(formatCPF("123")).toBe("123");
    expect(formatCPF("1234")).toBe("123.4");
    expect(formatCPF("1234567")).toBe("123.456.7");
    expect(formatCPF("12345678901")).toBe("123.456.789-01");
  });

  // Sem isso, colar um CPF ja mascarado duplicaria os pontos.
  it("reaplica a mascara sobre um valor ja formatado", () => {
    expect(formatCPF("123.456.789-01")).toBe("123.456.789-01");
  });

  it("descarta o que passa de 11 digitos", () => {
    expect(formatCPF("123456789012345")).toBe("123.456.789-01");
  });

  it("ignora caracteres que nao sao digitos", () => {
    expect(formatCPF("abc123")).toBe("123");
  });
});

describe("unformatCPF", () => {
  // A API sempre recebe o CPF sem mascara.
  it("devolve so os digitos", () => {
    expect(unformatCPF("123.456.789-01")).toBe("12345678901");
    expect(unformatCPF("")).toBe("");
  });
});
