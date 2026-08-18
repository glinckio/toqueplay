# ToquePlay v2 — SDD Tracker

Fonte de verdade do progresso de desenvolvimento. Atualizado a cada conclusão de tarefa.

---

## FASE 0 — Project Bootstrap
- [x] 0.1 Init Expo project + folder structure
- [x] 0.2 Configurar NativeWind v4 + tailwind.config.js com tokens
- [x] 0.3 Instalar e configurar fontes (Space Grotesk + Manrope)
- [x] 0.4 Configurar React Navigation (Auth, Main, Visitor, Root navigators)
- [x] 0.5 Configurar Zustand (authStore + themeStore)
- [x] 0.6 Configurar API client (axios + JWT interceptor + refresh)
- [x] 0.7 Configurar testes (jest-expo + RNTL)
- [x] 0.8 Criar SDD_TRACKER.md
- [x] 0.9 Criar types/enums espelhando backend
- [x] 0.10 Criar theme files (colors, typography, shadows, animations)

## FASE 1 — Design System
- [x] 1.1 Design Tokens validation (snapshot tests) — 14 testes
- [x] 1.2 ThemeProvider + useTheme hook + testes
- [x] 1.3 Button (primary, ghost, tertiary, danger, icon-button) — 6 testes
- [x] 1.4 Badge / Status Pill (9 status) — 11 testes
- [x] 1.5 Input (text, email, password com toggle) — 4 testes
- [x] 1.6 OTPInput (6 dígitos) — 3 testes
- [x] 1.7 Toggle Switch — 2 testes
- [x] 1.8 SegmentedTabs (animated pill)
- [x] 1.9 Card (standard, elevated) — 2 testes
- [x] 1.10 Banner / Alert (warning, error, info) — 3 testes
- [x] 1.11 Avatar (iniciais, sizes, captain gradient, image) — 4 testes
- [x] 1.12 ProgressBar (gradient, animated)
- [x] 1.13 BottomSheet (spring animation)
- [x] 1.14 InfoRow — 1 teste
- [x] 1.15 BackButton
- [x] 1.16 BottomTabBar (custom, 5 tabs + visitor mode)
- [x] 1.17 Icons (29 SVG inline icons, incl info-circle) — 30 testes
- [x] 1.18 SearchInput — 3 testes
- [x] 1.19 Barrel export (src/components/ui/index.ts)

## FASE 2 — Telas de Sistema (Splash, Auth, Consent)
- [x] 2.0 Auth API service layer (authService.ts) — 10 testes
- [x] 2.1 SplashScreen (t16a) — 2 testes
- [x] 2.2 Login (t3a) — 4 testes
- [x] 2.3 Registro (t3b) — 3 testes
- [x] 2.4 Verificação de Email (t17a) — 3 testes
- [x] 2.5 Recuperar Senha (t3c) — ForgotPassword 3 testes + ResetPassword 2 testes
- [x] 2.6 2FA Screen — 2 testes
- [x] 2.7 AuthNavigator wired (6 screens)
- [x] 2.8 Design system audit — 8 components fixed vs HTML spec
- [ ] 2.9 Consent Gate LGPD (t16b)

## FASE 3 — Home & Navegação Principal
- [x] 3.1 Home Dashboard (t2a) — 6 testes
- [x] 3.2 Visitante Home (t24a) — 7 testes
- [x] 3.3 Bottom Tab Navigation integrada (MainNavigator + VisitorNavigator + BottomTabBar)

## FASE 4 — Torneios
- [x] 4.1 Explorar Torneios (t12a) — 6 testes
- [x] 4.2 Detalhe do Torneio (t9a) — 8 testes
- [x] 4.3 Criar Torneio Wizard (t5a) — 4 steps + success — 7 testes
- [x] 4.4 Meus Torneios (t18a) — 5 testes
- [x] 4.5 Gerenciar Inscrições (t19a) — 6 testes
- [x] 4.6 Chaveamento / Bracket (t10a) — 6 testes
- [x] 4.7 Navigation wired (ExploreScreen → MainNavigator + VisitorNavigator)
- [x] 4.8 Barrel export (screens/tournaments/index.ts)
- [x] 4.9 Icons added (sliders, share) — 31 total

## FASE 5 — Inscrições
- [x] 5.0 registrationsService (listMine, findOne, cancel, registerTeam, getRegisteredMembers) — espelha backend
- [x] 5.1 Inscrição em Torneio (t7a) — 3 steps: categoria+time → atletas+capitão → sucesso — 12 testes
- [x] 5.2 Minhas Inscrições (t21a) — 4 status pills (PAGO/PENDENTE/RECUSADA/CANCELADA) — 7 testes
- [x] 5.3 Navigation wired (TournamentDetail → Registration → MyRegistrations, RootNavigator)

## FASE 6 — Times
- [ ] 6.1 Gerenciar Times (t14a)
- [ ] 6.2 Convite de Time (t22a/b)

## FASE 7 — Partidas & Arbitragem
- [ ] 7.1 Arbitragem (t8a) — código + pré-jogo + placar ao vivo
- [ ] 7.2 Fim de Partida (t11a)

## FASE 8 — Amistosos
- [ ] 8.1 Criar Amistoso (t20a)
- [ ] 8.2 Meus Amistosos (t20b)
- [ ] 8.3 Detalhe Amistoso (t20c)

## FASE 9 — Perfil & Secundários
- [ ] 9.1 Perfil / Editar (t13a)
- [ ] 9.2 Notificações (t15a)
- [ ] 9.3 Privacidade & LGPD (t23a)
