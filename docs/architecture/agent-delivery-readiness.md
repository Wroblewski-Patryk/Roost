# Gotowość połączenia Roost z agentami

## Trwały dowód własności katalogu roboczego

**BLOCKED — potrzebna zmiana kontraktu startu, nie kolejna próba modelu.**
Analiza źródeł z 2026-09-17 (RF-RUNTIME-005B27) potwierdza brak trwałego,
pierwotnego dowodu własności fixture. Nie wprowadzono poprawki runtime ani nowego
mechanizmu recovery. [Zamknięte sprzątanie B21](hermes-b26-adopted-recovery-v1.md)
pozostaje zakończone; jego dowody i historyczne wyniki nie zostały zmienione.

Przyczyna luki jest konkretna: [tworzenie katalogu](../../scripts/lib/agent-host-native-footprint.mjs)
zapisuje marker, ale obiekt uprawnienia i jego powiązania przechowuje wyłącznie
w procesowym `WeakMap`. Po restarcie sam marker nie dowodzi pierwotnej własności.
[Kontroler próby](../../scripts/lib/agent-host-hermes-coding-smoke.mjs) nie przekazuje
własności nadrzędnej fixture do trwałego review. To wyjaśnia brak dowodu potrzebnego
do późniejszego cleanup; nie wyjaśnia pochodzenia ośmiu dodatkowych obiektów B21.

Wymaganie pełnego powiązania już przy utworzeniu koliduje z obecną kolejnością:

1. Kontroler zdobywa Writer i tworzy fixture, jej repozytorium oraz baseline.
2. Dopiero później weryfikuje instalację i przygotowuje Ready dla tego baseline.
3. [Granica narzędzi](../../scripts/lib/agent-host-hermes-native-boundary.mjs)
   tworzy application lease, a następnie [review](../../scripts/lib/agent-host-native-review.mjs)
   z własnym kluczem integralności. Ten klucz nie istnieje przy tworzeniu fixture.
4. [Launcher Windows](../../scripts/roost-windows-job.cs) tworzy rzeczywisty Job
   i zawieszony proces, wysyła `assigned`, po czym natychmiast wykonuje
   `ResumeThread`. Nie czeka na potwierdzenie trwałego zapisu przez kontroler.
   [Odbiorca zdarzenia](../../scripts/lib/agent-host-windows-job.mjs) może więc
   otrzymać `assigned`, gdy proces już działa. Sam callback nie zapewni bariery.

Dodatkowo [zwykła rekoncyliacja](../../scripts/lib/agent-host-native-reconciliation.mjs)
obejmuje lease i Writer. Nie odtwarza pierwotnego uprawnienia do fixture po restarcie.
Dodanie pola JSON do review lub serializacja pustego obiektu uprawnienia nie
rozwiąże ani tej luki, ani wymaganej kolejności przed dopuszczeniem zapisu providera.

### Jedna potrzebna decyzja

Zatwierdzić zmianę kontraktu cyklu życia fixture na **pierwotny zapis przy
utworzeniu oraz obowiązkowe, trwałe powiązanie przed wznowieniem procesu**.
Oznacza to jeden łańcuch dowodowy: utworzenie → związanie Ready, lease i runtime →
związanie rzeczywistego Job, gdy proces pozostaje zawieszony → potwierdzenie
kontrolera → wznowienie. Brak, błąd lub timeout potwierdzenia musi zakończyć Job
bez uruchomienia kodu providera. Należy też jawnie dopuścić odtworzenie wyłącznie
uprawnienia do cleanup z tego oryginalnego łańcucha w zwykłej rekoncyliacji.

To zmiana protokołu startu i granicy dowodowej review, wykraczająca poza zapis
receipt w istniejącym helperze. Punkt 13 zlecenia wymaga zatrzymania na tej granicy.
Propozycja nie zmienia kontraktu ani nie udziela zgody na launch. Nie wolno
wstecznie dopisywać brakujących etapów, zastępować rzeczywistego Job planowanym
identyfikatorem ani wznawiać wykonania po restarcie na podstawie dowodu cleanup.

## Działa / brakuje / następny dowód

Tabela rozróżnia obecną implementację, historyczne obserwacje i brakujący dowód.
Nie jest listą automatycznie zatwierdzonych prac ani zgodą na uruchomienie agentów.

| Odcinek ścieżki | Działa | Brakuje | Następny dowód |
| --- | --- | --- | --- |
| Roost → Local Worker | Kontrakty task/Ready, kontekstu i pojedynczego Writera; ścieżka nadzorowana | Zatwierdzonego uruchomienia całej bieżącej ścieżki z zadania Roost | Jedno późniejsze, osobno dopuszczone zadanie z pełnym powiązaniem Ready i wyniku |
| Local Worker → Hermes | Kontrole instalacji, środowiska, budżetu, lease i Windows Job | Trwałej własności fixture oraz bariery zapisu dowodu przed `ResumeThread` | Po decyzji powyżej: testy przerwań potwierdzające brak wykonania przed trwałym dowodem i zwykły cleanup po restarcie |
| Hermes → Codex | Historycznie jeden start providera w B21; zadany model i reasoning | Akceptacji całej próby; tożsamość modelu odpowiedzi w quiet pozostaje nieobserwowalna | Osobno zatwierdzona próba spełniająca aktualny kontrakt i jawnie zachowująca nieobserwowalne pola |
| Zmiana → test | W B21 dokładna naprawa; późniejszy niezależny test B24 PASS | Czystego wyniku bieżącej próby bez niewyjaśnionych dodatkowych zmian | Ten sam dopuszczony przebieg: oczekiwany diff, niezmieniony test PASS i poprawny cleanup |
| Test → commit | Lokalna walidacja i ręcznie autoryzowane commity | Dowodu commitu agenta w granicach konkretnego zadania | Commit związany z zaakceptowanym diff/test i osobną authority zadania |
| Commit → review/release | Kontrakty review i release oraz negatywne bramki | Dowodu niezależnej akceptacji i osobno dozwolonego release całej ścieżki | Review dokładnego commitu; dopiero potem release z właściwą zgodą |

Wszystkie sześć flag pozostaje `false`: `implementationReady`,
`executionSupported`, `pilotReady`, `liveAdmissionAllowed`,
`pilotExecutionAuthorized`, `pilotExecutionStarted`. Wersje ADR execution v13,
native-risk v7, registry/profile v5 i startup v2 pozostają bez zmian.

**Dokładnie jeden następny krok:** decyzja o opisanej wyżej zmianie kontraktu.
Usuwa ona nazwany bloker odcinka Local Worker → Hermes; nie proponuje nowej
próby modelu, wyjątku legacy ani dodatkowej warstwy ogólnego hardeningu.

## Weryfikacja zakresu

Zmiana obejmuje tylko sześć dokumentów diagnozy, gotowości i brakującej decyzji.
Nowego receipt ani jego testów nie zaimplementowano; regresja dotychczasowego
kodu nie stanowi kwalifikacji proponowanej poprawki.

Przeszły **32 testy Windows, 0 błędów i 0 pominięć**: 21 review/reconciliation,
4 historycznego kontraktu B21 i 7 coding-smoke. Testy uruchamiają własne
syntetyczne zasoby i nieszkodliwe procesy Node/Job; nie uruchamiają providera.
`npm run validate` zakończyło się poprawnie: lint (333 trasy, 45 plików),
typecheck oraz build serwera i web. Pozostają wcześniejsze ostrzeżenia Vite
o dwóch zasobach rozwiązywanych w runtime i dużym pakiecie wynikowym.

Przeszły kontrole 725 lokalnych odnośników, prywatności dodanej treści i
`git diff --check`. Kontekst domyślny ma 89 144 bajty, a trzy pliki aktywnego
planowania mieszczą się w budżetach. Nie zmieniono kodu, prywatnego stanu,
auth/profile, instalacji, danych produkcyjnych ani historycznych dowodów.
`design-qa.md` nie był czytany, zmieniany ani stage'owany.

Nie uruchomiono nowego modelu/Hermes/Codex ani realnej fixture providera,
zainstalowanego Python, testów API/DB/integracji/produkcji, Docker/WSL ani
Linux/macOS. Nie powtarzano B22–B26, bo ich kod i kontrakty nie zostały zmienione.
Nie wykonano push/deploy. Jeden lokalny commit i raport BLOCKED zamykają analizę;
nie ma podstaw, by twierdzić, że luka własności nie powtórzy się przed poprawką.
