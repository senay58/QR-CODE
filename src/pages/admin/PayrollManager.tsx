import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Banknote, Users, Calculator, FileText, Search, Download } from 'lucide-react';

const PayrollManager = () => {
    const { restaurantId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [staff, setStaff] = useState<any[]>([]);
    const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        if (restaurantId) {
            fetchData();
        }
    }, [restaurantId, selectedMonth]);

    const fetchData = async () => {
        setLoading(true);
        // 1. Fetch staff profiles from the new 'staff' table
        const { data: staffData } = await supabase
            .from('staff')
            .select('*')
            .eq('restaurant_id', restaurantId);
        
        // 2. Fetch attendance for the month
        const startOfMonth = `${selectedMonth}-01T00:00:00`;
        const endOfMonth = new Date(new Date(selectedMonth).getFullYear(), new Date(selectedMonth).getMonth() + 1, 0).toISOString().split('T')[0] + 'T23:59:59';

        const { data: attendanceData } = await supabase
            .from('attendance')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .gte('check_in', startOfMonth)
            .lte('check_in', endOfMonth);

        if (staffData) setStaff(staffData);
        if (attendanceData) setAttendanceRows(attendanceData);
        setLoading(false);
    };

    const calculateStats = (member: any) => {
        const logs = attendanceRows.filter(a => a.staff_id === member.user_id || a.staff_member_id === member.id);
        
        let totalHours = 0;
        let workDays = 0;
        let dayOffs = 0;

        logs.forEach(log => {
            if (log.is_day_off) {
                dayOffs++;
                return;
            }
            
            workDays++;
            if (log.shift_type === 'half') totalHours += 7;
            else if (log.shift_type === 'overtime') {
                totalHours += parseFloat(log.overtime_hours) || 0;
            } else {
                totalHours += 14;
            }
        });

        // REFINED CALCULATION:
        // Expected Monthly Hours
        const expectedMonthlyHours = (member.working_days_per_week || 5) * (member.working_hours_per_day || 14) * 4;
        
        let finalSalary = 0;
        if (member.base_salary_per_month > 0) {
            // Salary based on attendance % of expected hours
            const attendanceRatio = totalHours / (expectedMonthlyHours || 1);
            finalSalary = member.base_salary_per_month * Math.min(attendanceRatio, 1.2); // Cap at 120% for OT
        } else {
            // Fallback to hourly rate
            finalSalary = totalHours * (member.hourly_rate || 0);
        }

        return {
            hours: totalHours.toFixed(1),
            days: workDays,
            offs: dayOffs,
            salary: finalSalary.toLocaleString(undefined, { maximumFractionDigits: 0 }),
            expected: expectedMonthlyHours
        };
    };

    const filteredStaff = staff.filter(s => s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleExportReport = () => {
        if (filteredStaff.length === 0) return;
        let csvContent = "data:text/csv;charset=utf-8,Staff Member,Role,Days Worked,Total Hours,Estimated Salary\n";
        filteredStaff.forEach(member => {
            const stats = calculateStats(member);
            const name = (member.full_name || '').replace(/,/g, '');
            const role = (member.role || 'Staff').replace(/,/g, '');
            const salary = stats.salary.replace(/,/g, '');
            csvContent += `${name},${role},${stats.days},${stats.hours},${salary}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Payroll_Report_${selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleGenerateBatch = () => {
        if (filteredStaff.length === 0) return alert("No staff available for batch generation.");
        alert(`Generating batch salary receipts for ${filteredStaff.length} staff member(s) for ${selectedMonth}...\n(Batch processing will be fully integrated shortly)`);
    };

    const handleGenerateReceipt = (member: any) => {
        const stats = calculateStats(member);
        alert(`Salary Receipt: ${member.full_name}\nMonth: ${selectedMonth}\nDays Worked: ${stats.days}\nHours Worked: ${stats.hours}\nNet Pay: ETB ${stats.salary}\n\n(Detailed receipt printing coming soon)`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Payroll <span className="text-primary italic">Management</span></h1>
                    <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mt-1">Review hours & process monthly salaries</p>
                </div>
                <div className="flex gap-4">
                    <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="bg-card/40 backdrop-blur-md border border-border/50 px-4 py-2.5 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold"
                    />
                    <button onClick={fetchData} className="p-2.5 bg-secondary hover:bg-secondary/80 rounded-2xl transition-all"><Calculator size={20} /></button>
                </div>
            </header>

            <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search staff..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-background/50 border border-border/50 pl-10 pr-4 py-2 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none w-full font-medium"
                        />
                    </div>
                    <button onClick={handleExportReport} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:bg-primary/10 px-4 py-2 rounded-xl transition-all">
                        <Download size={14} /> Export Report
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-secondary/30 text-[10px] uppercase tracking-widest text-muted-foreground font-black">
                                <th className="px-8 py-4">Staff Member</th>
                                <th className="px-8 py-4">Role</th>
                                <th className="px-8 py-4">Days Worked</th>
                                <th className="px-8 py-4">Total Hours</th>
                                <th className="px-8 py-4">Est. Salary</th>
                                <th className="px-8 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {loading ? (
                                [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan={6} className="h-16 bg-muted/10"></td></tr>)
                            ) : filteredStaff.map((member) => {
                                const stats = calculateStats(member);
                                return (
                                    <tr key={member.id} className="hover:bg-secondary/20 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black uppercase shadow-inner text-sm">
                                                    {member.full_name?.[0] || 'U'}
                                                </div>
                                                <span className="font-bold text-foreground">{member.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-secondary px-2.5 py-1 rounded-lg text-muted-foreground border border-border/50">
                                                {member.role || 'Staff'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-mono text-sm font-bold text-foreground">{stats.days}d</div>
                                            {stats.offs > 0 && <div className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">{stats.offs} Off-days</div>}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="font-mono text-sm font-bold text-foreground">{stats.hours}h</div>
                                            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">of {stats.expected}h exp.</div>
                                        </td>
                                        <td className="px-8 py-5 font-mono text-sm font-black text-primary">
                                            ETB {stats.salary}
                                            <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">
                                                {member.base_salary_per_month > 0 ? `Base: ${member.base_salary_per_month}` : `@ ${member.hourly_rate}/hr`}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button onClick={() => handleGenerateReceipt(member)} className="text-muted-foreground hover:text-foreground p-2 rounded-lg transition-colors"><FileText size={18} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredStaff.length === 0 && !loading && (
                        <div className="p-12 text-center text-muted-foreground italic">No staff profiles found.</div>
                    )}
                </div>
            </div>

            {/* Quick Actions / Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-primary to-primary-foreground/20 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-primary/20 relative overflow-hidden group">
                    <div className="relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
                            <Banknote size={24} />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Process All Salaries</h3>
                        <p className="text-white/80 text-sm font-medium mb-6">Confirm and generate salary receipts for all active staff in one click.</p>
                        <button onClick={handleGenerateBatch} className="bg-white text-primary px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-lg">Generate Batch</button>
                    </div>
                    <Banknote className="absolute -bottom-10 -right-10 text-white/10 w-64 h-64 rotate-12 group-hover:scale-110 transition-transform duration-700" />
                </div>

                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Users className="text-primary" size={20} /> Staff Retention
                    </h3>
                    <div className="flex items-center gap-6">
                        <div className="relative w-24 h-24">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path className="text-secondary" stroke-width="3" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path className="text-primary" stroke-width="3" stroke-dasharray="85, 100" stroke-linecap="round" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-foreground">85%</div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                <span>Punctuality</span>
                                <span>92%</span>
                            </div>
                            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                <div className="bg-green-500 w-[92%] h-full rounded-full" />
                            </div>
                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground mt-4">
                                <span>Attendance</span>
                                <span>88%</span>
                            </div>
                            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                                <div className="bg-primary w-[88%] h-full rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayrollManager;
