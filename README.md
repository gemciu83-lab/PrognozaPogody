# Pogoda 3.0 — dane i modele

Statyczna aplikacja pogodowa bez klucza API, oparta na trzech rodzinach modeli: ECMWF IFS, DWD ICON Seamless i NOAA GFS, udostępnianych przez Open-Meteo.

- Równe wagi dostępnych modeli i dopasowanie godzin po znacznikach UTC.
- Średnia, min./maks. i rzeczywista liczba źródeł dla każdego parametru.
- Braki danych pozostają brakami. Kierunek wiatru uśredniany kołowo.
- Liczba modeli z opadem nie jest prezentowana jako prawdopodobieństwo.
- Szczegółowe tabele godzinowe, porównanie modeli, sumy dobowe z informacją o liczbie godzin.
- Wilgotność, ciśnienie i zmiana przez 3 h, porywy, chmury, śnieg, odczuwalna.
- Cache 30 minut; awaryjnie do 48 godzin z datą pobrania. Odświeżanie tylko przy widocznej stronie.
- Uproszczony interfejs bez animowanych ozdób, porad i mapy symulowanej.

Nie jest to oficjalna prognoza zespołowa ani system ostrzeżeń. Średnia nie gwarantuje wyższej trafności, a zakres modeli nie jest przedziałem ufności. Trzy modele korzystają z jednego dostawcy API. Dalsze godziny mogą mieć mniej źródeł. Czas pobrania to nie czas uruchomienia modelu.

Uruchom przez HTTP(S), np. `python -m http.server 8000`. Na GitHub Pages wgraj pliki do katalogu głównego. Starsze nieużywane pliki mogą pozostać. Bez procesu budowania i zewnętrznych bibliotek JavaScript.

Źródła: https://open-meteo.com/en/docs, ECMWF, DWD, NOAA. Obowiązują warunki i limity API Open-Meteo.
