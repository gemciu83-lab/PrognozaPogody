(function(root) {
  'use strict';
  const models = [
    {id:'ecmwf_ifs', name:'ECMWF IFS'},
    {id:'icon_seamless', name:'DWD ICON'},
    {id:'gfs_global', name:'NOAA GFS'}
  ];
  const fields = ['temperature_2m','apparent_temperature','relative_humidity_2m','pressure_msl','precipitation','snowfall','cloud_cover','wind_speed_10m','wind_gusts_10m','wind_direction_10m'];
  const numeric = v => typeof v === 'number' && Number.isFinite(v);
  function stats(values) {
    const valid = values.filter(numeric);
    return {mean:valid.length ? valid.reduce((a,b)=>a+b,0)/valid.length : null, min:valid.length?Math.min(...valid):null, max:valid.length?Math.max(...valid):null, count:valid.length};
  }
  function direction(values) {
    const a=values.filter(numeric); if(!a.length)return null;
    const x=a.reduce((n,v)=>n+Math.cos(v*Math.PI/180),0), y=a.reduce((n,v)=>n+Math.sin(v*Math.PI/180),0);
    return Math.hypot(x,y)/a.length<0.1?null:(Math.atan2(y,x)*180/Math.PI+360)%360;
  }
  function buildUrl(model, location) {
    const url=new URL('https://api.open-meteo.com/v1/forecast');
    Object.entries({latitude:location.latitude,longitude:location.longitude,models:model.id,hourly:fields.join(','),forecast_days:7,past_hours:3,timezone:'auto',timeformat:'unixtime',wind_speed_unit:'kmh',precipitation_unit:'mm',temperature_unit:'celsius'}).forEach(([k,v])=>url.searchParams.set(k,v));
    return url.href;
  }
  function validate(payload) {
    if(!payload?.hourly || !Array.isArray(payload.hourly.time) || !payload.hourly.time.length || !payload.hourly.time.every(numeric))throw Error('Nieprawidłowa oś czasu');
    if(!payload.hourly.temperature_2m?.some(numeric))throw Error('Brak temperatur');
    return payload;
  }
  function combine(sources) {
    const unique=[...new Map(sources.map(s=>[s.id,s])).values()];
    const indexed=unique.map(s=>({source:s, byTime:new Map(s.data.hourly.time.map((t,i)=>[t,i]))}));
    const times=[...new Set(unique.flatMap(s=>s.data.hourly.time))].sort((a,b)=>a-b);
    return times.map(time=>{
      const members=indexed.filter(s=>s.byTime.has(time)).map(s=>{
        const i=s.byTime.get(time);return {id:s.source.id,name:s.source.name,...Object.fromEntries(fields.map(k=>[k,s.source.data.hourly[k]?.[i]??null]))};
      }).filter(m=>numeric(m.temperature_2m));
      const row={time,members};
      fields.forEach(key=>row[key]=stats(members.map(m=>m[key])));
      row.wind_direction_10m.mean=direction(members.map(m=>m.wind_direction_10m));
      row.wetCount=members.filter(m=>numeric(m.precipitation)&&m.precipitation>=0.1).length;
      row.rainCount=row.precipitation.count;
      return row;
    }).filter(r=>r.members.length);
  }
  function dayKey(time, zone) { return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time*1000)); }
  function daily(rows,zone,now=Date.now()) {
    const groups=new Map();
    rows.filter(r=>r.time>=Math.floor(now/3600000)*3600).forEach(r=>{const k=dayKey(r.time,zone);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);});
    return [...groups.entries()].slice(0,7).map(([day,rs])=>{
      const ids=[...new Set(rs.flatMap(r=>r.members.map(m=>m.id)))];
      const totals=ids.map(id=>{const ms=rs.map(r=>r.members.find(m=>m.id===id));
        // Sum only a model with a value for every displayed hour of this day.
        return ms.every(m=>m&&numeric(m.precipitation))?ms.reduce((n,m)=>n+m.precipitation,0):null;
      });
      return {day,time:rs[0].time,hours:rs.length, min:Math.min(...rs.map(r=>r.temperature_2m.mean)),max:Math.max(...rs.map(r=>r.temperature_2m.mean)),rain:stats(totals),wind:stats(rs.map(r=>r.wind_gusts_10m.max)),minModels:Math.min(...rs.map(r=>r.members.length)),maxModels:Math.max(...rs.map(r=>r.members.length))};
    });
  }
  root.ForecastCore={models,fields,numeric,stats,direction,buildUrl,validate,combine,daily,dayKey};
  if(typeof module!=='undefined')module.exports=root.ForecastCore;
})(typeof globalThis!=='undefined'?globalThis:this);
