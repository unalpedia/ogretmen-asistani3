<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Asistan Pro V12.5 - Secure Edition</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f1f5f9; }
        .tab-btn { padding: 10px 16px; border-radius: 14px; font-weight: 800; font-size: 11px; transition: 0.3s; text-transform: uppercase; }
        .active-tab { background: #4338ca; color: white; }
        .pin-input { width: 50px; height: 60px; text-align: center; font-size: 24px; font-weight: 800; border: 3px solid #e2e8f0; border-radius: 12px; margin: 0 5px; outline: none; transition: 0.3s; }
        .pin-input:focus { border-color: #4338ca; background: #f8fafc; }
        .slot-animation { animation: flash 0.1s infinite; }
        @keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media print { .no-print { display: none !important; } .print-only { display: block !important; } body { background: white; } }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect } = React;

        // --- SES FONKSİYONU (KORUNDU) ---
        const playRollSound = () => {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(220 + (Math.random() * 80), ctx.currentTime);
                gain.gain.setValueAtTime(0.04, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                osc.start(); osc.stop(ctx.currentTime + 0.1);
            } catch(e){}
        };

        function App() {
            // AUTH STATES
            const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('ap_user') || 'null'));
            const [pin, setPin] = useState("");

            // APP STATES
            const [page, setPage] = useState('dashboard');
            const [classes, setClasses] = useState(() => JSON.parse(localStorage.getItem('ap_v12_cls') || '[]'));
            const [selClass, setSelClass] = useState(null);
            const [students, setStudents] = useState([]);
            const [homeworks, setHomeworks] = useState([]);
            const [exams, setExams] = useState([]);
            const [drawnStudents, setDrawnStudents] = useState([]);
            const [isSpinning, setIsSpinning] = useState(false);
            const [winner, setWinner] = useState(null);
            const [currentFlashName, setCurrentFlashName] = useState("");
            const [detailStudent, setDetailStudent] = useState(null);

            useEffect(() => { localStorage.setItem('ap_v12_cls', JSON.stringify(classes)); }, [classes]);
            useEffect(() => { if(currentUser) localStorage.setItem('ap_user', JSON.stringify(currentUser)); else localStorage.removeItem('ap_user'); }, [currentUser]);

            useEffect(() => {
                if (selClass) {
                    setStudents(JSON.parse(localStorage.getItem(`s12_${selClass.id}`) || '[]'));
                    setHomeworks(JSON.parse(localStorage.getItem(`h12_${selClass.id}`) || '[]'));
                    setExams(JSON.parse(localStorage.getItem(`e12_${selClass.id}`) || '[]'));
                }
            }, [selClass]);

            // --- AUTH ACTIONS ---
            const handleLogin = (e) => {
                e.preventDefault();
                if(pin.length === 4) {
                    setCurrentUser({ id: pin, name: `Öğretmen (${pin})` });
                    setPin("");
                } else {
                    alert("Lütfen 4 haneli bir PIN giriniz.");
                }
            };

            const logout = () => {
                setCurrentUser(null);
                setSelClass(null);
                setPage('dashboard');
            };

            // --- DATA ACTIONS ---
            const saveData = (stds, hws, exms) => {
                if(stds) { setStudents(stds); localStorage.setItem(`s12_${selClass.id}`, JSON.stringify(stds)); }
                if(hws) { setHomeworks(hws); localStorage.setItem(`h12_${selClass.id}`, JSON.stringify(hws)); }
                if(exms) { setExams(exms); localStorage.setItem(`e12_${selClass.id}`, JSON.stringify(exms)); }
            };

            const addLog = (stdId, type, amount, reason) => {
                const updated = students.map(s => {
                    if(s.id === stdId) {
                        const newPuan = (Number(s.puan) || 0) + Number(amount);
                        return { ...s, puan: newPuan, logs: [{ date: new Date().toLocaleString('tr-TR'), type, amount: Number(amount), reason, currentTotal: newPuan }, ...(s.logs || [])] };
                    }
                    return s;
                });
                saveData(updated, null, null);
                if(detailStudent?.id === stdId) setDetailStudent(updated.find(x => x.id === stdId));
            };

            const bulkHw = (hwId, status) => {
                const hw = homeworks.find(h => h.id === hwId);
                const updatedStudents = students.map(s => {
                    const prev = hw.results?.[s.id] || 'none';
                    let diff = (status === 'done' ? 10 : status === 'partial' ? 5 : 0) - (prev === 'done' ? 10 : prev === 'partial' ? 5 : 0);
                    if(diff === 0) return s;
                    const newPuan = (Number(s.puan) || 0) + diff;
                    return { ...s, puan: newPuan, logs: [{date: new Date().toLocaleString('tr-TR'), type: 'ÖDEV', amount: diff, reason: hw.title, currentTotal: newPuan}, ...(s.logs || [])] };
                });
                const newHws = homeworks.map(h => h.id === hwId ? {...h, results: Object.fromEntries(students.map(s => [s.id, status]))} : h);
                setStudents(updatedStudents); setHomeworks(newHws);
                localStorage.setItem(`s12_${selClass.id}`, JSON.stringify(updatedStudents));
                localStorage.setItem(`h12_${selClass.id}`, JSON.stringify(newHws));
            };

            // --- CHART (YÜZDELİK MODEL - KORUNDU) ---
            const HybridChart = ({ stdId }) => {
                const width = 800; const height = 240; const padding = 40;
                const examPoints = exams.map((e, i) => {
                    const net = Number(e.results?.[stdId]?.net) || 0;
                    const qCount = Number(e.qCount) || 1;
                    const percentage = (net / qCount) * 100;
                    return { x: padding + (i * (width - 2 * padding) / (exams.length > 1 ? exams.length - 1 : 1)), y: height - padding - ((percentage / 100) * (height - 2 * padding)), val: percentage };
                });
                const std = students.find(s => s.id === stdId);
                const logs = [...(std?.logs || [])].reverse().slice(-10);
                const puanPoints = logs.map((l, i) => ({ x: padding + (i * (width - 2 * padding) / (logs.length > 1 ? logs.length - 1 : 1)), y: height - padding - ((l.currentTotal / 1000) * (height - 2 * padding)) }));

                return (
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#cbd5e1" strokeWidth="2" />
                        {puanPoints.length > 1 && <path d={`M ${puanPoints.map(p => `${p.x},${p.y}`).join(' L ')}`} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="6" />}
                        {examPoints.length > 1 && <path d={`M ${examPoints.map(p => `${p.x},${p.y}`).join(' L ')}`} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinejoin="round" />}
                        {examPoints.map((p, i) => (
                            <g key={i}><circle cx={p.x} cy={p.y} r="5" fill="#f59e0b" /><text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fontWeight="800" fill="#b45309">%{p.val.toFixed(0)}</text></g>
                        ))}
                    </svg>
                );
            };

            // --- RENDER LOGIN ---
            if (!currentUser) {
                return (
                    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
                        <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md w-full text-center">
                            <h1 className="text-4xl font-black italic uppercase mb-2">Asistan <span className="text-indigo-600">Pro</span></h1>
                            <p className="text-slate-400 font-bold text-xs uppercase mb-8 tracking-widest italic">Öğretmen Girişi</p>
                            
                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="flex justify-center mb-6">
                                    <input 
                                        type="password" 
                                        maxLength="4"
                                        placeholder="PIN"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="w-full bg-slate-100 border-none rounded-2xl p-5 text-center text-3xl font-black tracking-[1rem] focus:ring-4 focus:ring-indigo-200 outline-none"
                                    />
                                </div>
                                <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase text-sm shadow-xl hover:bg-indigo-500 transition-all">Sisteme Gir</button>
                            </form>
                            <p className="mt-8 text-[10px] text-slate-300 font-bold uppercase">4 Haneli Herhangi Bir PIN ile Kendi Alanınızı Oluşturun</p>
                        </div>
                    </div>
                );
            }

            // --- RENDER APP ---
            return (
                <div className="min-h-screen">
                    <nav className="bg-slate-900 text-white p-5 flex justify-between items-center no-print border-b-4 border-indigo-600">
                        <div className="flex items-center gap-4">
                            <h1 onClick={()=>{setPage('dashboard'); setSelClass(null)}} className="text-xl font-black cursor-pointer italic uppercase">Asistan <span className="text-indigo-400">Pro</span></h1>
                            {selClass && <span className="hidden md:inline bg-indigo-600 px-4 py-1 rounded-lg text-xs font-bold uppercase">{selClass.name}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-indigo-300 uppercase italic">{currentUser.name}</span>
                            <button onClick={logout} className="bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white px-4 py-1 rounded-lg text-[10px] font-black transition-all">ÇIKIŞ</button>
                        </div>
                    </nav>

                    <main className="p-6 max-w-7xl mx-auto">
                        {page === 'dashboard' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
                                <button onClick={()=>{const n=prompt("Sınıf Adı:"); if(n)setClasses([...classes,{id:Date.now(), name:n, owner: currentUser.id}])}} className="h-44 border-4 border-dashed border-slate-300 rounded-[2.5rem] font-black text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all uppercase">+ Yeni Sınıf</button>
                                
                                {classes.filter(c => c.owner === currentUser.id).map(c => (
                                    <div key={c.id} onClick={()=>{setSelClass(c); setPage('list')}} className="bg-white p-10 rounded-[2.5rem] shadow-xl border-b-8 border-indigo-600 hover:-translate-y-2 transition-all cursor-pointer relative group">
                                        <button onClick={(e)=>{e.stopPropagation(); if(confirm("Silinsin mi?")) setClasses(classes.filter(x=>x.id!==c.id))}} className="absolute top-5 right-5 text-red-200 group-hover:text-red-500 font-bold uppercase text-[10px]">Sil</button>
                                        <h3 className="text-3xl font-black text-slate-800 italic uppercase">{c.name}</h3>
                                        <p className="text-[9px] font-bold text-slate-300 mt-2">ID: {c.id}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selClass && (
                            <div className="space-y-6 no-print">
                                {/* SEKMELER (V12.4'TEN KORUNDU) */}
                                <div className="flex flex-wrap gap-2 p-2 bg-white rounded-2xl w-fit shadow-sm border mx-auto md:mx-0">
                                    {['list','hw','wheel','exam','stats','rank','reports'].map(t => (
                                        <button key={t} onClick={()=>setPage(t)} className={`tab-btn ${page===t?'active-tab':'text-slate-400 hover:bg-slate-50'}`}>{t==='list'?'Öğrenci':t==='hw'?'Ödev':t==='wheel'?'Kura': t==='exam'?'Sınav': t==='stats'?'Analiz':t==='rank'?'Skor':'Rapor'}</button>
                                    ))}
                                </div>

                                {page === 'list' && (
                                    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl">
                                        <div className="flex justify-between items-center mb-8 border-b pb-4"><h2 className="text-2xl font-black uppercase italic">Öğrenci Yönetimi</h2>
                                        <div className="flex gap-2">
                                            <button onClick={()=>{const n=prompt("İsim:"); if(n)saveData([...students,{id:Math.random(),name:n,puan:0,logs:[]}],null,null)}} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase italic">Tekil Ekle</button>
                                            <button onClick={()=>{const r=prompt("Liste:"); if(r)saveData(r.split('\n').filter(l=>l.trim()).map(l=>({id:Math.random(),name:l.trim(),puan:0,logs:[]})),null,null)}} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase italic">Toplu Ekle</button>
                                        </div></div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {students.map(s => <div key={s.id} className="p-4 bg-slate-50 rounded-xl border flex justify-between font-bold text-[10px] uppercase italic"><span>{s.name}</span><button onClick={()=>saveData(students.filter(x=>x.id!==s.id),null,null)} className="text-red-300 hover:text-red-600">×</button></div>)}
                                        </div>
                                    </div>
                                )}

                                {page === 'hw' && (
                                    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr>
                                                    <th className="text-left pb-4 font-black text-xs text-slate-400 italic">ÖĞRENCİ</th>
                                                    {homeworks.map(h => (
                                                        <th key={h.id} className="px-2">
                                                            <div className="flex flex-col items-center gap-1 mb-4">
                                                                <span className="text-[10px] font-black text-indigo-600 uppercase mb-2">{h.title}</span>
                                                                <div className="flex gap-1">
                                                                    <button onClick={()=>bulkHw(h.id, 'done')} className="text-[8px] bg-green-100 text-green-600 px-2 py-1 rounded font-bold uppercase">TAM</button>
                                                                    <button onClick={()=>bulkHw(h.id, 'partial')} className="text-[8px] bg-yellow-100 text-yellow-600 px-2 py-1 rounded font-bold uppercase">AZ</button>
                                                                    <button onClick={()=>bulkHw(h.id, 'none')} className="text-[8px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold uppercase">YOK</button>
                                                                </div>
                                                            </div>
                                                        </th>
                                                    ))}
                                                    <th><button onClick={()=>{const t=prompt("Konu:"); if(t)saveData(null,[...homeworks,{id:Date.now(),title:t,results:{}}],null)}} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-black">+</button></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students.map(s => (
                                                    <tr key={s.id} className="border-t hover:bg-slate-50">
                                                        <td className="py-3 text-xs font-bold uppercase italic">{s.name}</td>
                                                        {homeworks.map(h => (
                                                            <td key={h.id} className="text-center">
                                                                <div className="flex gap-1 justify-center">
                                                                    {['done','partial','none'].map(st => (
                                                                        <button key={st} onClick={()=>{
                                                                            const hw = homeworks.find(x => x.id === h.id);
                                                                            const prev = hw?.results?.[s.id] || 'none';
                                                                            let diff = (st === 'done' ? 10 : st === 'partial' ? 5 : 0) - (prev === 'done' ? 10 : prev === 'partial' ? 5 : 0);
                                                                            if(diff !== 0) addLog(s.id, 'ÖDEV', diff, hw.title);
                                                                            saveData(null, homeworks.map(x=>x.id===h.id?{...x,results:{...x.results,[s.id]:st}}:x), null);
                                                                        }} className={`px-2 py-1 rounded-lg text-[8px] font-black ${h.results?.[s.id]===st ? (st==='done'?'bg-green-500':st==='partial'?'bg-yellow-500':'bg-red-500')+' text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                                            {st==='done'?'TAM':st==='partial'?'AZ':'YOK'}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {page === 'wheel' && (
                                    <div className="bg-slate-900 rounded-[4rem] p-10 text-center shadow-2xl min-h-[500px] flex flex-col justify-center">
                                        <h2 className="text-indigo-400 font-black uppercase mb-10 italic tracking-widest text-sm">Şans Çarkı / Kura</h2>
                                        <div className="h-40 flex items-center justify-center mb-10 text-white">
                                            {isSpinning ? <div className="text-6xl font-black slot-animation uppercase italic">{currentFlashName}</div> : 
                                            winner ? <div className="text-7xl font-black text-yellow-400 animate-bounce uppercase italic">{winner.name}</div> : 
                                            <div className="text-3xl font-black text-slate-700 italic uppercase">Hazır Bekliyor</div>}
                                        </div>
                                        <div className="flex gap-4 justify-center flex-wrap">
                                            <button onClick={()=>{
                                                const avail = students.filter(s => !drawnStudents.includes(s.id));
                                                if(!avail.length) return alert("Bitti!");
                                                setIsSpinning(true); setWinner(null);
                                                let c = 0;
                                                const itv = setInterval(()=>{
                                                    playRollSound();
                                                    setCurrentFlashName(avail[Math.floor(Math.random()*avail.length)].name);
                                                    c++; if(c>25){ clearInterval(itv); const w=avail[Math.floor(Math.random()*avail.length)]; setWinner(w); setDrawnStudents([...drawnStudents, w.id]); setIsSpinning(false); }
                                                }, 80);
                                            }} disabled={isSpinning} className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-5 rounded-3xl font-black text-2xl italic uppercase shadow-xl transition-all">ÇEK!</button>
                                            <button onClick={()=>setDrawnStudents([])} className="bg-slate-800 text-white px-6 py-5 rounded-3xl font-black text-xs uppercase italic hover:bg-slate-700">Sıfırla</button>
                                        </div>
                                        {winner && (
                                            <div className="mt-12 flex justify-center flex-wrap gap-2 animate-in zoom-in">
                                                {[-5,-4,-3,-2,-1,1,2,3,4,5].map(v => (
                                                    <button key={v} onClick={()=>addLog(winner.id, 'KURA', v, 'Kura Ödülü')} className={`w-10 h-10 rounded-xl font-black text-white transition-all hover:scale-110 ${v>0?'bg-emerald-500':'bg-rose-500'}`}>{v>0?`+${v}`:v}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {page === 'exam' && (
                                    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl">
                                        <div className="flex justify-between items-center mb-8 border-b pb-4"><h2 className="text-2xl font-black uppercase italic">Deneme Sınavları</h2>
                                        <button onClick={()=>{const t=prompt("Başlık:"); const q=prompt("Soru:"); if(t&&q)saveData(null,null,[...exams,{id:Date.now(),title:t,qCount:Number(q),results:{}}])}} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase italic hover:bg-indigo-500">+ Yeni Deneme</button></div>
                                        <div className="space-y-6">
                                            {exams.map(e => (
                                                <div key={e.id} className="p-6 bg-slate-50 rounded-[2rem] border relative group">
                                                    <button onClick={()=>saveData(null,null,exams.filter(ex=>ex.id!==e.id))} className="absolute top-4 right-4 text-red-300 opacity-0 group-hover:opacity-100 transition-all font-bold">SİL</button>
                                                    <h3 className="font-black text-indigo-700 mb-4 uppercase italic">{e.title} <span className="text-slate-400 ml-2">({e.qCount} Soru)</span></h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                                        {students.map(s => (
                                                            <div key={s.id} className="bg-white p-3 rounded-xl border flex flex-col gap-2">
                                                                <span className="font-bold text-[10px] uppercase italic truncate">{s.name}</span>
                                                                <div className="flex gap-2">
                                                                    <input type="number" placeholder="D" className="w-full p-2 border rounded-lg font-bold text-center text-xs focus:ring-2 focus:ring-indigo-500 outline-none" defaultValue={e.results?.[s.id]?.d} onBlur={(ev)=>{
                                                                        const d = Number(ev.target.value) || 0;
                                                                        const y = Number(e.results?.[s.id]?.y) || 0;
                                                                        saveData(null,null,exams.map(ex=>ex.id===e.id?{...ex,results:{...ex.results,[s.id]:{d,y,net:d-(y/3)}}}:ex));
                                                                    }} />
                                                                    <input type="number" placeholder="Y" className="w-full p-2 border rounded-lg font-bold text-center text-xs focus:ring-2 focus:ring-indigo-500 outline-none" defaultValue={e.results?.[s.id]?.y} onBlur={(ev)=>{
                                                                        const d = Number(e.results?.[s.id]?.d) || 0;
                                                                        const y = Number(ev.target.value) || 0;
                                                                        saveData(null,null,exams.map(ex=>ex.id===e.id?{...ex,results:{...ex.results,[s.id]:{d,y,net:d-(y/3)}}}:ex));
                                                                    }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {page === 'stats' && (
                                    <div className="space-y-4">
                                        <h2 className="text-center font-black text-3xl uppercase italic mb-6">📉 Başarı Analizi</h2>
                                        {students.map(s => {
                                            const st = exams.map(e => e.results?.[s.id]).filter(r => r);
                                            const avg = st.length ? (st.reduce((a,b)=>a+b.net,0)/st.length).toFixed(2) : "0.00";
                                            return (
                                                <div key={s.id} onClick={()=>setDetailStudent(s)} className="bg-white p-6 rounded-[2rem] shadow-xl flex justify-between items-center border-l-[12px] border-indigo-600 cursor-pointer hover:bg-slate-50 transition-all">
                                                    <span className="text-xl font-black uppercase italic text-slate-700">{s.name}</span>
                                                    <div className="bg-indigo-50 px-6 py-2 rounded-2xl text-center"><p className="text-[9px] font-black text-slate-400 uppercase italic">Ortalama Net</p><p className="text-xl font-black text-indigo-600 italic">{avg}</p></div>
                                                </div>
                                            );
                                        }).sort((a,b)=> {
                                            const rA = exams.map(e => e.results?.[a.id]).filter(r => r);
                                            const rB = exams.map(e => e.results?.[b.id]).filter(r => r);
                                            const avgA = rA.length ? rA.reduce((x,y)=>x+y.net,0)/rA.length : 0;
                                            const avgB = rB.length ? rB.reduce((x,y)=>x+y.net,0)/rB.length : 0;
                                            return avgB - avgA;
                                        })}
                                    </div>
                                )}

                                {page === 'rank' && (
                                    <div className="max-w-4xl mx-auto space-y-4 pt-10">
                                        <h2 className="text-center font-black text-4xl uppercase italic mb-10 tracking-tighter text-slate-800">🏆 Liderlik Tablosu</h2>
                                        {students.sort((a,b)=>b.puan-a.puan).map((s,i) => (
                                            <div key={s.id} onClick={()=>setDetailStudent(s)} className="bg-white p-8 rounded-[2.5rem] shadow-xl flex justify-between items-center border-l-[16px] border-indigo-600 cursor-pointer hover:scale-[1.02] transition-all">
                                                <div className="flex items-center gap-8"><span className="text-5xl font-black text-slate-100 italic">#{i+1}</span><h3 className="text-xl font-black text-slate-700 uppercase italic">{s.name}</h3></div>
                                                <div className="text-3xl font-black text-indigo-600 bg-indigo-50 px-10 py-4 rounded-3xl italic">{s.puan || 0} P</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {page === 'reports' && (
                                    <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl text-center">
                                        <h2 className="text-3xl font-black uppercase italic mb-8">Veli Bilgilendirme Kartları</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {students.map(s => (
                                                <div key={s.id} className="p-6 border-2 border-slate-100 rounded-3xl flex justify-between items-center hover:bg-slate-50 transition-all">
                                                    <h3 className="text-lg font-black uppercase italic text-slate-600">{s.name}</h3>
                                                    <button onClick={()=>{setDetailStudent(s); setTimeout(()=>window.print(), 500)}} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black italic uppercase text-[10px] shadow-lg">Rapor Hazırla</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {detailStudent && (
                            <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={()=>setDetailStudent(null)}>
                                <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl relative" onClick={e=>e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-6 no-print border-b pb-4">
                                        <h2 className="text-3xl font-black italic uppercase text-slate-800">{detailStudent.name} <span className="text-indigo-600">Gelişim Karnesi</span></h2>
                                        <button onClick={()=>setDetailStudent(null)} className="text-slate-300 hover:text-red-500 text-4xl transition-colors">×</button>
                                    </div>
                                    <div className="mb-8 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex gap-4 text-[9px] font-black uppercase italic">
                                                <span className="flex items-center gap-1 text-emerald-500"><div className="w-4 h-1 bg-emerald-500 border-dashed"></div> Puan Trendi</span>
                                                <span className="flex items-center gap-1 text-orange-500"><div className="w-4 h-1 bg-orange-500"></div> Başarı Yüzdesi (%)</span>
                                            </div>
                                        </div>
                                        <HybridChart stdId={detailStudent.id} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                        <div className="p-6 bg-slate-900 text-white rounded-[2rem] text-center shadow-lg"><p className="text-[10px] font-bold opacity-50 uppercase mb-1 italic">GÜNCEL PUAN</p><p className="text-4xl font-black italic">{detailStudent.puan} P</p></div>
                                        <div className="p-4 no-print flex gap-2 bg-indigo-50 rounded-[2rem]">
                                            <input id="mPuan" type="number" className="w-full bg-white border-2 border-indigo-100 rounded-2xl p-4 text-center font-black text-xl outline-none focus:border-indigo-500 transition-all" placeholder="+ / -" />
                                            <button onClick={()=>{const v=document.getElementById('mPuan').value; if(v)addLog(detailStudent.id,'MANUEL',v,'Giriş')}} className="bg-indigo-600 text-white px-8 rounded-2xl font-black italic uppercase shadow-lg hover:bg-indigo-500 transition-all">EKLE</button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-8">
                                        <div><h4 className="text-[11px] font-black uppercase text-indigo-600 italic mb-4">🏆 Puan Hareketleri</h4>
                                            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                {(detailStudent.logs || []).map((l,i)=><div key={i} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-xl text-[10px] font-bold uppercase italic border border-transparent hover:border-indigo-100"><div><span className="text-slate-400 block text-[8px] font-normal">{l.date}</span>{l.reason}</div><span className={l.amount>0?'text-emerald-500':'text-red-500'}>{l.amount>0?`+${l.amount}`:l.amount} P</span></div>)}
                                            </div>
                                        </div>
                                        <div><h4 className="text-[11px] font-black uppercase text-indigo-600 italic mb-4">📊 Deneme Performansı</h4>
                                            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                                {exams.map(e=>(
                                                    <div key={e.id} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-xl text-[10px] font-bold uppercase italic">
                                                        <span>{e.title}</span><div className="text-right"><span className="text-slate-900 block">{(e.results?.[detailStudent.id]?.net || 0).toFixed(2)} Net</span><span className="text-orange-500 text-[8px]">%{((e.results?.[detailStudent.id]?.net / e.qCount)*100 || 0).toFixed(0)}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 text-center print-only hidden border-t pt-4 opacity-40 text-[9px] font-black uppercase italic">Asistan Pro V12.5 Akademik İzleme Raporu</div>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>
