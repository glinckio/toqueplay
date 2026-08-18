import { authService } from "@/services/authService";
import { api } from "@/services/api";

jest.mock("@/services/api", () => ({
  api: {
    post: jest.fn(),
  },
}));

const mockPost = api.post as jest.MockedFunction<typeof api.post>;

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("login calls POST /auth/login", async () => {
    mockPost.mockResolvedValueOnce({
      data: { accessToken: "at", refreshToken: "rt", user: { id: "1", email: "a@b.com", name: "A" } },
    });
    const result = await authService.login("a@b.com", "123456");
    expect(mockPost).toHaveBeenCalledWith("/auth/login", { email: "a@b.com", password: "123456" });
    expect(result.accessToken).toBe("at");
  });

  it("login returns 2FA response", async () => {
    mockPost.mockResolvedValueOnce({
      data: { twoFactorRequired: true, temporaryToken: "tok", userId: "1" },
    });
    const result = await authService.login("a@b.com", "123456");
    expect(authService.isTwoFactorRequired(result)).toBe(true);
  });

  it("register calls POST /auth/register", async () => {
    mockPost.mockResolvedValueOnce({ data: { message: "ok" } });
    const result = await authService.register({
      name: "Test",
      email: "a@b.com",
      cpf: "12345678901",
      password: "123456",
      confirmPassword: "123456",
      consent: true,
    });
    expect(mockPost).toHaveBeenCalledWith("/auth/register", expect.objectContaining({ email: "a@b.com" }));
    expect(result.message).toBe("ok");
  });

  it("verifyEmail calls POST /auth/verify-email", async () => {
    mockPost.mockResolvedValueOnce({
      data: { accessToken: "at", refreshToken: "rt", user: { id: "1" } },
    });
    await authService.verifyEmail("a@b.com", "123456");
    expect(mockPost).toHaveBeenCalledWith("/auth/verify-email", { email: "a@b.com", code: "123456" });
  });

  it("resendCode calls POST /auth/resend-code", async () => {
    mockPost.mockResolvedValueOnce({ data: { message: "sent" } });
    await authService.resendCode("a@b.com");
    expect(mockPost).toHaveBeenCalledWith("/auth/resend-code", { email: "a@b.com" });
  });

  it("forgotPassword calls POST /auth/forgot-password", async () => {
    mockPost.mockResolvedValueOnce({ data: { message: "sent" } });
    await authService.forgotPassword("a@b.com");
    expect(mockPost).toHaveBeenCalledWith("/auth/forgot-password", { email: "a@b.com" });
  });

  it("resetPassword calls POST /auth/reset-password", async () => {
    mockPost.mockResolvedValueOnce({ data: { message: "ok" } });
    await authService.resetPassword("a@b.com", "123456", "newpass");
    expect(mockPost).toHaveBeenCalledWith("/auth/reset-password", {
      email: "a@b.com",
      code: "123456",
      newPassword: "newpass",
    });
  });

  it("verify2fa calls POST /auth/verify-2fa", async () => {
    mockPost.mockResolvedValueOnce({
      data: { accessToken: "at", refreshToken: "rt", user: { id: "1" } },
    });
    await authService.verify2fa("token", "123456");
    expect(mockPost).toHaveBeenCalledWith("/auth/verify-2fa", {
      temporaryToken: "token",
      code: "123456",
    });
  });

  it("googleAuth calls POST /auth/google", async () => {
    mockPost.mockResolvedValueOnce({
      data: { accessToken: "at", refreshToken: "rt", user: { id: "1" } },
    });
    await authService.googleAuth("gtoken");
    expect(mockPost).toHaveBeenCalledWith("/auth/google", { token: "gtoken" });
  });

  it("logout calls POST /auth/logout", async () => {
    mockPost.mockResolvedValueOnce({});
    await authService.logout();
    expect(mockPost).toHaveBeenCalledWith("/auth/logout");
  });
});
