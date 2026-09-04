# ToquePlay — Design DNA & Redesign Handoff

This document is the single source of truth for the visual redesign of the ToquePlay
app (a Brazilian beach‑volleyball tournament / friendly‑match platform). Read it
**before touching any screen**. It captures the aesthetic, the rules, the reusable
building blocks, what's already migrated, and what's left. Follow it so the app stays
one coherent system instead of "a screen an LLM threw together".

> The app UI text is **Brazilian Portuguese (pt‑BR)**. This doc is English for the
> engineer; user‑facing strings stay pt‑BR.

---

## 0. Stack & hard rules

- **Frontend:** Expo (SDK 57) + React Native + NativeWind (Tailwind) + Zustand + React Navigation. Dir: `frontend/`.
- **Backend:** NestJS + Prisma + PostgreSQL. Dir: `backend/`. **Do NOT change backend business logic.** Response‑shaping/seed data is OK when the user asks; core logic is not.
- **Golden rule of redesign:** change **presentation only**. Never alter state, handlers, API calls, validation, or navigation targets when restyling a screen. Preserve every `useState`, `useEffect`, service call, and route.
- **Typecheck after every screen:** `npx tsc --noEmit -p tsconfig.json` (run from `frontend/`). ~9 pre‑existing errors live in test files + `TournamentRegistrationScreen` + `AthleteProfileScreen` history — don't count those; only your touched files must be clean.
- **Repaint ≠ redesign.** The #1 lesson this project taught: swapping colors/fonts on the old layout is not enough. Bring the **structure** of the reference (photo dominance, oversized type, signature motifs), not just paint.

---

## 1. The reference — "Widelab sport app DNA"

The client fell in love with a **football training app (by Widelab)**: pure‑black
screens, one vivid accent color, **condensed all‑caps display type**, athlete
**photo cutouts with giant type behind the subject**, **notched (ticket/stadium)
cards**, **huge numbers**, circular medallion badges, a bottom tab bar with a filled
center circle, and a confetti "WELL DONE" celebration. Editorial, sporty, premium,
high‑contrast.

We **translate that structure** to ToquePlay's brand colors (purple + lime), keeping
black backgrounds. Reference apps to look at for tone: Onefootball, Nike Training,
Gymshark, Copa90, DAZN, Strava.

---

## 2. Color system — "Split" (LOCKED)

Black canvas. **Purple = primary. Lime = accent.** (Decided with the client.)

| Token | Hex | Use |
|---|---|---|
| `bg` | `#000000` | screen background (pure black) |
| `card` | `#16181C` | cards, inputs, surfaces |
| `cardBorder` | `rgba(255,255,255,0.07)` | hairline borders |
| `purple` (PRIMARY) | `#7C3AED` | all primary CTAs/buttons, feature‑panel fills, hero wash, active states in some contexts |
| `purpleDeep` | `#2D1B69` | medallion/hero gradient base, team‑A initials bg |
| `lime` (ACCENT) | `#C6F82A` | numbers, links, input focus, checkboxes, highlights, headline accent word, active tab dot |
| `limeInk` | `#12100A` | text/icons ON lime |
| `tx` | `#FFFFFF` | primary text (and text on purple — never lime‑ink on purple) |
| `tx2` | `#9A94A8` | secondary text |
| `tx3` | `#6E6684` | tertiary/muted |
| `danger` | `#FF4D5E` | destructive / live‑red |

Rules:
- **Primary buttons are purple with white text.** Lime is never a primary button fill (it's an accent).
- Lime is for: big stat numbers, the leading team's score, links ("Cadastre‑se"), input focus border, checkboxes, headline accent word, "AO VIVO" pill, active pips.
- The **app is dark‑only.** When converting a theme‑driven screen, set `const isDark = true;` (remove `useTheme`) so all `isDark ? dark : light` branches take the dark path, then override the palette consts to the DNA values above.

---

## 3. Typography

Wired in `frontend/App.tsx` via `useFonts` from `@expo-google-fonts/*`.

- **Anton** (`Anton_400Regular`) — display. Headlines, screen titles, **huge numbers** (scores, stats, countdowns), team names in heros. Always `textTransform: "uppercase"`, `letterSpacing: ~0.3–0.5`.
- **Oswald** (`Oswald_500Medium / 600SemiBold / 700Bold`) — labels, overlines, button text, pills, meta. Uppercase, tracked (`letterSpacing: 0.6–1.6`).
- **Manrope** (`Manrope_400/500/600/700/800`) — body copy, descriptions, names in lists, input values.
- **SpaceGrotesk** — **legacy**, being phased out. If you see it on a screen you're touching, replace headline uses with Anton and label/button uses with Oswald. Body can become Manrope.

Typical scale: hero title Anton 30–52; section header Anton 17–24; big number Anton 30–130; overline/label Oswald 10–12; body Manrope 12.5–14.

---

## 4. Signature motifs (use these to make a screen feel "ToquePlay")

1. **Framed tilted photo** — the hero motif. A photo/avatar in a rounded rect with a **lime border (2–2.5px)** and a slight rotation (`transform: [{ rotate: "-4deg" }]`, alternate sign per index). Used big in heros, small as list thumbnails, and in empty states. Helper: `FramedThumb` in the tournament kit.
2. **Notched CTA** — the signature button. Purple, full‑width, with two **background‑colored circles** on the left/right mid‑edges (ticket/stadium notch) + a right arrow. Helper: `NotchedButton` in `_authKit`. Pattern:
   ```tsx
   <Pressable style={{ position: "relative" }}>
     <View style={{ backgroundColor: purple, borderRadius: 16, paddingVertical: 17, flexDirection: "row", justifyContent: "center", gap: 9 }}>
       <Text style={{ color: "#fff", fontFamily: "Oswald_700Bold", letterSpacing: 1.4, textTransform: "uppercase" }}>...</Text>
       {/* arrow svg */}
     </View>
     <View style={{ position: "absolute", left: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: bg }} />
     <View style={{ position: "absolute", right: -9, top: "50%", marginTop: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: bg }} />
   </Pressable>
   ```
3. **Full‑bleed photo hero + ghost wordmark** — auth/profile/detail heros: portrait photo bleeds ~40–56% of screen, purple wash gradient over it fading to black, a giant faint `TOQUEPLAY` (or first name) in Anton behind the subject, then a giant Anton headline at the photo/black seam with **one word in lime**.
4. **VS composition** — two team medallions left/right, big `VS` (or the sets score) in the center. Used in friendly hero, bracket match cards, and the referee scoreboard. Winner side gets a lime border + lime number.
5. **Big Anton numbers** — scores, stats, countdowns. Leader/winner in lime, other in white.
6. **Circular medallions** — icon chips as circles (round), color‑tinted bg + faint ring. Used for stats, list icons, notification types, referee whistle.
7. **Purple‑feature stat card with notch** — in a row of stat tiles, make one purple with the side‑notch treatment for emphasis (e.g. "Vitórias" / "Vagas").
8. **Section header with lime accent bar** — a 3–4px lime vertical bar before an Oswald/Anton section label.

---

## 5. Component patterns & shared kits

Reusable kits already exist — **use them, extend them, don't reinvent**:

- `frontend/src/screens/auth/_authKit.tsx` — `AC` (auth palette = same DNA), `Field` (dark input, lime focus, Oswald label), `NotchedButton` (purple CTA), `PrimaryButton` (purple), `GhostButton`, `AuthHero` (full‑bleed photo hero with ghost wordmark + accent‑word title).
- `frontend/src/screens/tournaments/_tournamentKit.tsx` — `TC` (palette), `StatusPill` (tones: open=lime, progress=solid‑purple, closed=grey, neutral=purple‑tint, live=lime‑solid), `FramedThumb` (framed tilted thumbnail w/ volleyball fallback), `Chip` (purple‑when‑active filter chip), `SectionLabel`, `ScreenTitle` (overline + Anton title), `VolleyballIcon`, `MetaItem`.
- `frontend/src/components/ui/Skeleton.tsx` — subtle opacity‑pulse loading block (`#191B21`). Every screen's loading state should use skeletons that mirror the real layout, not a spinner.
- `frontend/src/components/navigation/BottomTabBar.tsx` — icon‑only bar, active tab = filled **purple** rounded square, central "Criar" = **lime circle** (elevated). No text labels.

Card/input conventions:
- Cards: `bg #16181C`, `border rgba(255,255,255,0.07)`, `borderRadius 16–20`, no drop shadows on black.
- Inputs: `bg #16181C`, `borderWidth 1.5`, focus border = lime, value = Manrope white, label = Oswald overline `#9A94A8`.
- Selection (chips/segments): active = purple fill + white text; inactive = dark card + `tx2`. Oswald uppercase.
- Empty states: framed‑tilt motif + lime icon chip + a short Anton title + a purple CTA. Never a bare grey sentence.
- Fixed CTAs: the client prefers CTAs at the **end of the scroll content**, NOT pinned/`position:absolute` at the bottom. (Applied to tournament‑detail and the bracket flow.)

---

## 6. Error handling (done — keep using)

- `frontend/src/services/errorMessages.ts` maps backend error `code`s → friendly pt‑BR messages (tournaments, brackets, registrations, friendlies, matches, teams, auth).
- `getErrorMessage(err, fallback)` in `frontend/src/services/api.ts` prefers the mapped message for `data.code` and **ignores generic strings** ("Bad Request Exception", "Unauthorized", …). Every `Alert.alert("Erro", getErrorMessage(err, "…"))` already benefits. When you find a new code, add it to the map.

---

## 7. Referee scoring console — landscape

- Uses `expo-screen-orientation`. `app.json` `orientation` is `"default"`; `App.tsx` locks `PORTRAIT_UP` globally on mount; `RefereeScreen` locks `LANDSCAPE` when `step === "live"` and back to `PORTRAIT_UP` otherwise + on unmount.
- Layout: two **full‑height tap zones** (tap anywhere on a team's half = +1 point), Anton score ~130px (team A lime, team B white), serve pill, `Toque para +1` hint. A center control column (width ~200): AO VIVO pill, `SET N`, big sets tally (Anton in rounded chips, "×" between), and big **Desfazer / Saque / Timeout** buttons. Back arrow is an absolute button in the top‑left corner. StatusBar hidden.
- Wired actions: point A/B, undo, toggle serve, timeout (asks which team → `registerTimeout`), history (Alert of set‑by‑set). No card endpoint exists on the backend, so there is **no "Cartão" button**.
- The other referee steps (code entry, match selection, pre‑game, set‑end) are **portrait**, dark DNA. Pre‑game derives real data client‑side: tournament name (fetched via `tournamentsService.findOne`), modality from `match.bracket.category.modality`, format from `bestOfSets` ("Melhor de N") — because the match payload does NOT include flat `tournamentName/category/format`.

---

## 8. Dev toggles & local config

- `frontend/App.tsx`: `DESIGN_LAB` (renders a throwaway `src/screens/_designlab/DesignLabScreen.tsx` for previewing DNA) and `FORCE_AUTH` (forces the auth navigator even when logged in, to review auth screens). **Both must be `false` before committing.**
- API base URL: `frontend/src/services/api.ts` reads `EXPO_PUBLIC_API_URL` from `frontend/.env.local` (gitignored) and falls back to a hardcoded LAN IP. When the PC IP changes, update `.env.local` and restart Metro **with cache clear** (`npm run start --prefix frontend -- -c`) — `EXPO_PUBLIC_*` is inlined at bundle time.
- Backend seed (`backend/prisma/seed.ts`) creates: admin, 24 athletes, 12 teams, one tournament ("Copa Ilha de Verão"), notifications of every real type for `atleta01`, friendlies (sent+received) for `atleta01`, and a **dedicated referee** `arbitro@seed.toqueplay.com` invited to the tournament. Password for everyone: `123456`. Run `npm run db:reset --prefix backend` for a clean state.

---

## 9. Migration status

**Done (dark DNA, logic preserved):**
Auth (`LoginScreen`, `RegisterScreen`, `ForgotPasswordScreen`) · `HomeScreen` (+ reusable `Skeleton`) · `ProfileScreen` · `AthleteProfileScreen` · `BottomTabBar` · `NotificationsScreen` (type→icon resolver covers all backend types) · `MyFriendliesScreen` · `FriendlyDetailScreen` (VS hero, map link) · `CreateFriendlyScreen` (VS duel picker) · `ExploreScreen` · `TournamentDetailScreen` (countdown, stat strip, occupancy, generate‑referee‑code button, clickable location→Google Maps) · `CreateTournamentScreen` (4‑step wizard, semifinal/final sets, referees‑at‑creation) · `BracketScreen` (grouped by phase, champion banner, VS cards) · `BracketRevealScreen` (immersive staggered reveal) · `GenerateBracketScreen` (per‑format schematic previews + animated expand) · `RefereeScreen` (all steps + landscape console) · `ConsentGateScreen` (terms modal).

**Not yet migrated (audit & convert):** anything still importing `useTheme` or using SpaceGrotesk/light values. Known candidates: `MyTournamentsScreen`, `ManageRegistrationsScreen`, `TournamentRegistrationScreen`, `MatchResultScreen`, team screens (`ManageTeams`, `CreateTeam`, `TeamDetail`, `TeamInvite`), `MyRegistrationsScreen`, `PrivacyScreen`, secondary auth (`VerifyEmail`, `TwoFactor`, `ResetPassword`), `VisitorHomeScreen`, `SplashScreen`. Verify with `grep -rl "useTheme\|SpaceGrotesk" frontend/src/screens`.

---

## 10. Workflow to continue (do this per screen)

1. Read the screen fully. Note every handler, state, service call, navigation target.
2. If it's theme‑driven: `const isDark = true;`, drop `useTheme`, rewrite the palette consts to the DNA values (§2).
3. Restyle to DNA: black bg; Anton headlines; Oswald labels/buttons; purple primary CTAs (prefer `NotchedButton`); lime accents; cards `#16181C`; framed‑tilt motif where a photo/avatar appears; VS layout for match‑ups; big Anton numbers; skeleton loading; DNA empty states; CTAs at end of scroll (not fixed).
4. Reuse the kits (`_authKit`, `_tournamentKit`, `Skeleton`, `StatusPill`, `NotchedButton`, `FramedThumb`).
5. Preserve ALL logic. Surface real backend data; if a payload lacks a field, derive it client‑side or fetch it — don't show mock/placeholder.
6. `npx tsc --noEmit` — your file must be clean.
7. Ask the client to reload and review; iterate. The client cares a lot about it not feeling "generic/thrown together" — add specificity (real stats, schematics, motifs, tasteful animation) rather than filler.

**Tone the client responds to:** immersive but restrained. One graphic element per view, tasteful entrance animations (Animated fade+slide, spring, `LayoutAnimation`), and real content. Avoid weird glows/mesh behind cards (they asked to remove those). When in doubt, look at the Widelab reference and ask "does this feel editorial and sporty, or does it feel like a default form?"
