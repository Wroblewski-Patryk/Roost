# Gotowość połączenia Roost z agentami

Aktualizacja v17, 2026-09-23:
[kontrakt biletu właściciela](server-owner-ticket-v1.md) — **source/validator DONE;
real issuer/transport/integration BLOCKED**. Wybrany wystawca to istniejący Roost
API/server; klucz prywatny ma pozostać wyłącznie tam. Lokalny plik publicznego
klucza jest tylko cache porównywanym ze świeżym materiałem serwera. Bilet do 60 s,
online consume/revocation do 5 s, bez offline fallbacku i odnowienia przez Workera.
Testy nie zastępują trwałego CAS ani uwierzytelnienia HTTPS. Sześć flag false;
39 retained roots nietkniętych. Jeden następny proponowany atom: implementacja
owner-only issue/atomic consume w istniejącym API z testowym signerem, bez sekretu
produkcyjnego, deployu i aktywacji.

Aktualizacja v16, 2026-09-23:
[kontrakt dwóch backendów managed Hermes](managed-hermes-backend-admission-v1.md)
— **source/synthetic DONE; real issuer/launch BLOCKED**. Codex Responses wymaga
jawnego modelu/reasoning i same-owner attestation; local Ollama wymaga dokładnego
endpointu/modelu/digestu oraz odrębnego managed receipt. Oba dodatnie przypadki
kończą się wyłącznie stałym fixture; drift, replay i niedostępność blokują próbę
bez fallbacku. Sześć flag false. Cleanup 39 dawnych katalogów test-state BLOCKED:
brak oryginalnego ownership rodziców, bez usuwania. Jeden następny proponowany
atom: źródłowy kontrakt bezpiecznego private-anchor provisioning/verification,
bez tworzenia kluczy, zmiany ACL ani real launch. Starsze propozycje poniżej
są historyczne.

Aktualizacja właściciela v15, 2026-09-23: **inwentaryzacja Codex DONE;
pierwotny atom powiązania pinu PARTIAL / architecture mismatch; real launch BLOCKED**.
[Dowód i bieżący kontrakt](codex-static-inventory-v1.md): zadania przechodzą
wyłącznie przez Windows Local Worker i managed Hermes. Codex OAuth/Responses
oraz local Ollama są backendami Hermesa, bez silent fallbacku. Lokalny pin CLI
nie jest wymaganą zależnością wybranego transportu. Direct Codex nie ma pilot
authority; podpisane decyzje direct i finalny dispatch są odrzucane.
Brak bezpiecznie zakwalifikowanego provisioning klucza/anchora pozostaje jawny.
Sześć flag nadal false. Jeden następny proponowany atom: źródłowy kontrakt
managed-Hermes admission rozróżniający oba backendy, bez routingu i real launch.
Poniższe wcześniejsze kolejności i następne kroki są historyczne.

Aktualizacja właściciela, 2026-09-23: **trusted-provider pilot — PARTIAL**.
[Akceptacja ryzyka i kontrakt](trusted-provider-pilot-v1.md) obejmują dokładnie
przypiętego Codexa oraz managed Hermes local bez wymogu pełnej izolacji OS.
Walidacja podpisanej prywatnej decyzji i dodatnie testy obu klas na stałym
programie syntetycznym są DONE. Realny start nadal jest zablokowany: Codex nie
ma kompletnego genuine pin/Job handoff, a Hermes local — managed model admission.
Nie zmienia to bramki budżetu, Ready/Writer, recovery i release. Sześć flag nadal
false; nie uruchomiono providera. Następny atom: powiązać jeden rzeczywisty pin
Codexa z istniejącą decyzją i Windows Job v2, z testami syntetycznymi i zachowaniem
pozostałych bramek. Dawna propozycja LPAC/brokera poniżej jest zastąpiona tą decyzją.

RF-HOST-035, 2026-09-23: **PARTIAL; kandydat LPAC — BLOCKED**.
[Kwalifikacja read-only](../operations/host-lifecycle-safety.md#lpac-read-only-qualification)
objęła osiem granic, Windows 11 Home 25H2, statyczny odczyt eksportów API,
trzy próbki DACL i stan aktywnych profili zapory. LPAC nie daje sam z siebie
zakresu jednego katalogu, bezpiecznego dostępu do OAuth ani listy dozwolonych
endpointów. Nie ma zakwalifikowanych uprawnień zasobów, kompatybilnego startu
providera ani wystawcy dowodu. Jeden checkout jest możliwy koncepcyjnie;
potrzebne byłyby jawne wyjątki dla runtime i ograniczony stan prywatny.
Powiązanie pre-spawn pozostaje DONE, z dowodem tylko dla stałego programu
syntetycznego. Sześć flag pozostaje false. Historyczna propozycja następnego atomu to
analiza źródłowa wykonalności podziału: executor narzędzi LPAC bez poświadczeń
i surowej sieci, istniejący Worker pośredniczący w ściśle dopuszczonych operacjach.
To propozycja do oceny, bez wdrożenia. Nie uruchomiono providera ani nie zmieniono
systemu lub prywatnych profili; profil manualny Hermes pozostaje osobną ścieżką.

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
Punkt 2A: **DONE po usunięciu obserwatorów plików i jednej nowej próbie**.
`repository`, `python`, `venv` i `dependencies`: exit 0, PASS postcondition oraz
natywne potwierdzenie zamknięcia procesów. Prywatny Hermes 0.21.3 / Python 3.11.16
przeszedł `--version`, kontrolę dokładnego commit/tree, pełny audyt izolacji oraz
RECORD (105 pakietów, 7521 wpisów). Managed/profil i wybrane ustawienia systemowe
pozostały niezmienione. Zapisano installation receipt; usunięto poprzednią
diagnostykę i tymczasowe logi/cache/tools. To audyt po instalacji, nie sandbox
wszystkich zapisów. Runtime jest gotowy jako wejście do osobnego punktu 2B;
profilu/launchera nie utworzono i Desktopu nie uruchomiono. Managed Roost admission
bez zmian. Wcześniejsze odmowy pozostają historią w powiązanym kontrakcie.

Punkt 2B: **DONE — prywatny profil `hermes-manual` i launcher manualnego CLI**.
Launcher jest związany z dokładnym runtime/receipt z 2A; profil ma pusty zestaw
narzędzi, brak fallbacków i zewnętrznych loginów oraz lokalny endpoint Ollama.
`gpt-oss:20b` ma stan **pending / not admitted**. Parser konfiguracji, `--version`
i offline `--check` przeszły bez zapytań do Ollamy i bez startu providera/czatu.
Runtime, managed i hermes-pilot pozostały niezmienione. Profil jest gotowy do
osobnego punktu 3; model nie został pobrany, a launcher interaktywny ani Desktop
nie zostały uruchomione. Żadna flaga gotowości agenta Roost nie zmienia wartości.

Punkt 3: **BLOCKED po jednym pull**. Preflight miejsca/magazynu przeszedł, lecz
częste komunikaty postępu Ollamy przekroczyły limit wyjścia kontrolera (exit 130,
`output_limit`). Zachowano wyłącznie częściowe dane w jednym magazynie; brak
zainstalowanego modelu i admission. Profil 2B pozostaje pending. Nie uruchomiono
smoke ani kolejnego pull. Własny serwer i proces pobierania zamknięto; managed,
hermes-pilot i runtime manualny bez zmian. Poprawiony filtr postępu przeszedł
test syntetyczny Windows Job; wznowienie wymaga osobnego atomu.

Osobno zatwierdzone wznowienie: **pobranie DONE, punkt 3 nadal BLOCKED na smoke**.
Dokładnie jedno wznowienie ukończyło `gpt-oss:20b` (13 793 441 244 B); lokalny
digest/manifest i rozmiary są zgodne. Po pobraniu pozostało 11,48 GiB wolnego.
Prywatny stan `admitted-for-manual-smoke` oraz offline launcher `--check` przeszły
kontrolę. Podczas jednej próby testu własny serwer Ollama zakończył pracę;
nie potwierdzono poprawnej odpowiedzi ani faktycznego podziału CPU/GPU. Dokładny
powód zakończenia serwera nie został zachowany, więc nie przypisujemy przyczyny.
Model pozostaje w jednym magazynie. Interaktywny launcher i managed admission
pozostają zamknięte; wszystkie flagi Roost bez zmian. Szczegóły i końcowe
potwierdzenie cleanup opisuje powiązany kontrakt.

Osobna [diagnoza load-only](hermes-desktop-ollama-profile-contract.md#post-smoke-load-only-diagnosis):
**przyczyna wcześniejszego zakończenia INCONCLUSIVE**. Jedno załadowanie modelu
zwróciło HTTP 200 po 20,127 s; serwer działał do jawnego zamknięcia. Minimalny
odczyt wolnego RAM wyniósł 447 MiB, a szczyt commit 98,25% limitu. To dowód
presji pamięci w tej próbie, nie potwierdzenie wcześniejszego OOM. Profil, model,
runtime i stan `manual-smoke-blocked` pozostały niezmienione; cleanup potwierdzony.
Kontroler zachowuje ograniczone logi i przeszedł trzy testy syntetyczne. Nie
powtórzono smoke Hermes. Punkt 3 i wszystkie flagi Roost nadal zablokowane.

Końcowy, osobno autoryzowany [manual smoke](hermes-desktop-ollama-profile-contract.md#final-manual-smoke-and-exact-model-admission):
**punkt 3 DONE, profil `manual-ready`** (2026-09-23). Preflight: 15,143 GiB RAM,
36,216 GiB zapasu commit i 11,097 GiB dysku. Jedno lokalne zapytanie Hermes
zwróciło poprawne krótkie potwierdzenie po 36,469 s; zero narzędzi/fallbacków,
context 2048, reasoning low, 25 output tokens. Dokładny digest został dopuszczony
wyłącznie do profilu ręcznego. Oba natywne Jobs: exit 0, cleanup i zero procesów;
model/runtime/protected roots bez zmian, końcowy launcher check PASS. Wcześniejsze
blokady są historią. To nie dopuszcza providera Roost: sześć flag nadal false,
Electron Desktop i integracja pozostają nieuruchomione.

Osobny [audyt podłączenia Desktop](hermes-desktop-ollama-profile-contract.md#desktop-hookup-audit),
2026-09-23: **DESKTOP BLOCKED**. Wersja 0.17.6 obsługuje osobny home i dane
Electron, ale wybór backendu dopuszcza inne instalacje/systemowy Python oraz
bootstrap; wskazany runtime może też zostać celem aktualizatora. Nie potwierdzono
trybu wymuszającego dokładny backend i wyłączającego te ścieżki. Profil CLI
pozostaje `manual-ready`; nie utworzono skrótu GUI i niczego nie uruchomiono.
Następny warunek: wspierany przez upstream ścisły tryb zewnętrznego backendu,
z odmową przy drift i zachowaniem polityki bez narzędzi/fallbacków. Nie zmienia
to RF-HOST-035 ani sześciu flag.

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
