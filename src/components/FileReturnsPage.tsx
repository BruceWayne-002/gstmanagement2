import React, { useState, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { LineChart, Calendar, Menu, Moon, Sun, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ThemeContext } from '@/context/ThemeProvider';
import { useAuth } from '@/context/AuthContext';
import { storageKeys } from '@/lib/storageKeys';
import { saveUserData } from '@/lib/userStorage';
import { useToast } from '@/hooks/use-toast';

const FileReturnsPage: React.FC = () => {
  const { toast } = useToast();
  const yearOptions = ['2024–2025', '2025–2026', '2026–2027'];
  const navigate = useNavigate();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { logout } = useAuth();

  const quarterOptions = [
    { value: 'Q1', label: 'Quarter 1 (Apr - Jun)' },
    { value: 'Q2', label: 'Quarter 2 (Jul - Sep)' },
    { value: 'Q3', label: 'Quarter 3 (Oct - Dec)' },
    { value: 'Q4', label: 'Quarter 4 (Jan - Mar)' },
  ];

  const quarterToMonths: Record<string, string[]> = {
    Q1: ['Apr', 'May', 'Jun'],
    Q2: ['Jul', 'Aug', 'Sep'],
    Q3: ['Oct', 'Nov', 'Dec'],
    Q4: ['Jan', 'Feb', 'Mar'],
  };

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [showResults, setShowResults] = useState<boolean>(false);
  const isSearchDisabled = !(selectedYear && selectedQuarter && selectedPeriod);

  const handleSearch = () => {
    const payload = { financialYear: selectedYear, quarter: selectedQuarter, period: selectedPeriod };
    console.log('File Returns search:', payload);
    if (selectedYear && selectedQuarter && selectedPeriod) {
      setShowResults(true);
    }
  };

  const clearAll = () => {
    setSelectedYear('');
    setSelectedQuarter('');
    setSelectedPeriod('');
    setShowResults(false);
  };

  const handleLogout = async () => {
    await logout?.();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors flex flex-col">
      <header className="bg-[#2B3E85] text-white sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button aria-label="Open sidebar" className="p-2 rounded-md hover:bg-white/10">
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
                <DropdownMenuItem onClick={() => toast({ title: "Coming Soon", description: "Ledger module is under development." })}>Ledger</DropdownMenuItem>
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
      <nav className="text-sm mb-4">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>
          <span className="text-gray-400">›</span>
          <Link to="/returns" className="text-blue-600 hover:underline">Returns</Link>
          <span className="text-gray-400">›</span>
          <span className="text-gray-600 font-medium">File Returns</span>
        </div>
      </nav>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow border">
        <h1 className="text-2xl font-semibold">File Returns</h1>
        <p className="text-sm text-gray-600 mt-1">Select the relevant period to file your GST returns.</p>

        <div className="mt-6">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <LineChart className="h-4 w-4" />
            <span>Step 1: Select Filing Period</span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-none">
            <div className="md:col-span-1">
              <Label className="text-sm">Financial Year *</Label>
              <div className="mt-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="" disabled>Choose Financial Year</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-1">
              <Label className="text-sm">Quarter *</Label>
              <div className="mt-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedQuarter}
                  onChange={(e) => {
                    setSelectedQuarter(e.target.value);
                    setSelectedPeriod('');
                  }}
                >
                  <option value="" disabled>Choose Quarter</option>
                  {quarterOptions.map((q) => (
                    <option key={q.value} value={q.value}>{q.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-1">
              <Label className="text-sm">Period *</Label>
              <div className="mt-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="" disabled>Choose Period</option>
                  {(quarterToMonths[selectedQuarter] || []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button onClick={clearAll} className="text-blue-600">Clear All</button>
              <Button onClick={handleSearch} disabled={isSearchDisabled} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">SEARCH</Button>
            </div>
          </div>
        </div>
      </div>
      {showResults && (
        <section className="mt-6 transition-all duration-300 animate-fade-in">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-md px-4 py-3 text-sm">
            You have selected to file the return on monthly frequency. GSTR-1 and GSTR-3B shall be required to be filed for each month of the quarter.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-stretch">
            <div className="rounded-md overflow-hidden shadow bg-white h-full flex flex-col">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">Details of outward supplies of goods or services</div>
                <div className="text-sm mt-1">GSTR1</div>
              </div>
              <div className="p-4 flex gap-3 mt-auto">
                <Button
                  onClick={async () => {
                    const current = { financialYear: selectedYear, quarter: selectedQuarter, period: selectedPeriod };
                    try {
                      await saveUserData(
                        storageKeys.fileReturns(selectedYear, selectedQuarter, selectedPeriod),
                        current
                      );
                      await saveUserData('file_returns_period', current);
                      navigate(`/returns/gstr1/prepare-online?fy=${encodeURIComponent(selectedYear)}&q=${encodeURIComponent(selectedQuarter)}&p=${encodeURIComponent(selectedPeriod)}`);
                    } catch (err) {
                      console.error('Failed to save period', err);
                      toast({
                        title: "Error",
                        description: `Failed to save period: ${(err instanceof Error ? err.message : 'Unknown error')}`,
                        variant: "destructive",
                      });
                    }
                  }}
                  className="bg-[#234E8F] hover:bg-[#1d447e]"
                >
                  PREPARE ONLINE
                </Button>
                <Button 
                  className="bg-[#234E8F] hover:bg-[#1d447e]"
                  onClick={() => toast({ title: "Coming Soon", description: "Offline preparation is under development." })}
                >
                  PREPARE OFFLINE
                </Button>
              </div>
            </div>

            <div className="rounded-md overflow-hidden shadow bg-white h-full flex flex-col">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">Auto Drafted details (For view only)</div>
                <div className="text-sm mt-1">GSTR2A</div>
              </div>
              <div className="p-4 flex gap-3 mt-auto">
                <Button 
                  className="bg-[#234E8F] hover:bg-[#1d447e]"
                  onClick={() => toast({ title: "Coming Soon", description: "GSTR-2A View is under development." })}
                >
                  VIEW
                </Button>
                <Button 
                  className="bg-[#234E8F] hover:bg-[#1d447e]"
                  onClick={() => toast({ title: "Coming Soon", description: "GSTR-2A Download is under development." })}
                >
                  DOWNLOAD
                </Button>
              </div>
            </div>

            <div className="rounded-md overflow-hidden shadow bg-white h-full flex flex-col">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">Auto - drafted ITC Statement for the month</div>
                <div className="text-sm mt-1">GSTR2B</div>
              </div>
              <div className="p-4 flex gap-3 mt-auto">
                <Button 
                  className="bg-[#234E8F] hover:bg-[#1d447e]"
                  onClick={() => toast({ title: "Coming Soon", description: "GSTR-2B View is under development." })}
                >
                  VIEW
                </Button>
                <Button 
                  className="bg-[#234E8F] hover:bg-[#1d447e]"
                  onClick={() => toast({ title: "Coming Soon", description: "GSTR-2B Download is under development." })}
                >
                  DOWNLOAD
                </Button>
              </div>
            </div>

            <div className="rounded-md overflow-hidden shadow bg-white h-full flex flex-col">
              <div className="bg-[#17375E] text-white p-4">
                <div className="font-semibold">Monthly Return</div>
                <div className="text-sm mt-1">GSTR-3B</div>
              </div>
              <div className="p-4 flex gap-3 mt-auto">
                <Button 
                  className="bg-[#234E8F] hover:bg-[#1d447e]"
                  onClick={async () => {
                    const current = { financialYear: selectedYear, quarter: selectedQuarter, period: selectedPeriod };
                    try {
                      await saveUserData(
                        storageKeys.fileReturns(selectedYear, selectedQuarter, selectedPeriod),
                        current
                      );
                      await saveUserData('file_returns_period', current);
                      navigate(`/returns/gstr3b/prepare-online?fy=${encodeURIComponent(selectedYear)}&q=${encodeURIComponent(selectedQuarter)}&p=${encodeURIComponent(selectedPeriod)}`);
                    } catch (err) {
                      toast({
                        title: "Error",
                        description: `Failed to open GSTR-3B: ${(err instanceof Error ? err.message : 'Unknown error')}`,
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  PREPARE ONLINE
                </Button>
                <Button 
                  className="bg-[#234E8F] hover:bg-[#1d447e]"
                  onClick={() => toast({ title: "Coming Soon", description: "GSTR-3B Offline Preparation is under development." })}
                >
                  PREPARE OFFLINE
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
      </main>
    </div>
  );
};

export default FileReturnsPage;
