import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
// import { ThemeContext } from '../contexts/ThemeProvider';
import { motion } from 'framer-motion';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import {
  Menu, X, Moon, Sun, FileText, Bell, Wifi, Clock, User,
  BarChart, IndianRupee, CreditCard, Calendar, MessageSquare,
  Truck, Calculator, DownloadCloud, ArrowUp, AlertTriangle, Receipt
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { AuthDebug } from '@/components/AuthDebug';

const emptyData = {
  email: null,
  ip: null,
  returnsFiled: null,
  pendingReturns: null,
  totalTaxPaid: null,
  inputTaxCredit: null,
  announcements: [],
  activities: [],
  lastLogin: null,
};

const Dashboard = () => {
  const { user: currentUser, signOut: logout } = useAuth();
  const lastLogin = null;
  const profile = null;
  const setUsername = () => {};

  // const { theme, toggleTheme } = useContext(ThemeContext);
  const theme = 'light';
  const toggleTheme = () => {};

  const navigate = useNavigate();
  const location = useLocation();

  const [now, setNow] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [data, setData] = useState(emptyData);
  const [manageOpen, setManageOpen] = useState(false);

  // load data from Supabase on mount
  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      const { data: dashboardData, error: dashboardError } = await supabase
        .from('user_dashboard')
        .select('*')
        .maybeSingle();

      if (dashboardError && dashboardError.code !== 'PGRST116') {
        console.error('Error fetching dashboard data:', dashboardError);
      }

      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*');

      if (announcementsError) {
        console.error('Error fetching announcements:', announcementsError);
      }

      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*');

      if (activitiesError) {
        console.error('Error fetching activities:', activitiesError);
      }

      setData({
        ...emptyData,
        ...(dashboardData || {}),
        announcements: announcementsData || [],
        activities: activitiesData || [],
        email: currentUser.email || null,
      });
    };

    fetchData();
  }, [currentUser]);

  // Clock (Time)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Small helpers
  const show = (val) => (val === null || val === undefined || val === '' ? '—' : val);

  const saveData = async (next) => {
    if (!currentUser) return;

    const { announcements, activities, ...dashboardData } = { ...data, ...next };

    const { error: dashboardError } = await supabase
      .from('user_dashboard')
      .upsert({ ...dashboardData, user_id: currentUser.id }, { onConflict: 'user_id' });

    if (dashboardError) {
      console.error('Error saving dashboard data:', dashboardError);
    }

    // For simplicity, we'll just replace announcements and activities
    if (next.announcements) {
      await supabase.from('announcements').delete().eq('user_id', currentUser.id);
      const { error } = await supabase.from('announcements').insert(next.announcements.map(a => ({...a, user_id: currentUser.id})));
      if (error) console.error('Error saving announcements:', error);
    }
    if (next.activities) {
      await supabase.from('activities').delete().eq('user_id', currentUser.id);
      const { error } = await supabase.from('activities').insert(next.activities.map(a => ({...a, user_id: currentUser.id})));
      if (error) console.error('Error saving activities:', error);
    }


    setData({ ...data, ...next });
  };

  // Reset demo data (for dev)
  const resetData = async () => {
    if (!currentUser) return;
    await supabase.from('user_dashboard').delete().eq('user_id', currentUser.id);
    await supabase.from('announcements').delete().eq('user_id', currentUser.id);
    await supabase.from('activities').delete().eq('user_id', currentUser.id);
    setData(emptyData);
  };

  const handleLogout = async () => {
    await logout?.();
    navigate('/login');
  };

  // Modal form local state
  const [form, setForm] = useState({
    returnsFiled: '',
    pendingReturns: '',
    totalTaxPaid: '',
    inputTaxCredit: '',
    ip: '',
    announcementText: '',
    announcementDate: '',
    activityTitle: '',
    activityTime: '',
  });

  const addAnnouncement = () => {
    if (!form.announcementText) return;
    const newAnnouncements = [
      ...(data.announcements || []),
      { text: form.announcementText, date: form.announcementDate || new Date().toISOString(), link: '#' },
    ];
    saveData({ announcements: newAnnouncements });
    setForm((f) => ({ ...f, announcementText: '', announcementDate: '' }));
  };

  const addActivity = () => {
    if (!form.activityTitle) return;
    const newActivities = [
      ...(data.activities || []),
      { title: form.activityTitle, time: form.activityTime || new Date().toISOString(), status: 'info' },
    ];
    saveData({ activities: newActivities });
    setForm((f) => ({ ...f, activityTitle: '', activityTime: '' }));
  };

  const submitStats = (e) => {
    e.preventDefault();
    saveData({
      returnsFiled: form.returnsFiled ? Number(form.returnsFiled) : null,
      pendingReturns: form.pendingReturns ? Number(form.pendingReturns) : null,
      totalTaxPaid: form.totalTaxPaid ? form.totalTaxPaid.toString() : null,
      inputTaxCredit: form.inputTaxCredit ? form.inputTaxCredit.toString() : null,
      ip: form.ip || null,
      lastLogin: data.lastLogin || lastLogin || null,
    });
    setManageOpen(false);
  };

  // Animation presets
  const container = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const item = { hidden: { y: 10, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors flex">
      <AuthDebug />
      {/* Sidebar (kept simple) */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="bg-white dark:bg-gray-800 w-72 fixed inset-y-0 left-0 z-30 shadow-lg overflow-auto"
        aria-hidden={!sidebarOpen}
      >
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#2B3E85] text-white w-10 h-10 flex items-center justify-center font-bold">♻</div>
            <div>
              <div className="font-semibold">{profile?.username || currentUser?.user_metadata?.full_name || currentUser?.email || 'User'}</div>
              <div className="text-sm text-gray-500">{data.email || '—'}</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <X />
          </button>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => navigate('/returns')}
                className={`flex items-center gap-2 w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${location.pathname.startsWith('/returns') ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
              >
                <FileText /> <span>Return Dashboard</span>
              </button>
            </li>
            <li>
              <button onClick={() => navigate('/challan')} className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                <Bell /> <span>Create Challan</span>
              </button>
            </li>
          </ul>
        </nav>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col ml-0 md:ml-0">
        <header className="bg-[#2B3E85] text-white sticky top-0 z-20">
          <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} aria-label="Open sidebar" className="p-2 rounded-md hover:bg-white/10">
                <Menu />
              </button>
              <div className="flex items-center gap-3">
                <img src="/favicon.svg" alt="" className="w-9 h-9" />
                <div>
                  <div className="font-semibold">GST Management</div>
                  <div className="text-sm">Portal</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 font-medium px-3 py-1 rounded-md hover:bg-white/10">
                  Services
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[12rem]">
                  <DropdownMenuItem onClick={() => navigate('/ledger')}>Ledger</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/returns')}>Return Dashboard</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button onClick={() => navigate('/search')} className="flex items-center gap-2 font-medium"> <FileText /> Search</button>
              <button onClick={toggleTheme} className="p-2 rounded-md" aria-label="Toggle theme">{theme === 'light' ? <Moon /> : <Sun />}</button>
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md">Logout</button>
            </div>
          </div>
        </header>

        <main className="max-w-[1200px] mx-auto px-4 py-6 w-full">
          <motion.section className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow" initial="hidden" animate="visible" variants={container}>
            <motion.div className="flex items-center justify-between" variants={item}>
              <div>
                <h1 className="text-2xl font-semibold">Welcome, {profile?.username || currentUser?.user_metadata?.full_name || currentUser?.email || 'User'}</h1>
                <p className="text-sm text-gray-500">to the GST portal</p>
              </div>

              <div className="flex items-end gap-3">
                <div className="text-right">
                  <div className="text-sm">{now.toLocaleDateString()}</div>
                  <div className="text-lg font-medium">{now.toLocaleTimeString()}</div>
                </div>

                {/* Manage data button (demo admin) */}
                <button
                  onClick={() => setManageOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md"
                >
                  Manage Data
                </button>
              </div>
            </motion.div>

            {/* stats: only show values when present; otherwise show placeholder */}
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6" variants={item}>
              <div className="p-4 rounded-lg bg-blue-600 text-white flex flex-col items-start">
                <User />
                <div className="mt-2 text-sm">User Email</div>
                <div className="font-bold">{show(data.email)}</div>
              </div>

              <div className="p-4 rounded-lg bg-green-600 text-white flex flex-col items-start">
                <Wifi />
                <div className="mt-2 text-sm">Current IP</div>
                <div className="font-bold">{show(data.ip)}</div>
              </div>

              <div className="p-4 rounded-lg bg-purple-600 text-white flex flex-col items-start">
                <Clock />
                <div className="mt-2 text-sm">Current Time</div>
                <div className="font-bold">{now.toLocaleTimeString()}</div>
              </div>

              <div className="p-4 rounded-lg bg-orange-500 text-white flex flex-col items-start">
                <BarChart />
                <div className="mt-2 text-sm">Account Status</div>
                <div className="font-bold">Active</div>
              </div>
            </motion.div>

            {/* quick stats (conditionally rendered) */}
            <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6" variants={item}>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow">
                <div className="text-sm text-gray-500">Total Returns Filed</div>
                <div className="text-2xl font-bold">{show(data.returnsFiled)}</div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow">
                <div className="text-sm text-gray-500">Pending Returns</div>
                <div className="text-2xl font-bold">{show(data.pendingReturns)}</div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow">
                <div className="text-sm text-gray-500">Total Tax Paid</div>
                <div className="text-2xl font-bold">{show(data.totalTaxPaid)}</div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow">
                <div className="text-sm text-gray-500">Input Tax Credit</div>
                <div className="text-2xl font-bold">{show(data.inputTaxCredit)}</div>
              </div>
            </motion.div>

            {/* activity + announcements: only render actual arrays; otherwise short message */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
              <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-lg p-4 shadow">
                <h3 className="font-semibold mb-2">Recent Activity</h3>

                {Array.isArray(data.activities) && data.activities.length > 0 ? (
                  <ul className="space-y-3 max-h-64 overflow-auto">
                    {data.activities.map((a) => (
                      <li key={a.id} className="flex items-start gap-3">
                        <Receipt className="mt-1" />
                        <div>
                          <div className="text-sm">{a.title}</div>
                          <div className="text-xs text-gray-500">{new Date(a.time).toLocaleString()}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-500">No activity recorded. Add activity from Manage Data.</div>
                )}

                <div className="mt-3">
                  <button onClick={() => navigate('/activities')} className="text-blue-600">View all</button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow">
                <h3 className="font-semibold mb-2">Announcements</h3>

                {Array.isArray(data.announcements) && data.announcements.length > 0 ? (
                  <>
                    <div className="flex items-start gap-3">
                      <MessageSquare />
                      <div>
                        <div className="text-sm">{data.announcements[0].text}</div>
                        <div className="text-xs text-gray-500">{new Date(data.announcements[0].date).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">No announcements. Add an announcement via Manage Data.</div>
                )}

                <div className="mt-4">
                  <h4 className="font-semibold">Upcoming Deadlines</h4>
                  <ul className="text-sm text-gray-600 mt-2">
                    <li className="flex items-center gap-2"><Calendar className="h-4" /> GST Filing - Sep 30, 2025</li>
                    <li className="flex items-center gap-2 mt-1"><Calendar className="h-4" /> Tax Payment - Oct 15, 2025</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-500">Last login: {data.lastLogin ? new Date(data.lastLogin).toLocaleString() : (lastLogin ? new Date(lastLogin).toLocaleString() : 'N/A')}</div>
          </motion.section>
        </main>

        <footer className="text-center p-4 text-sm text-gray-500">© GST & Services</footer>
      </div>

      {/* Manage Data Modal (simple) */}
      {manageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Manage Demo Data</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await resetData();
                    setManageOpen(false);
                  }}
                  className="text-sm text-red-600"
                >
                  Reset
                </button>
                <button onClick={() => setManageOpen(false)} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X />
                </button>
              </div>
            </div>

            <form onSubmit={submitStats} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col">
                <span className="text-sm text-gray-600">Email</span>
                <input
                  value={data.email ?? ''}
                  onChange={(e) => setData({ ...data, email: e.target.value || null })}
                  placeholder="user@example.com"
                  className="mt-1 p-2 rounded border"
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm text-gray-600">IP Address</span>
                <input
                  value={form.ip}
                  onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
                  placeholder="e.g. 203.0.113.12"
                  className="mt-1 p-2 rounded border"
                />
              </label>

              <label className="flex flex-col">
                <span className="text-sm text-gray-600">Total Returns Filed</span>
                <input type="number" className="mt-1 p-2 rounded border" value={form.returnsFiled} onChange={(e) => setForm((f) => ({ ...f, returnsFiled: e.target.value }))} />
              </label>

              <label className="flex flex-col">
                <span className="text-sm text-gray-600">Pending Returns</span>
                <input type="number" className="mt-1 p-2 rounded border" value={form.pendingReturns} onChange={(e) => setForm((f) => ({ ...f, pendingReturns: e.target.value }))} />
              </label>

              <label className="flex flex-col">
                <span className="text-sm text-gray-600">Total Tax Paid</span>
                <input className="mt-1 p-2 rounded border" value={form.totalTaxPaid} onChange={(e) => setForm((f) => ({ ...f, totalTaxPaid: e.target.value }))} placeholder="₹" />
              </label>

              <label className="flex flex-col">
                <span className="text-sm text-gray-600">Input Tax Credit</span>
                <input className="mt-1 p-2 rounded border" value={form.inputTaxCredit} onChange={(e) => setForm((f) => ({ ...f, inputTaxCredit: e.target.value }))} placeholder="₹" />
              </label>

              <div className="col-span-1 md:col-span-2 mt-2 border-t pt-3">
                <h4 className="font-semibold mb-2">Add Announcement</h4>
                <div className="flex gap-2">
                  <input placeholder="Announcement text" className="flex-1 p-2 rounded border" value={form.announcementText} onChange={(e) => setForm((f) => ({ ...f, announcementText: e.target.value }))} />
                  <input type="date" className="p-2 rounded border" value={form.announcementDate} onChange={(e) => setForm((f) => ({ ...f, announcementDate: e.target.value }))} />
                  <button type="button" onClick={addAnnouncement} className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 mt-2">
                <h4 className="font-semibold mb-2">Add Activity</h4>
                <div className="flex gap-2">
                  <input placeholder="Activity title" className="flex-1 p-2 rounded border" value={form.activityTitle} onChange={(e) => setForm((f) => ({ ...f, activityTitle: e.target.value }))} />
                  <input type="datetime-local" className="p-2 rounded border" value={form.activityTime} onChange={(e) => setForm((f) => ({ ...f, activityTime: e.target.value }))} />
                  <button type="button" onClick={addActivity} className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-end gap-2 mt-3">
                <button type="button" onClick={() => { setManageOpen(false); }} className="px-4 py-2 rounded border">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-indigo-600 text-white">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AuthDebug />
    </div>
  );
};

export default Dashboard;
