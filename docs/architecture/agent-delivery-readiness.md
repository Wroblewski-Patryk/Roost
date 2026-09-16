# Gotowość połączenia Roost z agentami

## Syntetyczny dowód całego przepływu

**BLOCKED — publiczna ścieżka Workera nie dopuszcza jeszcze takiej próby.**
RF-RUNTIME-005B29, 2026-09-17. Sprawdzono istniejące granice, bez zmiany kodu
i kontraktów. Nie powstał pozytywny dowód Roost → Worker → handshake → wynik →
review. Testy osobnych składników nie są takim dowodem.

### Konkretny brak połączenia

- [Wspólny kontrakt providera](../../scripts/lib/agent-host-provider-contract.cjs)
  zwraca dla Hermes hermes_compatibility_unproven. [Worker](../../scripts/roost-codex-agent-host.mjs)
  sprawdza go przed recovery, Writerem i claim oraz przed startem.
  [RF-HOST-035](../operations/host-lifecycle-safety.md) utrzymuje dodatkowy wymóg
  izolacji kontroli hosta; Windows Job dowodzi życia procesu, nie tej izolacji.
- [Publiczne prepareProviderLaunch](../../scripts/lib/agent-host-provider-launch.mjs)
  odmawia hermes_public_launch_contract_unqualified nawet po poprawnej lokalnej
  kwalifikacji; command/args pozostają null. Poprawny receipt nie jest activation.
- [Helper syntetycznych prób](../../scripts/fixtures/hermes-launch.mjs) zużywa
  lokalną kwalifikację i wywołuje runHermesOwnedProcess bez publicznego
  prepareProviderLaunch. To świadomie ograniczony test komponentów, a nie
  adapter task/claim Workera. Nie można nazwać go dowodem pierwszego odcinka.
- Worker operuje na już zmapowanym repozytorium. Jego nativeBoundaryOptions
  przekazują Writer i expected, ale nie tworzą fixture ani nie przekazują
  fixtureOwnership/installationReceipt/fixtureInstallation. Te elementy
  [B28](fixture-ownership-before-resume.md) są połączone w kontrolerze smoke,
  nie w publicznym przepływie zadania. Ustawienie providerAdmissionForTest
  usuwa jedną odmowę w teście, lecz nie rozwiązuje tego połączenia.
- [API claim/complete](../../src/modules/agent-runtime/agent-runtime.routes.ts)
  oraz [niezależne review](task-review-workflow.md) mają własne granice.
  Podstawienie gotowego claimed lub lokalnego review nie dowodzi ich wykonania.
  Nie uruchomiono API z bazą i nie utworzono zadania Roost.

Wymagana przez B28 kolejność to **utworzenie fixture i pierwotnego dowodu przed
utrwaleniem Ready/runtime dla tej fixture**, następnie rzeczywisty zawieszony Job,
trwały resume receipt i potwierdzenie. Nie wolno przestawiać tych etapów tylko
dla zgodności z numeracją scenariusza testowego.

B28 nadal dowodzi syntetycznie blokady przed potwierdzeniem i cleanup po restarcie.
Nie ma jednak nowego procesu przypisanego do zadania Roost, wyniku/review/cleanup
całego przepływu ani integracyjnego wariantu braku acknowledgement. Twierdzenie
o ich sukcesie byłoby niezgodne z obserwacjami.

## Działa / brakuje / następny dowód

| Odcinek ścieżki | Działa | Brakuje | Następny dowód |
| --- | --- | --- | --- |
| Roost → Local Worker | Kontrakty task/Ready i API; rzeczywisty Worker odmawia niedopuszczonego claim/startu | Kontraktu dopuszczenia jednej stałej syntetycznej próby przez publiczne granice wraz z własnością fixture i przekazaniem wyniku do review | Zatwierdzenie opisanego poniżej jednego kontraktu; potem test przez te same granice |
| Local Worker → Hermes | Kontrole instalacji, budżetu, lease, Job; B28 ownership, pre-resume i cleanup po restarcie | Dowodu rzeczywistej instalacji i spełnienia niezależnych bramek publicznego launchu/izolacji hosta | Osobno dopuszczona próba po spełnieniu bramek; recheck instalacji musi zmieścić się w terminie |
| Hermes → Codex | Historyczny start w B21 | Akceptacji całej próby; model odpowiedzi quiet nieobserwowalny | Osobno zatwierdzona próba zachowująca nieobserwowalne pola |
| Zmiana → test | Historyczna naprawa i niezależny test B24 PASS | Czystego wyniku bieżącej próby | Oczekiwany diff, test PASS i cleanup jednego dopuszczonego przebiegu |
| Test → commit | Walidacja i ręcznie autoryzowane commity | Dowodu commitu agenta w granicach zadania | Commit związany z zaakceptowanym diff/test i authority |
| Commit → review/release | Kontrakty niezależnego review/release | Dowodu akceptacji i osobno dozwolonego release całej ścieżki | Review dokładnego commitu; później release z właściwą zgodą |

Wszystkie sześć flag pozostaje false: implementationReady, executionSupported,
pilotReady, liveAdmissionAllowed, pilotExecutionAuthorized, pilotExecutionStarted.
ADR kontrakt v14; historyczna authority wykonania v13 zużyta. Native-risk v7,
registry/profile v5 i startup v2 bez zmian.

**Dokładnie jeden następny krok:** zatwierdzić kontrakt jednorazowego dopuszczenia
stałej syntetycznej próby w istniejącej publicznej ścieżce API/Workera. Musi określać
niepodrabialną authority ograniczoną do znanego nieszkodliwego programu, powiązanie
task/Ready/fixture/instalacji, przejście przez zwykły claim i launch oraz terminalne
review i cleanup. Nie może przyjmować dowolnego executable, fałszywego Ready ani
usuwać odmowy dla rzeczywistych providerów lub pomijać RF-HOST-035. To brakujący
kontrakt pierwszego odcinka, nie zgoda na model lub autonomię.

Możliwości decyzji: przyjąć ten ograniczony kontrakt i uzyskać rzeczywisty dowód
integracji albo zachować obecny kontrakt i pozostawić dowód end-to-end BLOCKED.
Osobny helper daje test składników, więc nie jest trzecią drogą do tego samego celu.
Zgodnie z punktem 6 zlecenia nie zmieniono granicy dopuszczenia dla samego testu.

## Weryfikacja zakresu

Przeszło **39 testów Windows, 0 błędów, 0 pominięć i 0 anulowań**:
28 execution-provider oraz 11 launch-admission. Rzeczywisty proces Workera
z lokalnym atrapowym API nie przekroczył heartbeat do recovery/Writer/claim/spawn.
Drugi zestaw potwierdził odmowę publicznego launchu mimo pełnej lokalnej kwalifikacji
oraz działanie osobnego nieszkodliwego helpera, jego Job cleanup (0 aktywnych
procesów), anulowanie i shutdown. Teardown własnych katalogów i serwerów testowych
zakończył się bez błędu; nie wykonano globalnego audytu procesów lub dysku.

npm run validate PASS: lint 333 trasy/45 plików, typecheck i build serwera/web.
Pozostają wcześniejsze ostrzeżenia Vite o dwóch zasobach runtime i dużym pakiecie.
Kontrole 725 odnośników, prywatności dodanej treści, budżetów dokumentacji i
git diff --check: PASS. Domyślny kontekst: 89 278 bajtów.

Nie uruchomiono pozytywnego testu całego przepływu ani jego wariantu bez ack:
oba wymagają brakującego kontraktu. Nie ma nowego task/result/review w Roost.
Nie uruchomiono API/DB, modelu/providera sieciowego, zainstalowanego Python,
pełnej historycznej regresji B21–B28 ani Linux/macOS. Dowód B28 braku efektu
przed resume pozostaje wcześniejszym dowodem komponentu, nie nowym wynikiem B29.

Zakres obejmuje wyłącznie sześć dokumentów diagnozy/traceability/gotowości.
Bez zmian kodu, nowych harnessów, prywatnego stanu, auth/profile, zamrożonej
instalacji, historycznych dowodów, push/deploy, Docker/WSL i produkcji.
design-qa.md nie był odczytywany, zmieniany ani stage'owany.
