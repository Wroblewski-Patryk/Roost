# Gotowość połączenia Roost z agentami

Decyzja kwalifikacyjna z 2026-09-22:
[Hermes Desktop, dwa profile i Ollama](hermes-desktop-ollama-profile-contract.md).
**Dwa istniejące runtime'y; współdzielenie odrzucone.** Repozytoryjny probe zwrócił
bezpieczną odmowę, a 45 porównywalnych plików pozostało bez zmian (8 pozycji
nieobecnych przed próbą). Izolacja fizyczna częściowo nakładających się widoków
Windows oraz bezpieczny start Desktopu pozostają nieudowodnione. Decyzja nie
zmienia poniższych bramek. Punkt 2: **BLOCKED przed utworzeniem profilu** — świeży
preflight potwierdził cztery wspólne pliki fizyczne oraz brak kwalifikowanej
izolacji updater/bootstrap/fallback. Nie utworzono profilu ani launchera; punkt 3
pozostaje niedopuszczony.
Punkt 2A: **BLOCKED po naprawie monitora i jednej nowej próbie**. `repository`
i `python` zakończyły się exit 0 oraz PASS postcondition. Przy przejściu do `venv`
monitor odrzucił wewnętrzny alias uv (`live_link`); natywnego wyniku/cleanup receipt
dla venv nie zachowano. `dependencies` nie ruszyło. Po kontroli tożsamości root,
celu aliasu, braku overlap i pasujących procesów domknięto lokalny rollback;
nie odtworzono brakującego natywnego dowodu. Managed/profil pozostały niezmienione.
Jedna mała prywatna diagnostyka została zachowana. Końcowy kod dopuszcza aliasy
wewnętrzne i zmiany plików podczas pracy, bez drugiej próby. To obserwacja ścieżek
i chroniony readback, nie sandbox wszystkich zapisów. Brak runtime/profilu;
punkt 2B niegotowy. Managed Roost admission bez zmian.

## Stały program syntetyczny — RF-RUNTIME-005B30

**PASS dla zamkniętej klasy syntetycznej**, 2026-09-17. Publiczne API i Worker
przeprowadzają rzeczywiste wykonanie `synthetic_fixed` / `roost-fixed-effect-v1`.
To nie jest dopuszczenie modelu, Hermes ani Direct. Sześć flag pozostaje false:
implementationReady, executionSupported, pilotReady, liveAdmissionAllowed,
pilotExecutionAuthorized, pilotExecutionStarted.

[Zamknięta semantyka](../operations/host-lifecycle-safety.md#fixed-synthetic-program-decision)
obejmuje mały [program](../../scripts/roost-fixed-effect.cs), który zapisuje
`ROOST-FIXED-EFFECT-V1` i znak nowej linii — dokładnie 22 bajty — przez jeden
odziedziczony uchwyt pliku w dokładnej fixture. Nie przyjmuje command, path, argv
ani input. Nie wykonuje sieci, odczytów ścieżek, shell/subprocess, jawnego dynamic
load lub kontroli hosta. Hash źródła, kompilatora, binarki i launchera oraz
fizyczna tożsamość instalacji są ponownie sprawdzane przed spawn. Ładowanie .NET
oraz token tego samego użytkownika pozostają zaakceptowanym ryzykiem; nie ma
sandboxa systemowego ani ochrony przed tym samym właścicielem komputera.

## Udowodniona ścieżka

API przyjmuje kontrakt z `executionClass: "roost-fixed-effect-v1"` przez zwykłe
scope/risk/procedure/Ready. Worker rejestruje dokładną deklarację z
[kontraktu programu](../../scripts/lib/agent-host-fixed-program.cjs), otrzymuje
normalny claim i aktualną lease oraz waliduje fizyczne repozytorium, Git i Ready.
Provider metadata nie jest grantem uruchomienia.

Po trwałym `spawn_intent` Worker zamraża oryginalne ownership B28 i Writer,
rezerwuje application lease oraz nieodnawialny spent record. Nie zmienia już
bajtów lokalnego checkpointu podczas natywnego wykonania. API nadal otrzymuje
heartbeat i wynik. Opaque grant wiąże zadanie, attempt 1, Ready, claim/lease,
repozytorium, fixture, program/runtime/instalację oraz deadline. Zawieszony Job
wznawia proces dopiero po trwałym resume receipt i skorelowanym ack.

Terminalny wynik obejmuje genuine Job receipt, zero aktywnych procesów,
ponowny odczyt dokładnych bajtów przez niezależny verifier, podpisany native
review oraz usunięcie fixture i application lease. Worker raportuje wynik
przez API; osobny reviewer wykonuje publiczne review rzeczywistego wyniku
po odświeżeniu dowodów ryzyka/procedury. Review nie oznacza release.
Worker zwalnia Writer po zakończeniu. Brak resume receipt daje zero bajtów,
zużytą próbę, terminalny błąd i cleanup. API odmawia retry, ponownego queue
tego zadania oraz wznowienia przerwanej próby.

Restart nie odtwarza grantu. Po awarii podczas cleanup kwalifikuje się wyłącznie
oryginalny podpisany [łańcuch B28](fixture-ownership-before-resume.md), z kontrolą
zakończenia właściciela i procesów. Lookup prywatnych ścieżek nie jest authority.
Brak kompletnego terminalnego dowodu zatrzymuje automatyczne sprzątanie i zachowuje
własność do uzgodnienia; nie pozwala uruchomić programu ponownie.

## Dowody i granice

- Publiczny API/PostgreSQL/Worker E2E: **3/3 PASS** (suite i dwa scenariusze),
  poprawny efekt i publiczne review oraz
  przerwana publikacja resume receipt z zerowym efektem; bez atrapy API/claim/Ready.
- Testy fixed authority: **6/6 PASS**, forgery, claim/attempt/token, expiry, source/config/argv,
  binary drift, replay, awaria po terminalnym review i oryginalny cleanup.
- 264 testy regresyjne: input/launch/packet/protocol/provider, Windows Job,
  pierwotny ownership, review i context stop; także timeout, utrata pipe,
  błędny ack, cross-attempt oraz crash kontrolera. Wszystkie PASS.
- Dodatkowo 23 testy host lifecycle i 4 testy projekcji API providera PASS;
  łącznie raporty wykonanych zestawów obejmują **300/300 PASS**.
- `npm run validate` i końcowy typecheck PASS; 725 lokalnych linków bez błędów,
  prywatność/budżety dokumentacji i `git diff --check` PASS. Domyślny kontekst:
  89 496 bajtów. Pozostają wcześniejsze ostrzeżenia Vite o zasobach i rozmiarze.

Test korzysta z unikalnej tymczasowej bazy w istniejącym kanonicznym PostgreSQL.
Nie tworzy instancji, kontenera, obrazu, wolumenu ani roli. Sprzątanie obejmuje
usunięcie bazy, porównanie logicznych skrótów istniejących baz i inventory zasobów
oraz przywrócenie wcześniejszego stanu uruchomienia kontenera. Nie restartuje
Docker Desktop/WSL. To nie jest globalny audyt innych procesów komputera.
Końcowy readback potwierdził brak tymczasowej bazy, identyczne logiczne skróty
dwóch istniejących baz, brak zmian inventory oraz przywrócone running states.
Kontener początkowo `created`, a po teście `exited`, pozostaje zatrzymany;
nie odtwarzano go w celu zmiany etykiety stanu. Własne procesy i katalogi testowe
usunięto; oryginalne dowody przerwanych przygotowań zachowano prywatnie.

Bez modelu/Hermes/Codex, produkcji, push/deploy, zmiany auth/private profile,
zamrożonej instalacji, ADR v14, execution authority v13 spent, native-risk v7,
registry/profile v5 i startup v2. Pełnej historycznej regresji B21–B28 oraz
Linux/macOS nie wykonywano. `design-qa.md` pozostaje poza zakresem.

**Dokładnie jedna następna luka: RF-HOST-035 — kwalifikowane dopuszczenie ochrony
host lifecycle dla rzeczywistego providera.** Syntetyczny dowód nie usuwa tej
bramki i nie upoważnia do kolejnej próby modelu ani automatycznej kontynuacji.
