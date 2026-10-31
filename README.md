# Pogoda lokalna — wersja 2

Ulepszona wersja istniejącej aplikacji, z zachowaniem jej wyglądu, wykresów, ulubionych miast i mapy.

## Poprawki

- Brak generowanej prognozy przy awarii źródeł; zamiast niej zapisane rzeczywiste dane lub komunikat błędu.
- Odrzucanie starych symulowanych danych z pamięci.
- Spóźnione odpowiedzi nie nadpisują ostatnio wybranego miasta.
- Zapisana prognoza nie otrzymuje nowej daty pobrania przy każdym odczycie.
- Limit 12 sekund dla pojedynczego żądania danych, łącznie z odczytem odpowiedzi.
- Ochrona przed niedostępną pamięcią przeglądarki.
- Unieważnianie poprzednich wyników wyszukiwania przy zmianie tekstu.
- Pasek połączenia, przycisk odświeżania i ponowne pobieranie po odzyskaniu sieci.
- Komunikaty dostępne dla czytników ekranu, widoczny fokus i ograniczenie animacji CSS według ustawień systemowych.
- Service worker usuwa tylko pamięć tej aplikacji i nie zapisuje odpowiedzi błędów jako strony offline.

## Wgranie na istniejące GitHub Pages

Zastąp pliki w katalogu głównym repozytorium zawartością tej paczki, zachowując `.nojekyll`. Nie zmieniaj ustawień Pages. Nowa ikona to `favicon.svg` (stary `favicon.png` może pozostać). Po publikacji odśwież stronę, aby przeglądarka pobrała nową wersję.

Podgląd lokalny wymaga serwera HTTP, np. `python -m http.server 8000` w katalogu aplikacji. Otwórz http://localhost:8000. GPS i service worker wymagają HTTPS lub localhost.

## Dane i ograniczenia

Open-Meteo, awaryjnie MET Norway; mapa Leaflet/OpenStreetMap. Wskaźnik sieci informuje o stanie przeglądarki, nie gwarantuje dostępności API. Zapisana prognoza może mieć do 48 godzin. Mapy i biblioteki zewnętrzne mogą być niedostępne offline. Instalowalność PWA zależy od przeglądarki; pełny zestaw ikon PNG nie jest dołączony.

Weryfikacja: kontrola składni JavaScript oraz testy logiki awarii, pamięci i przełączania miast. Nie przeprowadzono pełnego testu wizualnego ani testu z rzeczywistymi API w przeglądarce.
