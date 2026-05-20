import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Camera,
  Car,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Download,
  Link2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Truck,
  Users,
  Wrench,
  BriefcaseBusiness,
  Bus,
  Upload
} from 'lucide-react';

const DATA_VERSION = 'skyline-scheduler-may18-v1';
const teams = ['Skyline 1', 'Skyline 2', 'Skyline 3', 'Skyline 4', 'Skyline 5'];
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const startDate = new Date(2026, 4, 18);
const oneDayMs = 24 * 60 * 60 * 1000;

const initialEmployees = [
  'EMRE B.', 'METEHAN', 'FERDI', 'AYBERK', 'UMIT',
  'Sinan K.', 'Musa T.', 'Volkan A.', 'Yusuf K.', 'Abdulhakim D.',
  'Zafer O.', 'Ali Emre A.', 'Sergio M.', 'Carlos', 'Ahmet K.',
  'Bilal A.', 'Oguzhan B.', 'Juan'
];
const initialLeaders = ['EMRE B.', 'METEHAN', 'FERDI', 'AYBERK', 'UMIT'];
const initialCustomers = [];
const initialVehicles = [];

const defaultTeamLeaders = {
  'Skyline 1': 'EMRE B.',
  'Skyline 2': 'FERDI',
  'Skyline 3': 'UMIT',
  'Skyline 4': 'AYBERK',
  'Skyline 5': 'METEHAN'
};

const teamColors = {
  'Skyline 1': { card: 'blue-card', header: 'blue-header', summary: 'blue-summary', summaryHead: 'blue-head' },
  'Skyline 2': { card: 'green-card', header: 'green-header', summary: 'green-summary', summaryHead: 'green-head' },
  'Skyline 3': { card: 'yellow-card', header: 'yellow-header', summary: 'yellow-summary', summaryHead: 'yellow-head' },
  'Skyline 4': { card: 'purple-card', header: 'purple-header', summary: 'purple-summary', summaryHead: 'purple-head' },
  'Skyline 5': { card: 'red-card', header: 'red-header', summary: 'red-summary', summaryHead: 'red-head' }
};

function storageGet(key, fallback) {
  try {
    const version = localStorage.getItem('skyline_data_version');
    if (version !== DATA_VERSION) return fallback;
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function storageSet(key, value) {
  try {
    localStorage.setItem('skyline_data_version', DATA_VERSION);
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function emptyJob(team = '') {
  return {
    customer: '', address: '', notes: '', leader: defaultTeamLeaders[team] || '', vehicle: '', companyCamProject: '',
    jobType: 'Project', showProgress: false, progress: '', showMissingMaterials: false, missingMaterials: '',
    showRequests: false, requests: '', employees: []
  };
}
function buildDefaultWeek() {
  const week = {};
  for (const day of days) {
    week[day] = {};
    for (const team of teams) week[day][team] = emptyJob(team);
  }
  return week;
}
function normalizeWeek(raw) {
  const out = {};
  for (const day of days) {
    out[day] = {};
    for (const team of teams) {
      out[day][team] = { ...emptyJob(team), ...(raw?.[day]?.[team] || {}) };
      if (!Array.isArray(out[day][team].employees)) out[day][team].employees = [];
    }
  }
  return out;
}
function getWeekStart(index) { return new Date(startDate.getTime() + index * 7 * oneDayMs); }
function getWeekKey(index) {
  const d = getWeekStart(index);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getDayDate(weekIndex, dayIndex) { return new Date(getWeekStart(weekIndex).getTime() + dayIndex * oneDayMs); }
function formatMonthDay(date) { return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function getWeekTitle(weekIndex) {
  const s = getWeekStart(weekIndex); const e = new Date(s.getTime() + 6 * oneDayMs);
  if (s.getMonth() === e.getMonth()) return `${s.toLocaleDateString('en-US', { month: 'short' })} ${s.getDate()}-${e.getDate()}, ${s.getFullYear()}`;
  return `${formatMonthDay(s)} - ${formatMonthDay(e)}, ${e.getFullYear()}`;
}
function normalizeAllWeeks(raw) {
  const firstKey = getWeekKey(0);
  if (!raw) return { [firstKey]: buildDefaultWeek() };
  const out = {};
  for (const [key, val] of Object.entries(raw)) out[key] = normalizeWeek(val);
  if (!out[firstKey]) out[firstKey] = buildDefaultWeek();
  return out;
}
function vehiclePlateLabel(vehicle) { return vehicle?.plate?.trim() ? vehicle.plate.trim().toUpperCase() : 'NO PLATE'; }
function VehicleIcon({ type, size = 16 }) {
  if (type === 'minivan' || type === 'van') return <Bus size={size} />;
  if (type === 'car') return <Car size={size} />;
  return <Truck size={size} />;
}
function leaderColorClass(name) {
  const key = String(name || '').toUpperCase();
  if (key.includes('EMRE')) return 'leader-blue';
  if (key.includes('METEHAN')) return 'leader-red';
  if (key.includes('FERDI')) return 'leader-green';
  if (key.includes('AYBERK')) return 'leader-purple';
  if (key.includes('UMIT') || key.includes('ÜMIT') || key.includes('ÜMİT')) return 'leader-yellow';
  return 'leader-slate';
}
function durationClass(daysCount) {
  const d = Number(daysCount || 0);
  if (d <= 3) return 'duration-green';
  if (d <= 6) return 'duration-yellow';
  if (d <= 10) return 'duration-blue';
  return 'duration-purple';
}

export default function App() {
  const boardRef = useRef(null);
  const weeklySummaryRef = useRef(null);
  const cardRefs = useRef({});

  const [employees, setEmployees] = useState(() => storageGet('employees', initialEmployees));
  const [leaders, setLeaders] = useState(() => storageGet('leaders', initialLeaders));
  const [customers, setCustomers] = useState(() => storageGet('customers', initialCustomers));
  const [vehicles, setVehicles] = useState(() => storageGet('vehicles', initialVehicles));
  const [allSchedules, setAllSchedules] = useState(() => normalizeAllWeeks(storageGet('weeks', null)));
  const [weekIndex, setWeekIndex] = useState(() => storageGet('weekIndex', 0));
  const [selectedDay, setSelectedDay] = useState(() => storageGet('selectedDay', 'Monday'));
  const [search, setSearch] = useState('');
  const [newEmployee, setNewEmployee] = useState('');
  const [newLeader, setNewLeader] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newVehicle, setNewVehicle] = useState({ name: '', model: '', color: '', plate: '', icon: 'truck' });
  const [draggedPerson, setDraggedPerson] = useState(null);

  const activeDay = days.includes(selectedDay) ? selectedDay : 'Monday';
  const weekKey = getWeekKey(weekIndex);
  const schedule = normalizeWeek(allSchedules[weekKey]);
  const todayJobs = schedule[activeDay];
  const weekTitle = getWeekTitle(weekIndex);

  useEffect(() => storageSet('employees', employees), [employees]);
  useEffect(() => storageSet('leaders', leaders), [leaders]);
  useEffect(() => storageSet('customers', customers), [customers]);
  useEffect(() => storageSet('vehicles', vehicles), [vehicles]);
  useEffect(() => storageSet('weeks', allSchedules), [allSchedules]);
  useEffect(() => storageSet('weekIndex', weekIndex), [weekIndex]);
  useEffect(() => storageSet('selectedDay', activeDay), [activeDay]);

  useEffect(() => {
    if (allSchedules[weekKey]) return;
    const prevKey = getWeekKey(Math.max(0, weekIndex - 1));
    setAllSchedules(prev => ({ ...prev, [weekKey]: normalizeWeek(prev[prevKey] || buildDefaultWeek()) }));
  }, [weekIndex, weekKey, allSchedules]);

  const allAssignedToday = useMemo(() => teams.flatMap(team => (todayJobs?.[team]?.employees || []).map(name => ({ name, team }))), [todayJobs]);
  const unassignedEmployees = useMemo(() => {
    const assigned = new Set(allAssignedToday.map(x => x.name));
    return employees.filter(name => !assigned.has(name));
  }, [employees, allAssignedToday]);
  const duplicateNames = useMemo(() => {
    const counts = {};
    allAssignedToday.forEach(x => { counts[x.name] = (counts[x.name] || 0) + 1; });
    return Object.keys(counts).filter(name => counts[name] > 1);
  }, [allAssignedToday]);
  const filteredEmployees = employees.filter(name => name.toLowerCase().includes(search.toLowerCase()));
  const customerUsage = useMemo(() => {
    const usage = {};
    for (const day of days) {
      const daily = new Set();
      for (const team of teams) {
        const customer = schedule[day]?.[team]?.customer?.trim();
        if (!customer) continue;
        if (!usage[customer]) usage[customer] = { days: 0, assignments: 0 };
        usage[customer].assignments += 1;
        daily.add(customer);
      }
      daily.forEach(customer => usage[customer].days += 1);
    }
    return usage;
  }, [schedule]);
  function stats(customer) { return customerUsage[customer?.trim()] || { days: 0, assignments: 0 }; }
  function getVehicle(id) { return vehicles.find(v => v.id === id); }
  function getVehiclePlate(id) { const v = getVehicle(id); return v ? vehiclePlateLabel(v) : '-'; }
  function getTeamWeekPlates(team) {
    const plates = [];
    days.forEach(day => {
      const plate = getVehiclePlate(schedule[day]?.[team]?.vehicle);
      if (plate && !['-', 'NO PLATE'].includes(plate) && !plates.includes(plate)) plates.push(plate);
    });
    return plates.length ? plates.join(' / ') : 'No plate';
  }

  function updateJob(team, field, value) {
    const currentWeek = normalizeWeek(allSchedules[weekKey]);
    currentWeek[activeDay][team] = { ...currentWeek[activeDay][team], [field]: value };
    setAllSchedules(prev => ({ ...prev, [weekKey]: currentWeek }));
  }
  function addEmployeeToTeam(team, name) {
    if (!name) return;
    const currentWeek = normalizeWeek(allSchedules[weekKey]);
    const dayJobs = clone(currentWeek[activeDay]);
    teams.forEach(t => {
      dayJobs[t].employees = (dayJobs[t].employees || []).filter(p => p !== name);
      if (dayJobs[t].leader === name) dayJobs[t].leader = '';
    });
    dayJobs[team].employees = [...(dayJobs[team].employees || []), name];
    setAllSchedules(prev => ({ ...prev, [weekKey]: { ...currentWeek, [activeDay]: dayJobs } }));
  }
  function removeEmployeeFromTeam(team, name) {
    const job = todayJobs[team];
    updateJob(team, 'employees', (job.employees || []).filter(p => p !== name));
    if (job.leader === name) updateJob(team, 'leader', defaultTeamLeaders[team] || '');
  }
  function addEmployee() {
    const clean = newEmployee.trim(); if (!clean || employees.includes(clean)) return;
    setEmployees(prev => [...prev, clean]); setNewEmployee('');
  }
  function addLeader() {
    const clean = newLeader.trim().toUpperCase(); if (!clean || leaders.includes(clean)) return;
    setLeaders(prev => [...prev, clean]); setNewLeader('');
  }
  function addCustomer() {
    const clean = newCustomer.trim(); if (!clean || customers.includes(clean)) return;
    setCustomers(prev => [...prev, clean].sort()); setNewCustomer('');
  }
  function addVehicle() {
    const name = newVehicle.name.trim(); const model = newVehicle.model.trim();
    if (!name || !model) return;
    const id = `${name}-${model}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setVehicles(prev => [...prev, { ...newVehicle, id, name, model, color: newVehicle.color.trim(), plate: newVehicle.plate.trim().toUpperCase() }]);
    setNewVehicle({ name: '', model: '', color: '', plate: '', icon: 'truck' });
  }
  function copyMonday() {
    const currentWeek = normalizeWeek(allSchedules[weekKey]);
    const next = clone(currentWeek);
    days.forEach(day => { if (day !== 'Monday') next[day] = clone(currentWeek.Monday); });
    setAllSchedules(prev => ({ ...prev, [weekKey]: next }));
  }
  function buildMessage(team) {
    const job = todayJobs[team] || emptyJob(team);
    const lines = [
      `*${activeDay} ${formatMonthDay(getDayDate(weekIndex, days.indexOf(activeDay)))} - ${team}*`,
      `*Type:* ${job.jobType || '-'}`,
      `*Customer/Project:* ${job.customer || '-'}`,
      `*Address:* ${job.address || '-'}`,
      `*Leader:* ${job.leader || '-'}`,
      `*Vehicle Plate:* ${getVehiclePlate(job.vehicle)}`,
      `*Crew:* ${(job.employees || []).join(', ') || '-'}`,
      `*CompanyCam:* ${job.companyCamProject || '-'}`,
      `*Missing Materials:* ${job.missingMaterials || '-'}`,
      `*Requests:* ${job.requests || '-'}`,
      `*Notes:* ${job.notes || '-'}`
    ];
    return lines.join(String.fromCharCode(10));
  }
  async function copyMessage(team) { await navigator.clipboard.writeText(buildMessage(team)); alert(`${team} copied.`); }
  function openWhatsApp(team) { window.open(`https://wa.me/?text=${encodeURIComponent(buildMessage(team))}`, '_blank'); }
  async function shot(element, filename, type = 'png') {
    if (!element) return;
    const canvas = await html2canvas(element, { backgroundColor: '#fff', scale: 2, useCORS: true });
    const link = document.createElement('a');
    link.download = filename;
    link.href = type === 'jpg' ? canvas.toDataURL('image/jpeg', 0.95) : canvas.toDataURL('image/png');
    link.click();
  }
  async function shareWeekly() {
    if (!weeklySummaryRef.current) return;
    const canvas = await html2canvas(weeklySummaryRef.current, { backgroundColor: '#fff', scale: 2, useCORS: true });
    canvas.toBlob(async blob => {
      const file = new File([blob], `${weekTitle}-weekly-summary.jpg`.replaceAll(' ', '-'), { type: 'image/jpeg' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: 'Skyline Weekly Summary', files: [file] });
      else shot(weeklySummaryRef.current, `${weekTitle}-weekly-summary.jpg`.replaceAll(' ', '-'), 'jpg');
    }, 'image/jpeg', 0.95);
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({ employees, leaders, customers, vehicles, allSchedules, weekIndex }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'skyline-scheduler-backup.json'; a.click(); URL.revokeObjectURL(url);
  }
  function importData(e) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.employees) setEmployees(parsed.employees);
        if (parsed.leaders) setLeaders(parsed.leaders);
        if (parsed.customers) setCustomers(parsed.customers);
        if (parsed.vehicles) setVehicles(parsed.vehicles);
        if (parsed.allSchedules) setAllSchedules(normalizeAllWeeks(parsed.allSchedules));
        if (typeof parsed.weekIndex === 'number') setWeekIndex(parsed.weekIndex);
      } catch { alert('Backup file could not be read.'); }
    };
    reader.readAsText(file);
  }

  return <div className="app">
    <header className="topbar">
      <div>
        <div className="eyebrow"><CalendarDays size={16} /> Weekly Crew Planner</div>
        <h1>Skyline Crew & Job Scheduler</h1>
        <p>Week {weekIndex + 1} of 52 starts from May 18, 2026. First week is May 18-24.</p>
      </div>
      <div className="week-pill">{weekTitle}</div>
      <div className="actions">
        <button onClick={() => setWeekIndex(w => Math.max(0, w - 1))}><ChevronLeft size={16}/> Previous</button>
        <button className="dark" onClick={() => setWeekIndex(w => Math.min(51, w + 1))}>Next <ChevronRight size={16}/></button>
        <button onClick={copyMonday}><Copy size={16}/> Copy Monday</button>
        <button onClick={() => shot(boardRef.current, `${weekTitle}-${activeDay}-board.png`.replaceAll(' ', '-'))}><Camera size={16}/> Day Image</button>
        <button onClick={exportData}><Download size={16}/> Backup</button>
        <label className="button"><Upload size={16}/> Restore<input type="file" accept="application/json" onChange={importData}/></label>
      </div>
    </header>

    <div className="layout">
      <aside className="sidebar">
        <section className="panel alert-panel">
          <h2><AlertTriangle size={22}/> Unassigned Workers</h2>
          <div className="white-box">{unassignedEmployees.length ? unassignedEmployees.join(', ') : 'Everyone is assigned'}</div>
          {duplicateNames.length > 0 && <div className="double-box">Double assigned: {duplicateNames.join(', ')}</div>}
        </section>

        <section className="panel"><h2><Users size={20}/> Worker List</h2>
          <div className="search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search worker..." /></div>
          <div className="add-row"><input value={newEmployee} onChange={e=>setNewEmployee(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addEmployee()} placeholder="New worker"/><button onClick={addEmployee}><Plus size={16}/></button></div>
          <div className="scroll-list">{filteredEmployees.map(name => <div className="list-item" draggable onDragStart={()=>setDraggedPerson(name)} key={name}><span>{name}</span><button onClick={()=>setEmployees(prev=>prev.filter(x=>x!==name))}><Trash2 size={15}/></button></div>)}</div>
        </section>

        <section className="panel"><h2><Crown size={20}/> Leader List</h2>
          <div className="add-row"><input value={newLeader} onChange={e=>setNewLeader(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addLeader()} placeholder="New leader"/><button onClick={addLeader}><Plus size={16}/></button></div>
          <div className="scroll-list small">{leaders.map(name => <div className="list-item" key={name}><span className={`leader-badge ${leaderColorClass(name)}`}>{name}</span><button onClick={()=>setLeaders(prev=>prev.filter(x=>x!==name))}><Trash2 size={15}/></button></div>)}</div>
        </section>

        <section className="panel"><h2><Building2 size={20}/> Customer List</h2>
          <div className="add-row"><input value={newCustomer} onChange={e=>setNewCustomer(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCustomer()} placeholder="New customer"/><button onClick={addCustomer}><Plus size={16}/></button></div>
          <div className="scroll-list small">{customers.map(c => <div className="list-item" key={c}><span>{c}</span><button onClick={()=>setCustomers(prev=>prev.filter(x=>x!==c))}><Trash2 size={15}/></button></div>)}</div>
        </section>

        <section className="panel"><h2><Truck size={20}/> Vehicle List</h2>
          <div className="vehicle-form">
            <input value={newVehicle.name} onChange={e=>setNewVehicle(v=>({...v,name:e.target.value}))} placeholder="Brand / Name"/>
            <input value={newVehicle.model} onChange={e=>setNewVehicle(v=>({...v,model:e.target.value}))} placeholder="Model"/>
            <input value={newVehicle.color} onChange={e=>setNewVehicle(v=>({...v,color:e.target.value}))} placeholder="Color"/>
            <input value={newVehicle.plate} onChange={e=>setNewVehicle(v=>({...v,plate:e.target.value.toUpperCase()}))} placeholder="Plate"/>
            <select value={newVehicle.icon} onChange={e=>setNewVehicle(v=>({...v,icon:e.target.value}))}><option value="truck">Truck</option><option value="van">Van</option><option value="minivan">Minivan</option><option value="car">Car</option></select>
            <button onClick={addVehicle}>Add</button>
          </div>
          <div className="scroll-list small">{vehicles.map(v => <div className="list-item" key={v.id}><span><VehicleIcon type={v.icon}/> {vehiclePlateLabel(v)}</span><button onClick={()=>setVehicles(prev=>prev.filter(x=>x.id!==v.id))}><Trash2 size={15}/></button></div>)}</div>
        </section>
      </aside>

      <main className="main">
        <nav className="days">{days.map((day, i) => <button key={day} className={activeDay===day?'active':''} onClick={()=>setSelectedDay(day)}><b>{day}</b><span>{formatMonthDay(getDayDate(weekIndex, i))}</span></button>)}</nav>

        <div className="team-grid" ref={boardRef}>{teams.map(team => {
          const job = todayJobs[team] || emptyJob(team); const colors = teamColors[team]; const st = stats(job.customer); const leaderOptions = Array.from(new Set([defaultTeamLeaders[team], ...leaders, ...(job.employees||[])].filter(Boolean)));
          return <section className={`team-card ${colors.card}`} key={team} ref={node=>cardRefs.current[team]=node} onDragOver={e=>e.preventDefault()} onDrop={()=>{addEmployeeToTeam(team, draggedPerson); setDraggedPerson(null);}}>
            <div className={`team-head ${colors.header}`}><h3>{team}</h3><p>{activeDay} · {formatMonthDay(getDayDate(weekIndex, days.indexOf(activeDay)))} · {(job.employees||[]).length} workers</p><div className="head-lines"><span>Leader: {job.leader || '-'}</span><span><VehicleIcon type={getVehicle(job.vehicle)?.icon}/> Plate: {getVehiclePlate(job.vehicle)}</span></div></div>
            <div className="job-type"><button className={job.jobType==='Project'?'selected':''} onClick={()=>updateJob(team,'jobType','Project')}><BriefcaseBusiness size={15}/> Project</button><button className={job.jobType==='Service'?'selected service':''} onClick={()=>updateJob(team,'jobType','Service')}><Wrench size={15}/> Service</button></div>
            <div className="field-card"><label>Customer / Project</label>{job.customer && <div className={`duration ${durationClass(st.days)}`}><span>{st.days} days on this job</span><b>{st.assignments}x</b><i style={{width:`${Math.min(100, Math.max(8, st.days*10))}%`}}/></div>}
              <select value={customers.includes(job.customer)?job.customer:'__custom__'} onChange={e=>updateJob(team,'customer',e.target.value==='__custom__'?job.customer:e.target.value)}><option value="">Select customer...</option>{customers.map(c=><option key={c} value={c}>{c}</option>)}<option value="__custom__">Custom / type below</option></select>
              <input value={job.customer} onChange={e=>updateJob(team,'customer',e.target.value)} onBlur={e=>{const c=e.target.value.trim(); if(c&&!customers.includes(c)) setCustomers(prev=>[...prev,c].sort())}} placeholder="Customer / Project Name" />
            </div>
            <div className="icon-input"><MapPin size={16}/><input value={job.address} onChange={e=>updateJob(team,'address',e.target.value)} placeholder="Address" /></div>
            <div className="two"><select value={job.leader} onChange={e=>updateJob(team,'leader',e.target.value)}><option value="">Select Leader...</option>{leaderOptions.map(l=><option key={l} value={l}>{l}</option>)}</select><select value={job.vehicle} onChange={e=>updateJob(team,'vehicle',e.target.value)}><option value="">Select Plate...</option>{vehicles.map(v=><option key={v.id} value={v.id}>{vehiclePlateLabel(v)}</option>)}</select></div>
            {!(job.showProgress || job.progress) ? <button className="outline" onClick={()=>updateJob(team,'showProgress',true)}>+ Progress Battery</button> : <div className="progress-box"><div><b>Progress Battery</b><span>{job.progress||0}% <button onClick={()=>{updateJob(team,'progress',''); updateJob(team,'showProgress',false)}}>Hide</button></span></div><em><i style={{width:`${Number(job.progress||0)}%`}}/></em><input type="range" min="0" max="100" step="5" value={job.progress||0} onChange={e=>updateJob(team,'progress',e.target.value)}/></div>}
            <input value={job.companyCamProject} onChange={e=>updateJob(team,'companyCamProject',e.target.value)} placeholder="CompanyCam Project / Link" />
            <textarea value={job.notes} onChange={e=>updateJob(team,'notes',e.target.value)} placeholder="Notes: instructions, punch list, start time..." />
            <div className="optional"><button onClick={()=>updateJob(team,'showMissingMaterials',true)}>+ Missing Materials</button><button onClick={()=>updateJob(team,'showRequests',true)}>+ Request Items</button></div>
            {(job.showMissingMaterials || job.missingMaterials) && <textarea className="warning" value={job.missingMaterials} onChange={e=>updateJob(team,'missingMaterials',e.target.value)} placeholder="Missing materials..."/>}
            {(job.showRequests || job.requests) && <textarea className="request" value={job.requests} onChange={e=>updateJob(team,'requests',e.target.value)} placeholder="Requests / needed items..."/>}
            <div className="crew"><h4>Crew Members</h4><div className="chips">{(job.employees||[]).map(name=><span key={name} draggable onDragStart={()=>setDraggedPerson(name)} className={duplicateNames.includes(name)?'danger':''}>{name}{job.leader===name&&<b className={`leader-badge ${leaderColorClass(name)}`}>Leader</b>}<button onClick={()=>removeEmployeeFromTeam(team,name)}>×</button></span>)}{!(job.employees||[]).length&&<small>Drag workers here.</small>}</div><select onChange={e=>{addEmployeeToTeam(team,e.target.value); e.target.value='';}} defaultValue=""><option value="" disabled>Add worker to this crew...</option>{unassignedEmployees.map(name=><option key={name} value={name}>{name}</option>)}</select><div className="mini-actions"><button onClick={()=>copyMessage(team)}>Copy</button><button onClick={()=>openWhatsApp(team)}>WhatsApp</button><button onClick={()=>shot(cardRefs.current[team], `${weekTitle}-${activeDay}-${team}.png`.replaceAll(' ','-'))}>Image</button></div></div>
          </section>})}</div>

        <section className="summary-card"><div className="summary-title"><h2>Weekly Summary</h2><div><button onClick={()=>shot(weeklySummaryRef.current, `${weekTitle}-weekly-summary.jpg`.replaceAll(' ','-'), 'jpg')}><Camera size={16}/> JPEG</button><button onClick={()=>window.print()}><Download size={16}/> PDF / Print</button><button className="dark" onClick={shareWeekly}><Link2 size={16}/> Share</button></div></div>
          <div className="summary-wrap" ref={weeklySummaryRef}><table className="summary-table"><thead><tr><th>Day</th>{teams.map(team=><th key={team} className={teamColors[team].summaryHead}><b>{team}</b><span>Plate: {getTeamWeekPlates(team)}</span></th>)}</tr></thead><tbody>{days.map(day=><tr key={day}><td className="day-cell"><b>{day}</b><span>{formatMonthDay(getDayDate(weekIndex, days.indexOf(day)))}</span></td>{teams.map(team=>{const job=schedule[day][team]||emptyJob(team); const st=stats(job.customer); return <td key={team}><div className={`sum-box ${teamColors[team].summary}`}><strong>{job.customer||'—'}</strong>{job.customer&&<div className={`duration compact ${durationClass(st.days)}`}><span>{st.days} days</span><b>{st.assignments}x</b><i style={{width:`${Math.min(100,Math.max(8,st.days*10))}%`}}/></div>}<small>{job.address||'No address'}</small><p>Leader: <b>{job.leader||'-'}</b></p><p>{(job.employees||[]).length} workers</p>{job.missingMaterials&&<mark>Missing: {job.missingMaterials}</mark>}{job.requests&&<mark className="req">Request: {job.requests}</mark>}</div></td>})}</tr>)}</tbody></table></div>
        </section>
      </main>
    </div>
  </div>;
}
