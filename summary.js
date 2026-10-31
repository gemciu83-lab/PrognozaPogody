function forecastMoment(value, offset = 0) {
  if (!value) return NaN;
  return /(?:Z|[+-]\d\d:\d\d)$/.test(value)
    ? Date.parse(value) : Date.parse(value + 'Z') - offset * 1000;
}

function buildQuickForecast(data, now = Date.now()) {
  const hourly = data.hourly || {};
  const offset = Number(data.utc_offset_seconds) || 0;
  const rows = (hourly.time || []).map((time, i) => ({
    time, at: forecastMoment(time, offset), rain: hourly.precipitation_probability?.[i]
  })).filter(row => row.at >= now && row.at <= now + 6 * 3600000);
  const known = rows.filter(row => row.rain !== null && row.rain !== undefined && Number.isFinite(Number(row.rain)));
  const wet = known.find(row => Number(row.rain) >= 50);
  const timezone = data.timezone || 'UTC';
  const clock = at => new Intl.DateTimeFormat('pl-PL', { hour:'2-digit', minute:'2-digit', timeZone:timezone }).format(at);
  const message = wet
    ? `Możliwe opady około ${clock(wet.at)} — prawdopodobieństwo ${Math.round(wet.rain)}%.`
    : known.length >= 5
      ? 'W najbliższych 6 godzinach prawdopodobieństwo opadów jest poniżej 50%.'
      : 'Za mało danych, aby podsumować opady w najbliższych 6 godzinach.';
  return { message, rain: known.length ? Math.max(...known.map(row => Number(row.rain))) : null };
}

function renderQuickForecast(data, location) {
  const root = document.querySelector('#quickForecast');
  const current = data.current || {};
  const summary = buildQuickForecast(data);
  const metric = (value, suffix) => value === null || value === undefined || !Number.isFinite(Number(value))
    ? 'Brak danych' : Math.round(Number(value)) + suffix;
  const put = (id, text) => document.getElementById(id).textContent = text;
  put('quickPlace', location.name);
  put('quickTemp', metric(current.temperature_2m, '°C'));
  put('quickFeels', metric(current.apparent_temperature, '°C'));
  put('quickWind', metric(current.wind_speed_10m, ' km/h'));
  put('quickRain', metric(summary.rain, '%'));
  put('quickMessage', summary.message);
  const cached = data.providerMode === 'cache';
  root.dataset.cached = String(cached);
  put('quickSource', cached ? 'Zapisana prognoza · może być nieaktualna' : 'Dane pobrane z sieci · ' + (data.providerName || 'MET Norway'));
  const fetched = data.cacheSavedAt || data.fetchedAt;
  put('quickFetched', fetched ? 'Pobrano: ' + new Date(fetched).toLocaleString('pl-PL') : 'Czas pobrania nieznany');
  put('quickTime', current.time ? 'Czas danych: ' + current.time.replace('T', ' ').replace('Z', ' UTC') + ' · ' + (data.timezone || 'UTC') : 'Czas danych niedostępny');
}

function setupMobileDetails() {
  const mobile = window.matchMedia('(max-width: 700px)');
  document.querySelectorAll('#weatherHistoryPanel, #comparePanel, .side > .panel:first-child').forEach(panel => {
    const heading = panel.querySelector('h3');
    if (!heading) return;
    const details = document.createElement('details');
    details.className = 'forecast-details';
    const summary = document.createElement('summary');
    summary.textContent = heading.textContent;
    details.append(summary);
    panel.before(details);
    details.append(panel);
    details.open = !mobile.matches;
    details.addEventListener('toggle', () => { if(details.open) window.dispatchEvent(new Event('resize')); });
    mobile.addEventListener('change', event => { details.open = !event.matches; });
  });
}
document.addEventListener('DOMContentLoaded', setupMobileDetails);
