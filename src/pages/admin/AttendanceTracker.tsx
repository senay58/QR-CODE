import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Clock, Calendar, UserCheck } from 'lucide-react';

const AttendanceTracker = () => {
    const { user, restaurantId, role } = useAuth();
    const isAdmin = role === 'admin' || role === 'owner' || role === 'super_admin';
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'in' | 'out' | 'none'>('none');
    const [shiftType, setShiftType] = useState<'full' | 'half' | 'overtime'>('full');
    const [otHours, setOtHours] = useState('');
    const [todayLog, setTodayLog] = useState<any>(null);
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [selectedStaffForAdmin, setSelectedStaffForAdmin] = useState('');

    useEffect(() => {
        if (user && restaurantId) {
            checkCurrentStatus();
            fetchRecentLogs();
            if (isAdmin) fetchStaffList();
        }
    }, [user, restaurantId, role]);

    const fetchStaffList = async () => {
        const { data } = await supabase.from('staff').select('*').eq('restaurant_id', restaurantId).eq('is_active', true);
        if (data) setStaffList(data);
    };

    const checkCurrentStatus = async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('attendance')
            .select('*')
            .eq('staff_id', user?.id)
            .eq('restaurant_id', restaurantId)
            .gte('check_in', `${today}T00:00:00`)
            .order('check_in', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            setTodayLog(data);
            setShiftType(data.shift_type || 'full');
            setOtHours(data.overtime_hours?.toString() || '');
            setStatus(data.check_out ? 'out' : 'in');
        } else {
            setStatus('none');
        }
    };

    const fetchRecentLogs = async () => {
        const { data } = await supabase
            .from('attendance')
            .select('*, staff(full_name)')
            .eq('restaurant_id', restaurantId)
            .order('check_in', { ascending: false })
            .limit(20);
        if (data) setRecentLogs(data);
    };

    const handleClockIn = async () => {
        if (!user || !restaurantId) return;
        setLoading(true);
        const { error } = await supabase
            .from('attendance')
            .insert([{
                staff_id: user.id,
                restaurant_id: restaurantId,
                check_in: new Date().toISOString(),
                shift_type: shiftType,
                overtime_hours: shiftType === 'overtime' ? parseFloat(otHours) : null
            }]);
        
        if (!error) {
            checkCurrentStatus();
            fetchRecentLogs();
        }
        setLoading(false);
    };

    const handleMarkDayOff = async () => {
        if (!selectedStaffForAdmin || !restaurantId) return;
        setLoading(true);
        const { error } = await supabase
            .from('attendance')
            .insert([{
                staff_member_id: selectedStaffForAdmin,
                restaurant_id: restaurantId,
                check_in: new Date().toISOString(),
                check_out: new Date().toISOString(),
                is_day_off: true,
                shift_type: 'half' // default for day off maybe
            }]);
        if (!error) {
            fetchRecentLogs();
            setSelectedStaffForAdmin('');
        }
        setLoading(false);
    };

    const handleClockOut = async () => {
        if (!todayLog || !restaurantId) return;
        setLoading(true);
        const { error } = await supabase
            .from('attendance')
            .update({ 
                check_out: new Date().toISOString(),
                shift_type: shiftType,
                overtime_hours: shiftType === 'overtime' ? parseFloat(otHours) : null
            })
            .eq('id', todayLog.id);
        
        if (!error) {
            checkCurrentStatus();
            fetchRecentLogs();
        }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Staff <span className="text-primary italic">Attendance</span></h1>
                <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mt-1">Track your hours & manage productivity</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Status Card */}
                <div className="md:col-span-1 bg-card/40 backdrop-blur-xl border border-border/50 p-8 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-center text-center">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner ${status === 'in' ? 'bg-green-500/10 text-green-500' : 'bg-secondary text-muted-foreground'}`}>
                        <Clock size={40} className={status === 'in' ? 'animate-pulse' : ''} />
                    </div>
                    
                    <h2 className="text-xl font-black text-foreground mb-1 uppercase tracking-tight">
                        {status === 'in' ? 'Current Session' : 'Ready to work?'}
                    </h2>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-6">
                        {status === 'in' ? `Started at ${new Date(todayLog.check_in).toLocaleTimeString()}` : 'Select your shift & clock in'}
                    </p>

                    <div className="w-full mb-6 space-y-3">
                        <div>
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1.5 block">Shift Duration</label>
                            <select
                                value={shiftType}
                                onChange={(e) => setShiftType(e.target.value as any)}
                                className="w-full bg-background border border-border px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-sm"
                            >
                                <option value="full">14 Hours (Full Day)</option>
                                <option value="half">7 Hours (Half Day)</option>
                                <option value="overtime">Overtime</option>
                            </select>
                        </div>

                        {shiftType === 'overtime' && (
                            <div className="animate-in slide-in-from-top-1 duration-300">
                                <label className="text-[10px] font-black uppercase text-primary tracking-widest mb-1.5 block">Manual Hours</label>
                                <input 
                                    type="number" 
                                    value={otHours}
                                    onChange={e => setOtHours(e.target.value)}
                                    placeholder="Enter hours (e.g. 10)"
                                    className="w-full bg-background border border-primary/30 px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {status !== 'in' ? (
                        <button
                            onClick={handleClockIn}
                            disabled={loading || status === 'out'}
                            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Clocking In...' : status === 'out' ? 'Finished for Today' : 'Clock In Now'}
                        </button>
                    ) : (
                        <button
                            onClick={handleClockOut}
                            disabled={loading}
                            className="w-full bg-destructive text-destructive-foreground py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-destructive/20 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Clocking Out...' : 'Clock Out'}
                        </button>
                    )}
                </div>

                {/* Left Side: History & Admin Actions */}
                <div className="md:col-span-2 space-y-8">
                    {/* Admin: Mark Day Off */}
                    {isAdmin && (
                        <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary">
                                <Calendar size={22} /> Record Staff Day-Off
                            </h3>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <select
                                    value={selectedStaffForAdmin}
                                    onChange={(e) => setSelectedStaffForAdmin(e.target.value)}
                                    className="flex-1 bg-background border border-border px-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-bold text-sm"
                                >
                                    <option value="">Select Staff Member...</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleMarkDayOff}
                                    disabled={loading || !selectedStaffForAdmin}
                                    className="bg-secondary text-foreground hover:bg-secondary/80 px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Mark Day Off'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* History Table */}
                    <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Clock className="text-primary" size={22} /> Global Log Feed
                        </h3>
                        
                        <div className="space-y-4">
                            {recentLogs.map((log) => (
                                <div key={log.id} className={`flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50 ${log.is_day_off ? 'opacity-60 grayscale' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center text-muted-foreground border border-border shrink-0">
                                            <UserCheck size={18} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-foreground flex items-center gap-2">
                                                {log.staff?.full_name || 'System'}
                                                {log.is_day_off && <span className="bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-blue-500/20 tracking-widest">Day Off</span>}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                                {new Date(log.check_in).toLocaleDateString()} • {new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                                                {log.check_out && ` - ${new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                                            log.shift_type === 'overtime' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                            log.shift_type === 'half' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                            'bg-green-500/10 text-green-500 border-green-500/20'
                                        }`}>
                                            {log.shift_type || 'Full Day'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {recentLogs.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground italic">No attendance records found.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceTracker;
