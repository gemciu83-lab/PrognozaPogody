'use strict';
const C=ForecastCore, $=id=>document.getElementById(id);
const storage={get(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}};
let locationNow=null, sourcesNow=[], rowsNow=[], generation=0, searchGeneration=0, lastAttempt=0;
const fmt=(n,d=1)=>C.numeric(n)?n.toLocaleString('pl-PL',{maximumFractionDigits:d}):'—';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cacheKey=(loc,model)=>`weather:multi:v3:${Number(loc.latitude).toFixed(4)},${Number(loc.longitude).toFixed(4)}:${model.id}`;
const zone=()=>sourcesNow[0]?.data.timezone || 'Europe/Warsaw';
const timeLabel=(t,date=false)=>new Intl.DateTimeFormat('pl-PL',{timeZone:zone(),...(date?{day:'2-digit',month:'2-digit'}:{}),hour:'2-digit',minute:'2-digit'}).format(t*1000);
function status(message,error=false){$('status').textContent=message;$('status').className=error?'error':'';}
async function fetchJSON(url){
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),16000);
  try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw Error(response.status===429?'Limit zapytań API':`Serwer: ${response.status}`);return await response.json();}
  catch(e){if(e.name==='AbortError')throw Error('Przekroczono czas odpowiedzi');throw e;}finally{clearTimeout(timer);}
}
function usable(saved,loc,model,maxAge){
  if(!saved || saved.id!==model.id || !C.numeric(saved.fetchedAt) || Date.now()-saved.fetchedAt<0 || Date.now()-saved.fetchedAt>maxAge)return null;
  try{C.validate(saved.data);if(!saved.data.hourly.time.some((t,i)=>t>=Math.floor(Date.now()/3600000)*3600&&C.numeric(saved.data.hourly.temperature_2m[i])))return null;return saved;}catch{return null;}
}
async function getModel(model,loc,force){
  const saved=storage.get(cacheKey(loc,model));
  if(!force){const fresh=usable(saved,loc,model,30*60000);if(fresh)return {...fresh,cache:true};}
  try{
    const data=C.validate(await fetchJSON(C.buildUrl(model,loc)));
    const source={...model,data,fetchedAt:Date.now(),cache:false};storage.set(cacheKey(loc,model),source);return source;
  }catch(error){const old=usable(saved,loc,model,48*3600000);if(old)return {...old,cache:true,stale:true,error:error.message};throw error;}
}
function statCell(stat,suffix='',digits=1){return fmt(stat?.mean,digits)+suffix+(stat?.count>0&&stat.count<3?` <small>(${stat.count})</small>`:'');}
const metricIcons={"Odczuwalna":"<path d=\"M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z\"/><path d=\"M12 10v8\"/>","Wilgotność":"<path d=\"M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z\"/><path d=\"M8 15a4 4 0 0 0 4 4\"/>","Ciśnienie na poziomie morza":"<path d=\"M4 18a9 9 0 1 1 16 0\"/><path d=\"m12 13 4-5M5 12h2m10 0h2M12 4v2M8 19h8\"/><circle cx=\"12\" cy=\"13\" r=\"1\"/>","Wiatr":"<path d=\"M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3\"/>","Porywy wiatru":"<path d=\"M3 7h13a3 3 0 1 0-3-3M5 12h14a3 3 0 1 1-3 3M2 17h9M2 21h6\"/>","Opady w godzinie":"<path d=\"M6 14a4 4 0 0 1-1-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 2 9H6Zm1 3-1 3m6-3-1 4m6-4-1 3\"/>","Zachmurzenie":"<path d=\"M6 18a5 5 0 0 1-1-10 6 6 0 0 1 11-1 5.5 5.5 0 0 1 2 11H6Z\"/>","Śnieg w godzinie":"<path d=\"M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9 5l3 3 3-3M9 19l3-3 3 3M5 11l4-1-1-4M19 13l-4 1 1 4M5 13l4 1-1 4M19 11l-4-1 1-4\"/>"};
function metric(label,stat,unit,digits=0,extra=''){
  return `<article class="metric"><span class="metric-label"><svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${metricIcons[label]||''}</svg>${label}</span><strong>${fmt(stat.mean,digits)} ${unit}</strong><small>${stat.count?`Zakres: ${fmt(stat.min,digits)}–${fmt(stat.max,digits)} ${unit}`:'Brak danych źródłowych'}${extra?'<br>'+extra:''}</small></article>`;
}
function render(){
  const nowHour=Math.floor(Date.now()/3600000)*3600;
  const current=rowsNow.find(r=>r.time===nowHour);
  $('forecast').hidden=false;$('place').textContent=locationNow.name;
  $('placeMeta').textContent=[locationNow.region,locationNow.country,`strefa: ${zone()}`].filter(Boolean).join(' · ');
  $('coverage').textContent=current?.members.length===3?'Prognoza uśredniona':'Niepełne dane';
  $('temperature').textContent=current?fmt(current.temperature_2m.mean)+'°C':'—';
  $('spread').textContent=current?`Zakres modeli: ${fmt(current.temperature_2m.min)}–${fmt(current.temperature_2m.max)}°C`:'Brak danych na obecną godzinę';
  $('currentTime').textContent=current?timeLabel(current.time,true):'Sprawdź prognozę godzinową';
  $('brief').textContent=current?`Opady: ${fmt(current.precipitation.mean)} mm/h.`:'Dostępne dane nie obejmują obecnej godziny.';
  const old=rowsNow.find(r=>r.time===nowHour-10800);
  // Compare only the same models at both times to avoid a change in model mix masquerading as a trend.
  const changes=current&&old?current.members.flatMap(m=>{const prev=old.members.find(p=>p.id===m.id);return C.numeric(m.pressure_msl)&&C.numeric(prev?.pressure_msl)?[m.pressure_msl-prev.pressure_msl]:[];}):[];
  const change=C.stats(changes).mean;
  $('metrics').innerHTML=current?[
    metric('Odczuwalna',current.apparent_temperature,'°C',1),metric('Wilgotność',current.relative_humidity_2m,'%',0),
    metric('Ciśnienie na poziomie morza',current.pressure_msl,'hPa',1,C.numeric(change)?`${change>=0?'+':''}${fmt(change)} hPa / 3 h`:''),
    metric('Wiatr',current.wind_speed_10m,'km/h',0,`Kierunek: ${fmt(current.wind_direction_10m.mean,0)}°`),
    metric('Porywy wiatru',current.wind_gusts_10m,'km/h',0),metric('Opady w godzinie',current.precipitation,'mm',1),
    metric('Zachmurzenie',current.cloud_cover,'%',0),metric('Śnieg w godzinie',current.snowfall,'cm',1)
  ].join(''):'';
  $('modelCaption').textContent=current?'Porównanie: '+timeLabel(current.time,true):'Dostępność modeli';
  $('models').innerHTML=C.models.map(model=>{
    const source=sourcesNow.find(s=>s.id===model.id), member=current?.members.find(m=>m.id===model.id);
    return `<tr><th scope="row">${model.name}${source?.stale?' · zapis awaryjny':''}</th><td>${fmt(member?.temperature_2m)}°C</td><td>${fmt(member?.precipitation)} mm</td><td>${fmt(member?.wind_speed_10m,0)} km/h</td><td>${fmt(member?.pressure_msl)} hPa</td><td>${source?esc(new Date(source.fetchedAt).toLocaleString('pl-PL'))+(source.cache?' · pamięć':''):'Niedostępny'}</td></tr>`;
  }).join('');
  const missing=C.models.filter(m=>!sourcesNow.some(s=>s.id===m.id)).map(m=>m.name);
  $('availability').textContent=[missing.length?'Brak źródeł: '+missing.join(', ')+'. Średnia obejmuje tylko dostępne modele.':'',sourcesNow.some(s=>s.stale)?'UWAGA: część prognoz pochodzi z zapisu awaryjnego; sprawdź daty pobrania.':'',sourcesNow.length===1?'Dostępny jest jeden model — to pojedyncza prognoza, bez porównania źródeł.':''].filter(Boolean).join(' ');
  renderHourly();
  $('daily').innerHTML=C.daily(rowsNow,zone()).map(d=>`<tr><th scope="row">${esc(new Intl.DateTimeFormat('pl-PL',{timeZone:zone(),weekday:'short',day:'2-digit',month:'2-digit'}).format(d.time*1000))}</th><td>${d.hours}${d.hours<23?' · część dnia':''}</td><td>${fmt(d.min)} / ${fmt(d.max)}°C</td><td>${fmt(d.rain.mean)} mm</td><td>${fmt(d.rain.min)}–${fmt(d.rain.max)} mm</td><td>${fmt(d.wind.max,0)} km/h</td><td>${d.minModels===d.maxModels?d.minModels:d.minModels+'–'+d.maxModels}</td></tr>`).join('');
}
function renderHourly(){
  const rows=rowsNow.filter(r=>r.time>=Math.floor(Date.now()/3600000)*3600).slice(0,Number($('hours').value));
  $('hourly').innerHTML=rows.map(r=>`<tr><th scope="row">${timeLabel(r.time,true)}</th><td>${statCell(r.temperature_2m,'°C')}</td><td>${fmt(r.temperature_2m.min)}–${fmt(r.temperature_2m.max)}°</td><td>${statCell(r.apparent_temperature,'°C')}</td><td class="${r.precipitation.mean>=0.1?'rain':''}">${statCell(r.precipitation)}<br><small>${fmt(r.precipitation.min)}–${fmt(r.precipitation.max)} mm</small></td><td>${statCell(r.snowfall)}</td><td>${statCell(r.wind_speed_10m,'',0)}</td><td>${statCell(r.wind_gusts_10m,'',0)}</td><td>${statCell(r.wind_direction_10m,'°',0)}</td><td>${statCell(r.relative_humidity_2m,'%',0)}</td><td>${statCell(r.pressure_msl)}</td><td>${statCell(r.cloud_cover,'%',0)}</td></tr>`).join('');
}
function validLocation(loc){return loc && C.numeric(loc.latitude)&&C.numeric(loc.longitude)&&Math.abs(loc.latitude)<=90&&Math.abs(loc.longitude)<=180;}
async function loadLocation(loc,force=false){
  if(!validLocation(loc)){status('Nieprawidłowe współrzędne lokalizacji.',true);return;}
  const id=++generation;locationNow={...loc,name:loc.name||'Wybrana lokalizacja'};lastAttempt=Date.now();$('city').value=locationNow.name;
  $('refresh').disabled=true;$('forecast').hidden=true;status('Pobieram ECMWF, ICON i GFS dla: '+locationNow.name+'…');
  const results=await Promise.allSettled(C.models.map(model=>getModel(model,locationNow,force)));
  if(id!==generation)return;
  sourcesNow=results.filter(r=>r.status==='fulfilled').map(r=>r.value);rowsNow=C.combine(sourcesNow);
  $('refresh').disabled=false;
  if(!rowsNow.some(r=>r.time>=Math.floor(Date.now()/3600000)*3600)){status('Brak prognoz dla tej lokalizacji. '+results.filter(r=>r.status==='rejected').map(r=>r.reason.message).join(' · ')+'. Spróbuj odświeżyć później.',true);return;}
  storage.set('weather:lastLocation',locationNow);render();
  status(sourcesNow.some(s=>s.stale)?'Wyświetlam także zapisane prognozy. Sprawdź daty pobrania poniżej.':(sourcesNow.length===3?'Prognoza aktualna.':'Część źródeł jest niedostępna.')+' Odświeżanie co 30 minut.',sourcesNow.some(s=>s.stale)||sourcesNow.length<3);
}
let locationIntent=0;
function searchStatus(text){$('searchStatus').textContent=text;}
async function searchCities(){
  const query=$('city').value.trim(),id=++searchGeneration; ++locationIntent;
  if(query.length<2){searchStatus('Wpisz minimum 2 znaki.');return;}
  searchStatus('Szukam miejscowości…');
  try{
    const url=new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search=new URLSearchParams({name:query,count:50,language:'pl',format:'json'});
    const data=await fetchJSON(url.href);if(id!==searchGeneration)return;
    const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').toLowerCase().trim();
    const score=x=>(normalize(x.name)===normalize(query)?100:0)+(x.country_code==='PL'?20:0);
    const results=(data.results||[]).filter(validLocation).sort((a,b)=>score(b)-score(a)||(b.population||0)-(a.population||0));
    if(!results.length){searchStatus('Nie znaleziono miejscowości. Wpisz pełną nazwę.');return;}
    const item=results[0];searchStatus('Wybrano: '+[item.name,item.admin1,item.country].filter(Boolean).join(' · '));
    loadLocation({name:item.name,region:item.admin1,country:item.country,latitude:item.latitude,longitude:item.longitude});
  }catch(e){if(id===searchGeneration)searchStatus('Wyszukiwanie niedostępne: '+e.message+'. Spróbuj ponownie.');}
}
$('searchForm').addEventListener('submit',e=>{e.preventDefault();searchCities();});
$('city').addEventListener('input',()=>{++searchGeneration;++locationIntent;searchStatus('');});
function setTheme(dark){document.documentElement.dataset.theme=dark?'dark':'light';$('theme').textContent=dark?'Tryb jasny':'Tryb ciemny';$('theme').setAttribute('aria-pressed',String(dark));}
setTheme(storage.get('weather:theme')==='dark'||(!storage.get('weather:theme')&&matchMedia('(prefers-color-scheme: dark)').matches));
$('theme').addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';setTheme(dark);storage.set('weather:theme',dark?'dark':'light');});
$('refresh').addEventListener('click',()=>locationNow&&loadLocation(locationNow,true));
$('hours').addEventListener('change',renderHourly);
function locateDevice(){
  const intent=++locationIntent;++searchGeneration;searchStatus('');
  function fallback(){
    if(intent!==locationIntent)return;
    const saved=storage.get('weather:lastLocation');
    if(!locationNow&&validLocation(saved))loadLocation(saved);
    searchStatus('Lokalizacja urządzenia jest niedostępna. Wpisz miejscowość lub włącz dostęp do lokalizacji.');
    if(!locationNow&&!validLocation(saved))status('Wpisz miejscowość, aby wczytać prognozę.');
  }
  if(!navigator.geolocation){fallback();return;}
  status('Ustalam lokalizację urządzenia…');
  navigator.geolocation.getCurrentPosition(p=>{
    if(intent!==locationIntent)return;
    loadLocation({name:'Moja lokalizacja',region:p.coords.latitude.toFixed(3)+'°, '+p.coords.longitude.toFixed(3)+'°',latitude:p.coords.latitude,longitude:p.coords.longitude});
  },fallback,{timeout:10000,maximumAge:300000});
}
$('gps').addEventListener('click',locateDevice);
function autoRefresh(){if(!document.hidden&&locationNow&&Date.now()-lastAttempt>=30*60000)loadLocation(locationNow);}
setInterval(autoRefresh,60000);document.addEventListener('visibilitychange',autoRefresh);
window.addEventListener('online',()=>{if(locationNow&&!$('refresh').disabled)loadLocation(locationNow);});
window.addEventListener('offline',()=>status('Brak połączenia. Widoczne dane są wcześniej pobraną prognozą.',true));
locateDevice();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('service-worker.js').catch(()=>{});
