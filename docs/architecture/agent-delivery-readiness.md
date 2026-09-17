# Gotowość połączenia Roost z agentami

## Dopuszczenie stałego programu syntetycznego

**BLOCKED — wymagany test publicznego API nie ma dostępnej zatwierdzonej bazy.**
RF-RUNTIME-005B30, 2026-09-17. Właściciel zatwierdził osobną klasę stałego programu
oraz [dowód zamkniętej semantyki](../operations/host-lifecycle-safety.md#fixed-synthetic-program-decision).
Dla tej klasy nie jest wymagany sandbox: ryzyko tokena tego samego użytkownika
jest jawnie przyjęte. Nie dotyczy to Hermes, Direct ani dowolnego executable.

Decyzja obejmuje mały repo-owned kod o dokładnej source/build/content identity,
bez caller-supplied command/args/path/input i z jednym odziedziczonym uchwytem
ograniczonego efektu w dokładnej fixture. Kod nie może realizować sieci, odczytu
dowolnych ścieżek, shell/subprocess, dynamic load ani kontroli hosta.
Authority ma być jednorazowa i związana z task/attempt/Ready, claim, Writer/lease,
pierwotnym ownership, runtime/instalacją, Job, budżetem oraz review/cleanup.
Restart może odzyskiwać tylko cleanup. To zaakceptowane kryteria przyszłej
implementacji; nie istnieje jeszcze nowy typ wykonania, program ani jego grant.

### Blokada weryfikacji publicznej ścieżki

Publiczne API używa Prisma/PostgreSQL. Test nie może zastąpić prawdziwego claim,
Ready, spent i review atrapą API lub gotowym obiektem claimed. Zgoda na bazę
ogranicza się do unikalnej tymczasowej bazy wewnątrz już istniejącego kanonicznego
kontenera PostgreSQL, bez zmiany danych aplikacji i z przywróceniem jego stanu.
Nowa instancja, kontener, obraz, wolumen lub instalacja PostgreSQL są wykluczone.

Odczyt wersji Docker Engine zakończył się błędem połączenia: endpoint silnika
był niedostępny. Właściciel wskazał ten stan jako warunek zatrzymania.
Nie restartowano Docker Desktop/WSL. Nie ustalono tożsamości kontenera i nie
uzyskano mierzalnego inventory obrazów/wolumenów; nie wolno deklarować jego
weryfikacji. Nie wykonano żadnej mutacji Dockera, zapytania do bazy ani utworzenia
bazy testowej. Nie wdrożono częściowego dopuszczenia bez wymaganej kwalifikacji.

Poprzednia diagnoza B29 nadal opisuje kod: wspólne admission i publiczny launch
odmawiają realnym providerom, a ścieżka Workera nie przenosi jeszcze nowej fixture.
Zgoda na zamkniętą semantykę usuwa niejasność decyzji, nie zastępuje implementacji.
[B28](fixture-ownership-before-resume.md) pozostaje dowodem składników:
pierwotny zapis przy utworzeniu → Ready/runtime → zawieszony Job → trwały
resume receipt/ack → efekt. Nie ma nowego dodatniego E2E ani wariantu bez ack,
wyniku/review lub terminalnego cleanup całej ścieżki.

## Działa / brakuje / następny dowód

| Odcinek ścieżki | Działa | Brakuje | Następny dowód |
| --- | --- | --- | --- |
| Roost → Local Worker | Kontrakty API/task/Ready; bramki odmowy; zatwierdzona zamknięta semantyka stałego programu | Implementacji i pełnego syntetycznego E2E; wymagany dostęp do zatwierdzonej instancji testowej jest zablokowany niedostępnym Engine | Wznowienie tego samego E2E po udostępnieniu istniejącego kanonicznego PostgreSQL; bez atrapy publicznych granic |
| Local Worker → Hermes | B28 ownership, pre-resume i cleanup po restarcie | Dowodu rzeczywistej instalacji oraz publicznego launchu/izolacji hosta dla realnego providera | Osobno dopuszczona próba po spełnieniu jego bramek |
| Hermes → Codex | Historyczny start B21 | Akceptacji całej próby; model odpowiedzi quiet nieobserwowalny | Osobno zatwierdzona próba zachowująca nieobserwowalne pola |
| Zmiana → test | Historyczna naprawa i test B24 PASS | Czystego wyniku bieżącej próby | Diff, test PASS i cleanup jednego dopuszczonego przebiegu |
| Test → commit | Walidacja i autoryzowane commity | Dowodu commitu agenta w granicach zadania | Commit związany z diff/test i authority |
| Commit → review/release | Kontrakty niezależnego review/release | Dowodu akceptacji i osobno dozwolonego release całej ścieżki | Review dokładnego commitu; później release z właściwą zgodą |

Sześć flag pozostaje false: implementationReady, executionSupported, pilotReady,
liveAdmissionAllowed, pilotExecutionAuthorized, pilotExecutionStarted.
ADR kontrakt v14, execution authority v13 spent, native-risk v7,
registry/profile v5 i startup v2 pozostają bez zmian.

**Dokładnie jeden następny krok:** udostępnić istniejącą kanoniczną instancję
PostgreSQL do zatwierdzonej tymczasowej bazy testowej, aby wznowić ten sam brakujący
dowód Roost → Worker → handshake → wynik/review/cleanup. Nie jest to zgoda na
automatyczny restart hosta, nową instalację, model trial ani kolejny atom hardeningu.

## Weryfikacja zakresu

Bieżące testy: **51/51 PASS**, zero fail/skipped/cancelled: 28 execution-provider
i 23 lifecycle. Dowodzą zachowania obecnych odmów, nie nowego dopuszczenia.
Testy własnych procesów/serwerów/temp zakończyły teardown bez błędu; nie wykonano
globalnego audytu komputera. Nie utworzono nowego Job, fixture B28, application
lease, Writer, bariery ani bazy na potrzeby nowego przepływu.

npm run validate PASS: lint 333 trasy/45 plików, typecheck i build serwera/web.
Pozostają wcześniejsze ostrzeżenia Vite o dwóch zasobach runtime i dużym pakiecie.
Kontrole 723 lokalnych linków, prywatności, budżetów dokumentacji i staged diff:
PASS. Domyślny kontekst: 89 306 bajtów. Zmiana obejmuje wyłącznie dokumentację.

Nie uruchomiono nowego programu syntetycznego, API/DB E2E, wariantu bez ack,
testów nowej authority/tamper/replay, pełnej regresji B21–B28, modelu/Hermes/Codex,
installed Python, Linux/macOS ani produkcji. Bez push/deploy, zmian auth/profile,
zamrożonej instalacji i historycznych dowodów. design-qa.md nietknięty.
