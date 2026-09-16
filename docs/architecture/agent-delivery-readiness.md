# Gotowość połączenia Roost z agentami

## Trwały dowód własności katalogu roboczego

RF-RUNTIME-005B28, 2026-09-17: zaimplementowano zatwierdzoną zmianę kontraktu
[własności przed wznowieniem](fixture-ownership-before-resume.md).
Diagnoza B27 wykazała brak trwałego dowodu i bariery przed ResumeThread;
jej status BLOCKED dotyczył ówczesnego zakresu, przed zgodą na zmianę protokołu.
Obecna kwalifikacja obejmuje kod i syntetyczne zasoby Windows. Nie oznacza
gotowości całej ścieżki ani zgody na uruchomienie modelu.

Pierwotny podpisany zapis powstaje przy tworzeniu nowej fixture. Następnie
kontroler utrwala Ready, lease, instalację i runtime. Rzeczywisty proces jest
tworzony we właściwym Job jako zawieszony; dopiero zapis jego powiązań i zgodne
potwierdzenie przez istniejące stdin dopuszczają wznowienie. Brak potwierdzenia,
błąd lub timeout kończą Job bez wykonania kodu providera. Zwykła rekoncyliacja
może po restarcie odzyskać wyłącznie uprawnienie do sprzątania z oryginalnego
łańcucha. Nie przyjmuje starych katalogów i nie dopisuje brakującej historii.

[Zamknięte sprzątanie B21](hermes-b26-adopted-recovery-v1.md) oraz dowody B21–B26
pozostają historyczne. B28 nie wyjaśnia dodatkowych obiektów B21 i nie zmienia
akceptacji tamtej próby.

## Działa / brakuje / następny dowód

Tabela nie jest automatyczną zgodą na kolejne prace lub uruchomienia.

| Odcinek ścieżki | Działa | Brakuje | Następny dowód |
| --- | --- | --- | --- |
| Roost → Local Worker | Kontrakty task/Ready, kontekstu i pojedynczego Writera; ścieżka nadzorowana | Dowodu całej bieżącej ścieżki od zadania Roost do wyniku/review | Jedno syntetyczne zadanie przez rzeczywiste granice task/Ready, Worker, handshake i review, bez modelu |
| Local Worker → Hermes | Kontrole instalacji, środowiska, budżetu, lease i Job; pierwotna własność, trwała bariera przed resume i cleanup po restarcie | Dowodu z rzeczywistą zamrożoną instalacją; pełna kontrola instalacji musi zmieścić się w terminie startu | Późniejsza osobno zatwierdzona próba; kwalifikacja syntetyczna jej nie zastępuje |
| Hermes → Codex | Historycznie jeden start providera w B21; zadany model i reasoning | Akceptacji całej próby; tożsamość modelu odpowiedzi w quiet jest nieobserwowalna | Osobno zatwierdzona próba zachowująca nieobserwowalne pola |
| Zmiana → test | W B21 dokładna naprawa; późniejszy niezależny test B24 PASS | Czystego wyniku bieżącej próby bez niewyjaśnionych zmian | Oczekiwany diff, niezmieniony test PASS i cleanup w jednym dopuszczonym przebiegu |
| Test → commit | Lokalna walidacja i ręcznie autoryzowane commity | Dowodu commitu agenta w granicach zadania | Commit związany z zaakceptowanym diff/test i authority zadania |
| Commit → review/release | Kontrakty review/release i negatywne bramki | Dowodu niezależnej akceptacji i osobno dozwolonego release całej ścieżki | Review dokładnego commitu; później release z właściwą zgodą |

Wszystkie sześć flag pozostaje false: implementationReady, executionSupported,
pilotReady, liveAdmissionAllowed, pilotExecutionAuthorized, pilotExecutionStarted.
ADR ma zmianę kontraktu v14; historyczna authority wykonania v13 jest zużyta.
Native-risk v7, registry/profile v5 i startup v2 pozostają bez zmian.

**Dokładnie jeden proponowany następny krok:** syntetyczne przejście jednego
zadania z Roost przez Local Worker i nowy handshake do wyniku i review,
bez modelu. Wypełnia pierwszą lukę tabeli; nie jest nową próbą providera.

## Weryfikacja zakresu

Zakres testów i ograniczenia zapisano w
[kontrakcie B28](fixture-ownership-before-resume.md#verification).
Nie uruchomiono modelu/Hermes/Codex, nie zmieniono auth, prywatnego profilu,
zamrożonej instalacji ani danych produkcyjnych. Nie wykonano push/deploy.
design-qa.md pozostaje poza zakresem: bez odczytu, zmian i stage.
