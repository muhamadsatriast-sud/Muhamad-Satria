
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  TableCellsIcon,
  ChartBarIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  FunnelIcon,
  CubeIcon,
  WrenchScrewdriverIcon,
  TagIcon,
  QueueListIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, LabelList
} from 'recharts';
import { MaintenanceRecord } from './types';

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1LAOuNQ3voO8X_y1fZzKj_oKsNZgLnvSnORS2sMa0dNY/export?format=csv&gid=0';

const App: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string>('');
  const [filterText, setFilterText] = useState('');
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'DATABASE'>('DASHBOARD');

  const isEmpty = (v: string) => {
    const val = v?.trim().toLowerCase() || '';
    return val === '' || val === '-' || val === '0' || val === 'null';
  };

  const parseCSV = (text: string) => {
    const rows: string[][] = [];
    let currentField = '';
    let insideQuotes = false;
    let currentRow: string[] = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (insideQuotes && text[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentField);
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !insideQuotes) {
        if (currentRow.length > 0 || currentField !== '') {
          currentRow.push(currentField);
          rows.push(currentRow);
          currentRow = [];
          currentField = '';
        }
        if (char === '\r' && text[i + 1] === '\n') i++;
      } else {
        currentField += char;
      }
    }
    if (currentRow.length > 0 || currentField !== '') {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    return rows.slice(1)
      .filter(cells => cells[1] && cells[1].trim() !== '')
      .map((cells, idx) => ({
        id: `row-${idx + 2}`,
        roomName: cells[0]?.trim() || 'Tanpa Ruangan',
        itemName: cells[1]?.trim() || '',
        complaintType: cells[2]?.trim() || '',
        complaintDate: cells[3]?.trim() || '',
        status: cells[4]?.trim() || '',
        repairDate: cells[5]?.trim() || '',
        obstaclesHeader: cells[6]?.trim() || '',
        obstaclesMain: cells[7]?.trim() || '',
        technicianNotes: cells[8]?.trim() || ''
      }));
  };

  const syncWithSheet = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${GOOGLE_SHEET_CSV_URL}&t=${Date.now()}`);
      const csvData = await response.text();
      const parsed = parseCSV(csvData);
      setRecords(parsed);
      setLastSync(new Date().toLocaleTimeString('id-ID'));
    } catch (error) {
      console.error('Error Sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => { syncWithSheet(); }, []);

  const stats = useMemo(() => {
    const total = records.length;
    const completed = records.filter(r => !isEmpty(r.repairDate)).length;
    const kpiPendingRecords = records.filter(r => isEmpty(r.repairDate) && isEmpty(r.obstaclesMain));
    const kpiPendingCount = kpiPendingRecords.length;
    const unfinishedRecords = records.filter(r => isEmpty(r.repairDate));
    const withObstacles = records.filter(r => !isEmpty(r.obstaclesMain)).length;

    // 1. Top Items (Kolom B - Seluruh Data)
    const itemMap: Record<string, number> = {};
    records.forEach(r => { 
      if (r.itemName) itemMap[r.itemName] = (itemMap[r.itemName] || 0) + 1; 
    });
    const topItems = Object.entries(itemMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 2. Distribusi Masalah SELURUHNYA (Kolom C)
    const allComplaintsMap: Record<string, number> = {};
    records.forEach(r => {
      if (r.complaintType && r.complaintType !== '-') {
        allComplaintsMap[r.complaintType] = (allComplaintsMap[r.complaintType] || 0) + 1;
      }
    });
    const topAllComplaints = Object.entries(allComplaintsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 3. Top Masalah BELUM SELESAI (Kolom C jika F Kosong)
    const unfinishedComplaintMap: Record<string, number> = {};
    unfinishedRecords.forEach(r => {
      if (r.complaintType && r.complaintType !== '-') {
        unfinishedComplaintMap[r.complaintType] = (unfinishedComplaintMap[r.complaintType] || 0) + 1;
      }
    });
    const topUnfinishedComplaints = Object.entries(unfinishedComplaintMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 4. Hambatan (Kolom H)
    const obstacleMap: Record<string, number> = {};
    records.forEach(r => {
      const h = r.obstaclesMain.trim();
      if (h !== '' && h !== '-') obstacleMap[h] = (obstacleMap[h] || 0) + 1;
    });
    const obstacleData = Object.entries(obstacleMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { 
      total, 
      completed, 
      kpiPendingCount, 
      withObstacles, 
      topItems, 
      topAllComplaints,
      topUnfinishedComplaints, 
      obstacleData, 
      kpiPendingRecords 
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!filterText) return records;
    const lower = filterText.toLowerCase();
    return records.filter(r => 
      Object.values(r).some(v => v.toString().toLowerCase().includes(lower))
    );
  }, [records, filterText]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex font-sans overflow-hidden text-slate-900">
      <aside className="w-20 lg:w-72 bg-slate-900 flex flex-col transition-all duration-300 z-30 shadow-2xl">
        <div className="p-8 flex items-center gap-4">
          <div className="bg-indigo-500 p-2.5 rounded-2xl shadow-lg">
            <WrenchScrewdriverIcon className="h-7 w-7 text-white" />
          </div>
          <div className="hidden lg:block overflow-hidden">
            <h1 className="text-xl font-black text-white tracking-tight">MedFix <span className="text-indigo-400">IPSRS</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-widest">Analytics</p>
          </div>
        </div>
        <nav className="flex-1 px-4 mt-8 space-y-2">
          <button onClick={() => setActiveTab('DASHBOARD')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === 'DASHBOARD' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
            <ChartBarIcon className="h-6 w-6 shrink-0" />
            <span className="hidden lg:block font-bold text-sm">Dashboard</span>
          </button>
          <button onClick={() => setActiveTab('DATABASE')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === 'DATABASE' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'}`}>
            <TableCellsIcon className="h-6 w-6 shrink-0" />
            <span className="hidden lg:block font-bold text-sm">Data Sheet</span>
          </button>
        </nav>
        <div className="p-6 border-t border-slate-800">
           <button onClick={syncWithSheet} disabled={isSyncing} className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 p-4 rounded-2xl text-indigo-400 transition-all disabled:opacity-50">
              <ArrowPathIcon className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:block font-bold text-xs uppercase tracking-widest">Update</span>
           </button>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto bg-slate-50/50 scroll-smooth">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-10 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{activeTab === 'DASHBOARD' ? 'Visualisasi Kinerja IPSRS' : 'Log Lengkap Temuan'}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{records.length} Row Terintegrasi</p>
          </div>
          <div className="relative hidden md:block">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari..." className="pl-12 pr-6 py-3 bg-slate-100 border-none rounded-2xl text-xs font-bold w-80 shadow-inner" value={filterText} onChange={(e) => setFilterText(e.target.value)} />
          </div>
        </header>

        <div className="p-10 space-y-10 max-w-[1800px] mx-auto">
          {activeTab === 'DASHBOARD' ? (
            <div className="space-y-10 animate-in fade-in duration-700">
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { label: 'Total Temuan', value: stats.total, sub: 'Log (B)', icon: CubeIcon, bg: 'bg-indigo-600' },
                  { label: 'Belum Selesai', value: stats.kpiPendingCount, sub: 'F & H Kosong', icon: ClockIcon, bg: 'bg-amber-500' },
                  { label: 'Ada Hambatan', value: stats.withObstacles, sub: 'Log (H)', icon: ExclamationCircleIcon, bg: 'bg-rose-500' },
                  { label: 'Done', value: stats.completed, sub: 'Log (F)', icon: CheckCircleIcon, bg: 'bg-emerald-500' },
                ].map((s, i) => (
                  <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm hover:shadow-xl transition-all">
                    <div className={`${s.bg} w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg`}><s.icon className="h-7 w-7 text-white" /></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                    <div className="flex items-baseline gap-2">
                       <p className="text-4xl font-black text-slate-800 tracking-tighter">{s.value}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Main Visualization Grid - NOW 3 COLUMNS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* 1. Item Paling Sering Rusak (B) */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm flex flex-col">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                         <CubeIcon className="h-5 w-5 text-indigo-500" />
                         <h3 className="text-sm font-black text-slate-800">Top Item Rusak (B)</h3>
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase">Total Data</span>
                   </div>
                   <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topItems} layout="vertical" margin={{ left: -10, right: 30 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#64748b'}} width={120} />
                          <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={20}>
                            <LabelList dataKey="count" position="right" style={{ fill: '#64748b', fontSize: '9px', fontWeight: 800 }} offset={8} />
                            {stats.topItems.map((_, index) => <Cell key={index} fill={index === 0 ? '#4f46e5' : '#818cf8'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                {/* 2. Top 10 Masalah (C) - ALL DATA */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm flex flex-col">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                         <ListBulletIcon className="h-5 w-5 text-indigo-500" />
                         <h3 className="text-sm font-black text-slate-800">Top 10 Masalah (C)</h3>
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md uppercase">Seluruh Data</span>
                   </div>
                   <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topAllComplaints} layout="vertical" margin={{ left: -10, right: 30 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#64748b'}} width={120} />
                          <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={20}>
                            <LabelList dataKey="count" position="right" style={{ fill: '#64748b', fontSize: '9px', fontWeight: 800 }} offset={8} />
                            {stats.topAllComplaints.map((_, index) => <Cell key={index} fill={index === 0 ? '#6366f1' : '#a5b4fc'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                {/* 3. Masalah Belum Selesai (C jika F kosong) */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-200/60 shadow-sm flex flex-col">
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                         <QueueListIcon className="h-5 w-5 text-amber-500" />
                         <h3 className="text-sm font-black text-slate-800">Belum Selesai (C)</h3>
                      </div>
                      <span className="text-[8px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md uppercase border border-amber-100">F KOSONG</span>
                   </div>
                   <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.topUnfinishedComplaints} layout="vertical" margin={{ left: -10, right: 30 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#64748b'}} width={120} />
                          <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={20}>
                            <LabelList dataKey="count" position="right" style={{ fill: '#d97706', fontSize: '9px', fontWeight: 800 }} offset={8} />
                            {stats.topUnfinishedComplaints.map((_, index) => <Cell key={index} fill={index === 0 ? '#f59e0b' : '#fbbf24'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="bg-slate-900 rounded-[52px] p-10 text-white shadow-2xl flex flex-col">
                   <div className="flex items-center gap-3 mb-10">
                      <FunnelIcon className="h-7 w-7 text-indigo-400" />
                      <h3 className="text-xl font-black italic">Kendala Dominan (H)</h3>
                   </div>
                   <div className="space-y-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {stats.obstacleData.map((obs, i) => (
                        <div key={i} className="space-y-3">
                           <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                              <span className="truncate pr-4">{obs.name}</span>
                              <span className="text-indigo-400">{obs.count}</span>
                           </div>
                           <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 transition-all duration-1000" style={{width: `${(obs.count / (stats.total || 1)) * 100}%`}}></div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="lg:col-span-2 bg-white p-10 rounded-[48px] border border-slate-200/60 shadow-sm">
                   <div className="flex items-center justify-between mb-10">
                      <h3 className="text-xl font-black text-slate-800">Preview Antrian Baru</h3>
                      <span className="bg-amber-50 text-amber-600 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">{stats.kpiPendingCount} ANTRIAN</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {stats.kpiPendingRecords.slice(0, 4).map((r, i) => (
                        <div key={i} className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 border-l-4 border-l-amber-400 transition-all hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5">
                           <p className="text-[9px] font-black text-indigo-600 mb-2 uppercase">{r.roomName}</p>
                           <h4 className="font-black text-slate-800 text-sm mb-1">{r.itemName}</h4>
                           <p className="text-[11px] font-bold text-slate-500 italic mb-4">"{r.complaintType}"</p>
                           <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div><span className="text-[9px] font-black uppercase text-amber-600">Pending</span></div>
                              <span className="text-[9px] font-bold text-slate-400">{r.complaintDate}</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          ) : (
            /* DATABASE VIEW */
            <div className="bg-white rounded-[48px] shadow-sm border border-slate-200/60 overflow-hidden animate-in fade-in duration-500">
              <div className="p-10 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
                 <div className="bg-indigo-600 p-2.5 rounded-2xl text-white"><TableCellsIcon className="h-6 w-6" /></div>
                 <div>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">Master Data Temuan IPSRS</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Integrasi Google Sheet Real-time</span>
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1500px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ruangan</th>
                      <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item</th>
                      <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-widest">Komplain</th>
                      <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lapor</th>
                      <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-widest">Selesai</th>
                      <th className="px-8 py-7 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hambatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-indigo-50/30 transition-all">
                        <td className="px-8 py-7 text-xs font-black text-indigo-600 uppercase">{r.roomName}</td>
                        <td className="px-8 py-7 text-sm font-black text-slate-800">{r.itemName}</td>
                        <td className="px-8 py-7 text-xs font-bold text-slate-500 max-w-sm"><p className="line-clamp-2">{r.complaintType}</p></td>
                        <td className="px-8 py-7 text-xs font-bold text-slate-400">{r.complaintDate}</td>
                        <td className="px-8 py-7">
                           {isEmpty(r.repairDate) ? (
                             <span className="flex items-center gap-2 text-[10px] font-black text-amber-500 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 uppercase tracking-widest">
                               <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>Pending
                             </span>
                           ) : (
                             <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 bg-emerald-50 text-emerald-600">{r.repairDate}</span>
                           )}
                        </td>
                        <td className="px-8 py-7 text-[10px] font-black text-rose-500">{r.obstaclesMain && r.obstaclesMain !== '-' ? r.obstaclesMain : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
