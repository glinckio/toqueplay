import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { api, getErrorCode, getErrorMessage } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";

describe("getErrorCode", () => {
  it("lê o code que a API devolve no corpo", () => {
    expect(getErrorCode({ response: { data: { code: "EMAIL_NOT_VERIFIED" } } })).toBe(
      "EMAIL_NOT_VERIFIED",
    );
  });

  it("devolve undefined quando não há code", () => {
    expect(getErrorCode({ response: { data: { message: "boom" } } })).toBeUndefined();
    expect(getErrorCode(new Error("rede caiu"))).toBeUndefined();
  });
});

describe("getErrorMessage", () => {
  it("prefere a mensagem amigável do code ao message genérico do Nest", () => {
    const err = {
      response: { data: { statusCode: 401, code: "EMAIL_NOT_VERIFIED", message: "Unauthorized" } },
    };
    expect(getErrorMessage(err, "fallback")).toBe("Confirme seu email antes de entrar.");
  });
});

describe("interceptor de 401", () => {
  const originalAdapter = api.defaults.adapter;
  let requests: string[] = [];

  // Sem lib de mock de rede: troca-se o adapter do axios por um stub. Um adapter custom é
  // responsável pelo validateStatus, então o erro HTTP precisa ser rejeitado aqui mesmo, no
  // formato que o interceptor lê (`response.status` + `config`).
  const respondWith = (status: number, data: unknown) => {
    api.defaults.adapter = (config: AxiosRequestConfig): Promise<AxiosResponse> => {
      requests.push(config.url ?? "");
      return Promise.reject(
        Object.assign(new Error(`Request failed with status code ${status}`), {
          isAxiosError: true,
          config,
          response: { data, status, statusText: "", headers: {}, config },
        }),
      );
    };
  };

  beforeEach(() => {
    requests = [];
    useAuthStore.setState({ accessToken: "at-antigo", refreshToken: "rt-antigo" } as never);
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  // Regressão: com um refresh token velho no store, o interceptor tentava renovar o token num
  // 401 de /auth/login e rejeitava com o erro do refresh — o `code` que a tela de login usa para
  // mandar o usuário à verificação de e-mail sumia no caminho.
  it("preserva o code de um 401 vindo do login", async () => {
    respondWith(401, {
      statusCode: 401,
      code: "EMAIL_NOT_VERIFIED",
      message: "Unauthorized Exception",
    });

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({
      response: { data: { code: "EMAIL_NOT_VERIFIED" } },
    });
    // Só o próprio login foi chamado: nenhuma tentativa de refresh no meio.
    expect(requests).toEqual(["/auth/login"]);
    expect(useAuthStore.getState().refreshToken).toBe("rt-antigo");
  });

  it("não tenta renovar o token num 401 de resend-code", async () => {
    respondWith(401, { statusCode: 401, code: "USER_NOT_FOUND" });

    await expect(api.post("/auth/resend-code", {})).rejects.toMatchObject({
      response: { data: { code: "USER_NOT_FOUND" } },
    });
    expect(requests).toEqual(["/auth/resend-code"]);
  });
});
