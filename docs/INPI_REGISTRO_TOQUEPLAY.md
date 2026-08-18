# ToquePlay — Documento Técnico para Registro no INPI

**Documento de apoio ao registro do programa de computador (Lei 9.609/98) e análise de proteção intelectual (INPI — Instituto Nacional da Propriedade Industrial)**

- **Programa:** ToquePlay (frontend 1.0.0)
- **Data de elaboração:** 18/08/2026
- **Titular:** Gabriel Linck (preencher razão social/CPF/CNPJ)
- **Natureza do pedido sugerido:** Registro de Programa de Computador (e-Governança INPI, modalidade online)

---

## 0 · Nota estratégica — o que proteger e como

| Instrumento | O que protege | Aplicável ao ToquePlay | Custo/gabarito |
|---|---|---|---|
| **Registro de Programa de Computador** (Lei 9.609/98) | O **código-fonte** (e/ou objeto), como obra literária. Impede cópia do código. **Não protege a ideia.** | ✅ Recomendado — rápido (concessão em dias), online, taxa única | Baixo |
| **Patente de Invenção (PI)** | Invenção com novelty, atividade inventiva e **aplicação industrial com efeito técnico**. Software "per se" é expressamente excluído (LPI art. 10, IX) | ⚠️ Só viável se algum *método* do sistema tiver efeito técnico novo (ver §8). Alto risco de indeferimento | Alto |
| **Registro de Marca** (Lei 9.279/96) | Nome "TOQUEPLAY", logo, slogans — classes NCL 9 (software), 41 (organização de eventos esportivos), 42 (SaaS) | ✅ Recomendado — protege a identificação comercial, principal ativo contra "clones" | Médio |
| **Desenho Industrial** | Forma ornamental de objeto tridimensional | ❌ Não aplicável a GUI no Brasil na prática | — |
| **Sigilo + contratos** | A ideia em si (conceito de negócio) **não é protegida por nenhum registro** — protege-se por NDA, contrato de swap, acordo de confidencialidade com investidores/parceiros | ✅ Recomendado em paralelo | Nulo |

> **Realidade jurídica essencial:** nenhuma via no Brasil (nem no mundo, em regra) protege "a ideia do app". O registro de software protege o código; a marca protege o nome; a patente protegeria apenas um método técnico novo. A defesa prática contra cópia da ideia é: velocidade de execução, marca registrada, base de usuários e sigilo contratual.

---

## 1 · Identificação do programa

| Campo | Valor |
|---|---|
| Título | ToquePlay |
| Versão | 1.0.0 |
| Campo de aplicação | Gestão de torneios esportivos (vôlei), amistosos, times e arbitragem digital com placar em tempo real |
| Plataformas | Android e iOS (aplicativo móvel) + backend em nuvem |
| Linguagens | TypeScript (React Native / Expo), Node.js (NestJS) |
| Banco de dados | PostgreSQL + Redis |
| Comunicação em tempo real | WebSocket (Socket.IO) |
| Arquitetura | Cliente-servidor em camadas, API REST + gateway WebSocket, autenticação JWT com rotação de refresh tokens |

---

## 2 · Finalidade e problema técnico resolvido

O ToquePlay é uma plataforma digital completa para o ecossistema do vôlei amador que resolve, de forma integrada, problemas hoje tratados de forma fragmentada (grupos de WhatsApp, planilhas, papel):

1. **Organização de torneios sem ferramenta especializada** — criação de torneios com etapas múltiplas, categorias por formato (dupla, quarteto, sexteto) e geolocalização de sedes.
2. **Geração automática de chaveamentos** — eliminação simples, eliminação dupla, round-robin e fase de grupos + eliminatórias, a partir das inscrições confirmadas.
3. **Inscrição de times com controle de elegibilidade** — impede dupla inscrição de atleta, valida limites mínimo/máximo por categoria.
4. **Arbitragem digital sem árbitro dedicado** — qualquer pessoa autorizada insere um **código de árbitro** (6 caracteres, TTL limitado) e converte o próprio celular em mesa de arbitragem.
5. **Placar ao vivo com difusão em tempo real** — espectadores e participantes acompanham pontos, sets, timeouts e substituições via WebSocket, sem recarregar.
6. **Amistosos por desafio entre times** — busca de equipes por proximidade e/ou filtro, proposta de desafio, aceite e geração automática da partida.
7. **Conformidade com a LGPD nativa** — consentimento granular versionado, portal do titular, exportação de dados, anonimização de conta e canal DPO embutidos no produto.

---

## 3 · Arquitetura do sistema

```
┌──────────────────────────┐         ┌───────────────────────────────┐
│  App móvel (Expo/RN)     │  HTTPS  │  Backend (NestJS)             │
│  React Navigation        │ ──────▶ │  ├─ 108 endpoints REST        │
│  Zustand (estado)        │  WSS    │  ├─ Socket.IO Gateway (Redis) │
│  Axios + JWT interceptor │ ◀────── │  ├─ Prisma ORM                │
│  NativeWind design system│         │  ├─ PostgreSQL                │
└──────────────────────────┘         │  ├─ Redis (cache/lockout/rate)│
                                     │  └─ Mail Service (SMTP)       │
                                     └───────────────────────────────┘
```

**Módulos funcionais do backend:** auth (com 2FA TOTP), users, teams, team-invitations, tournaments, brackets, registrations, friendlies, matches (arbitragem), notifications, devices (FCM), privacy (LGPD), audit, admin.

**Frontend:** 12 domínios de telas (auth, splash, home, tournaments, registrations, teams, friendlies, matches, notifications, profile, privacy), design system próprio com 31 ícones e 19 componentes, temas claro/escuro.

---

## 4 · Descrição funcional completa (o que o sistema faz)

### 4.1 Autenticação e segurança
- Registro com verificação de e-mail por código de 6 dígitos (hash bcrypt, expiração 10 min, cooldown de reenvio 60 s).
- Login com bloqueio progressivo (5 falhas → 15 min; 10 → 1 h; 15 → 24 h, via Redis).
- 2FA TOTP (otplib) com códigos de reserva SHA-256 e token pendente de 5 min com nonce single-use.
- Sessão JWT: access token com `jti` revogável (blacklist Redis) + refresh token **rotativo com detecção de reuso** (reuso detectado → revogação de toda a família de tokens).
- Recuperação de senha por código (TTL 15 min, anti-enumeration de e-mail).
- Login social Google.

### 4.2 Torneios (máquina de estados)
Ciclo de vida completo: `DRAFT → PUBLISHED → REGISTRATION_OPEN → REGISTRATION_CLOSED → BRACKET_GENERATED → IN_PROGRESS → FINISHED | CANCELLED`.
- Wizard de criação em 4 passos: dados → estrutura (etapas com geocodificação automática ViaCEP/Nominatim, categorias com membros automáticos por formato) → capa/patrocinadores → publicação.
- Torneios de evento único (`SINGLE`) ou circuito (`CIRCUIT`) multi-etapa.
- Convite de árbitros por e-mail; geração de código de árbitro.
- Gerenciamento de inscrições: confirmação de pagamento manual, recusa, travamento automático pós-início.

### 4.3 Inscrições
- Wizard de 3 passos: categoria + time elegível → seleção de atletas (com convidados sem conta) → confirmação.
- Validações transacionais: limite min/máx por categoria, impedimento de atleta duplicado no torneio, deadline de inscrição.

### 4.4 Chaveamentos (brackets)
- 4 formatos: eliminação simples, eliminação dupla, round-robin (todos contra todos), grupos + eliminatórias.
- Geração transacional com validações (≥2 confirmados, janela temporal da etapa).
- Classificação calculada em tempo real; avanço automático de vencedores ao finalizar partidas.

### 4.5 Times
- Criação/edição com avatar, posição por atleta (levantador, ponteiro, oposto, central, líbero, ponta), número de camisa, capitania.
- Convites por e-mail (com aceite/recusa) e **membros convidados sem conta** (persistentes).
- Chat intra-time.

### 4.6 Amistosos
- Desafio direto entre times (busca por nome/cidade/estado), com data, horário, local e modalidade (praia/quadra).
- Aceite cria automaticamente a `Match` vinculada; recusa cancela.
- Chat inter-times após aceite.

### 4.7 Partida, arbitragem e placar ao vivo (núcleo diferencial)
- **Código de árbitro** de 6 caracteres gerado pelo organizador/capitão (TTL 24 h); qualquer usuário autorizado entra com o código e assume a mesa de arbitragem no próprio celular.
- Registro de pontos (±1), encerramento de set, finalização de partida, W.O., timeout com contagem regressiva sincronizada com timestamp do servidor, substituições e escalação por set com posições em quadra.
- **Regras automáticas**: Beach vôlei troca de lado a cada 11 pontos; sets e partidas finalizados automaticamente ao atingir pontuação de vitória.
- **Difusão em tempo real** via WebSocket: eventos `match:start`, `match:point`, `match:set-finish`, `match:finish`, `match:update` em salas por partida/torneio/amistoso, com adapter Redis para múltiplas instâncias.
- Espectadores acompanham sem login (partidas públicas); modo visitante do app permite descobrir torneios num raio de 1 km.

### 4.8 Notificações
- Push FCM + in-app, roteamento por tipo de evento (convite, amistoso, partida, inscrição, torneio).

### 4.9 Conformidade LGPD (diferencial de produto)
- Consentimento granular versionado (termos, push, localização, marketing) com registro append-only (IP, user-agent, versão).
- Gate de reconsentimento automático quando os termos mudam de versão.
- Portal do titular: exportação completa de dados (8 domínios, throttling 1/dia), exclusão/anonimização de conta mantendo integridade referencial, canal direto ao DPO com SLA de 15 dias (art. 19).

---

## 5 · Estrutura de telas (21 telas, 12 domínios)

| Domínio | Telas |
|---|---|
| Sistema | Splash, Consent Gate |
| Auth | Login, Registro, Verificação de E-mail, Recuperar Senha, 2FA |
| Home | Dashboard (usuário), Home Visitante |
| Torneios | Explorar, Detalhe, Criar (wizard), Meus Torneios, Gerenciar Inscrições, Chaveamento |
| Inscrições | Inscrição (3 passos), Minhas Inscrições |
| Times | Gerenciar, Detalhe, Criar, Convite |
| Amistosos | Criar, Meus, Detalhe |
| Partidas | Placar ao Vivo, Entrada de Código de Árbitro, Meus Árbitros |
| Outros | Perfil, Editar Perfil, Notificações, Privacidade/Consents, Export de Dados, Excluir Conta, Contato DPO |

---

## 6 · Dados técnicos para o formulário do INPI

- **Campo de aplicação (sugerido):** "Gestão esportiva — organização de torneios de vôlei, amistosos, times, arbitragem digital e placar em tempo real".
- **Linguagem de implementação:** TypeScript (100%).
- **Linhas de código (frontend, TypeScript):** ~8.535 (contagem `src/`, 18/08/2026; backend NestJS à parte).
- **Depósito:** o INPI aceita depósito parcial (até 20 páginas) ou integral do código em PDF. Recomenda-se depósito **parcial** — trechos representativos de cada módulo (auth, bracket, arbitragem) — mantendo o restante em sigilo.
- **Documentação a anexar:** este documento + prints das telas principais.

---

## 7 · O que NÃO é protegido (gestão de expectativas)

1. A **ideia** de "app de torneios de vôlei com arbitragem digital" — conceitos de negócio não são objeto de registro nem patente.
2. Telas/interface como tal (GUI não tem registro próprio no Brasil).
3. Funcionalidades isoladas (chaveamento, placar ao vivo, times) — existem anterioridades amplas.
4. Nome/livre uso da marca sem registro marcário — **registrar "TOQUEPLAY" na NCL 9/41/42 é a ação com melhor custo-benefício contra imitadores**.

---

## 8 · Elementos com potencial de patente (se optar por avaliar PI com advogado)

Apenas métodos com **efeito técnico** (não pura gestão de negócio) teriam chance, e mesmo assim exigiria busca de anterioridades:

1. **Protocolo de arbitragem por código efêmero multi-contexto** — um único fluxo de entrada de código resolve e autoriza em três contextos distintos (torneio, amistoso, partida avulsa) com resolução em cascata e validação de posse por `refereeId`/confirmação — combinado com TTL e single-room WebSocket.
2. **Rotação de refresh tokens com detecção de reuso e revogação de família** (técnico, porém com anterioridade conhecida em OAuth — provável indeferimento).
3. **Sincronização de placar com regras automáticas por modalidade** (troca de lado a 11 pontos no beach, auto-encerramento de set) via eventos idempotentes em salas WebSocket com adapter Redis multi-instância.

> Recomendação honesta: probabilidade de deferimento de PI é **baixa**; o valor real está no Registro de Programa de Computador + Marca + velocidade de mercado.

---

## 9 · Checklist de ação

- [ ] Contar linhas de código e preencher §6
- [ ] Gerar PDF do código (parcial — 3 módulos representativos)
- [ ] Registro de Programa de Computador no INPI (online, ~R$ 80-140 taxa; guia e- governance)
- [ ] Registro de marca "TOQUEPLAY" (NCL 9, 41, 42) — exige procuração/mandato se via advogado, mas pode ser direto
- [ ] NDA padrão para conversas com investidores/parceiros
- [ ] (Opcional) Consultar PIspecialista sobre §8

---

*Documento gerado a partir da análise do código-fonte (FLUXOS_APP.md, SDD_TRACKER.md, estrutura de telas e serviços). Contém know-how do sistema — tratar como confidencial.*
