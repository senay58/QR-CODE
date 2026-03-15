import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Clock, Calendar, UserCheck, Camera, X } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import { loadFaceModels } from '../../lib/faceApiUtils';

const AttendanceTracker = () => {
    const { restaurantId, role } = useAuth();
    const isAdmin = role === 'admin' || role === 'owner' || role === 'super_admin';
    const [loading, setLoading] = useState(false);
    
    // Admin features
    const [selectedStaffForAdmin, setSelectedStaffForAdmin] = useState('');
    
    // Shared state
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);

    // Face Recognition Kiosk State
    const [scanMode, setScanMode] = useState<'in' | 'out' | null>(null);
    const [shiftType, setShiftType] = useState<'full' | 'half' | 'overtime'>('full');
    const [otHours, setOtHours] = useState('');
    
    const [cameraLoading, setCameraLoading] = useState(false);
    const [cameraMsg, setCameraMsg] = useState('');
    const [cameraError, setCameraError] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (restaurantId) {
            fetchRecentLogs();
            fetchStaffList();
        }
    }, [restaurantId]);

    // Re-run fetchRecentLogs when staffList populates to enrich the names
    useEffect(() => {
        if (staffList.length > 0 && recentLogs.length > 0 && !recentLogs[0]?.staff?.full_name) {
            fetchRecentLogs(staffList);
        }
    }, [staffList]);

    const fetchStaffList = async () => {
        const { data } = await supabase.from('staff').select('*').eq('restaurant_id', restaurantId).eq('is_active', true);
        if (data) setStaffList(data);
    };

    const fetchRecentLogs = async (currentStaffList: any[] = staffList) => {
        const { data } = await supabase
            .from('attendance')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('check_in', { ascending: false })
            .limit(20);
        
        if (data && currentStaffList.length > 0) {
            // Client-side join to resolve staff names using either staff_id or staff_member_id
            const enrichedData = data.map(log => {
                const staffObj = currentStaffList.find(s => s.id === log.staff_member_id || s.user_id === log.staff_id);
                return { ...log, staff: { full_name: staffObj?.full_name } };
            });
            setRecentLogs(enrichedData);
        } else if (data) {
            setRecentLogs(data); // Will re-run when staffList populates
        }
    };

    // --- Face Recognition Logic ---
    const openCamera = async (mode: 'in' | 'out') => {
        setScanMode(mode);
        setCameraLoading(true);
        setCameraError('');
        setCameraMsg('Loading face models & calibrating camera...');
        try {
            await loadFaceModels(); // Only load models when user clicks
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            setCameraError(err.message || 'Failed to access camera.');
        } finally {
            setCameraLoading(false);
            setCameraMsg('Align your face within the frame and hold still.');
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setScanMode(null);
        setCameraMsg('');
        setCameraError('');
    };

    const findMatchingStaff = (descriptor: Float32Array) => {
        let bestMatch = null;
        let minDistance = 0.55; // Strict threshold to avoid false positives
        
        for (const staff of staffList) {
            if (!staff.face_descriptor) continue;
            // Face descriptor is stored as a JSON array of floats
            const storedDescriptor = new Float32Array(staff.face_descriptor);
            const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);
            
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = staff;
            }
        }
        return bestMatch;
    };

    const handleScanFace = async () => {
        if (!videoRef.current) return;

        // Wait for video to have actual frames
        if (videoRef.current.readyState < 2) {
            setCameraError("Camera not ready yet — please wait a moment and try again.");
            return;
        }

        setCameraLoading(true);
        setCameraMsg('Analyzing facial features...');
        setCameraError('');
        
        try {
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();
            
            if (!detection) {
                setCameraError("No face detected — move closer and ensure good lighting.");
                return;
            }

            const matchedStaff = findMatchingStaff(detection.descriptor);
            
            if (!matchedStaff) {
                setCameraError("Face Not Recognized — Please Try Again or Contact Manager.");
                return;
            }

            setCameraMsg(`Welcome, ${matchedStaff.full_name}! Processing...`);
            
            if (scanMode === 'in') {
                await processClockIn(matchedStaff);
            } else if (scanMode === 'out') {
                await processClockOut(matchedStaff);
            }
            
        } catch (err: any) {
            console.error(err);
            setCameraError(err?.message || "An error occurred during facial recognition.");
        } finally {
            // Always reset loading so the button is never permanently stuck
            setCameraLoading(false);
        }
    };

    const processClockIn = async (staff: any) => {
        const { error } = await supabase
            .from('attendance')
            .insert([{
                staff_member_id: staff.id,
                restaurant_id: restaurantId,
                check_in: new Date().toISOString(),
                shift_type: shiftType,
                overtime_hours: shiftType === 'overtime' ? parseFloat(otHours) : null
            }]);
        
        if (!error) {
            alert(`Attendance Recorded: ${staff.full_name} Clocked In at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
            fetchRecentLogs();
            stopCamera();
        } else {
            console.error("Supabase insert error:", error);
            setCameraError(`Database error: ${error.message || error.details || JSON.stringify(error)}`);
        }
        setCameraLoading(false);
    };

    const processClockOut = async (staff: any) => {
        const today = new Date().toISOString().split('T')[0];
        
        // Find their open session for today
        const { data: session } = await supabase
            .from('attendance')
            .select('*')
            .eq('staff_member_id', staff.id)
            .eq('restaurant_id', restaurantId)
            .gte('check_in', `${today}T00:00:00`)
            .is('check_out', null)
            .order('check_in', { ascending: false })
            .limit(1)
            .single();

        if (!session) {
            setCameraError(`No active Clock-In session found today for ${staff.full_name}.`);
            setCameraLoading(false);
            return;
        }

        const { error } = await supabase
            .from('attendance')
            .update({ 
                check_out: new Date().toISOString(),
            })
            .eq('id', session.id);
        
        if (!error) {
            alert(`Clock Out Recorded: ${staff.full_name} Clocked Out at ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
            fetchRecentLogs();
            stopCamera();
        } else {
            setCameraError("Database error while clocking out.");
        }
        setCameraLoading(false);
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
                shift_type: 'half' 
            }]);
        if (!error) {
            fetchRecentLogs();
            setSelectedStaffForAdmin('');
        }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Staff <span className="text-primary italic">Attendance</span></h1>
                <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mt-1">Facial Recognition Kiosk</p>
            </header>

            {/* Face Scanning Modal */}
            {scanMode && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
                    <div className="bg-card/90 backdrop-blur-2xl border border-border/50 shadow-2xl rounded-[2.5rem] p-8 max-w-md w-full animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black flex items-center gap-3"><Camera size={26} className="text-primary" /> {scanMode === 'in' ? 'Clock In' : 'Clock Out'}</h3>
                            <button onClick={stopCamera} className="p-2 bg-secondary/50 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="relative w-full aspect-[4/5] bg-black rounded-[2rem] overflow-hidden shadow-inner flex items-center justify-center mb-6 border-4 border-primary/20">
                            <video ref={videoRef} autoPlay muted playsInline disablePictureInPicture controlsList="nodownload nofullscreen noremoteplayback" className="w-full h-full object-cover" />
                            
                            {/* Face Alignment Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
                                <div className="w-48 h-64 border-[3px] border-dashed border-white rounded-[4rem] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] transition-all"></div>
                            </div>

                            {cameraLoading && (
                                <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/20 overflow-hidden">
                                    <div className="h-full bg-primary animate-[pulse_1s_ease-in-out_infinite] w-full origin-left"></div>
                                </div>
                            )}
                        </div>
                        
                        <p className={`text-center font-bold text-sm mb-6 h-4 transition-colors ${cameraError ? 'text-red-500' : 'text-primary'}`}>
                            {cameraError || cameraMsg}
                        </p>

                        <button
                            onClick={handleScanFace}
                            disabled={cameraLoading || !videoRef.current?.srcObject}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3
                                ${cameraError ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground shadow-primary/20 hover:shadow-2xl'}`}
                        >
                            {cameraLoading ? 'Scanning...' : cameraError ? 'Try Again' : 'Scan Face'}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Kiosk Controls */}
                <div className="md:col-span-1 bg-card/40 backdrop-blur-xl border border-border/50 p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-center">
                    
                    <h2 className="text-2xl font-black text-foreground mb-2 tracking-tight">Kiosk Ready</h2>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-8">
                        Select shift & scan face
                    </p>

                    <div className="w-full mb-8 space-y-4 bg-secondary/30 p-4 rounded-3xl border border-border/40">
                        <div>
                            <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 block">Shift Duration (Clock In Only)</label>
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
                                <label className="text-[10px] font-black uppercase text-primary tracking-widest mb-2 block">Manual Hours</label>
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

                    <div className="space-y-4">
                        <button
                            onClick={() => openCamera('in')}
                            className="w-full bg-primary text-primary-foreground py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <UserCheck size={20} /> Clock In
                        </button>
                        
                        <button
                            onClick={() => openCamera('out')}
                            className="w-full bg-secondary/80 text-foreground border border-border/60 py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-sm hover:shadow-md hover:bg-secondary transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Clock size={20} /> Clock Out
                        </button>
                    </div>
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
                            <Clock className="text-primary" size={22} /> Recent Clock Events
                        </h3>
                        
                        <div className="space-y-4">
                            {recentLogs.map((log) => (
                                <div key={log.id} className={`flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50 ${log.is_day_off ? 'opacity-60 grayscale' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center text-muted-foreground border border-border shrink-0">
                                            {log.check_out ? <Clock size={16} /> : <UserCheck size={16} className="text-green-500" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-foreground flex items-center gap-2">
                                                {log.staff?.full_name || 'System / Unknown'}
                                                {log.is_day_off && <span className="bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-blue-500/20 tracking-widest">Day Off</span>}
                                                {!log.check_out && !log.is_day_off && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                                                {new Date(log.check_in).toLocaleDateString()} • In: {new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                                                {log.check_out && ` • Out: ${new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
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
