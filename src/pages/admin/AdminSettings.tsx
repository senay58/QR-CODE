import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { KeyRound, Mail, ShieldAlert, Users, Plus, Trash2, Camera, X } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';
import { loadFaceModels } from '../../lib/faceApiUtils';

const AdminSettings = () => {
    const { user, restaurantId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [secretPhrase, setSecretPhrase] = useState('');
    const [currentSecret, setCurrentSecret] = useState('Not Set');

    // Staff
    const [staffList, setStaffList] = useState<any[]>([]);
    const [staffName, setStaffName] = useState('');
    const [staffRole, setStaffRole] = useState('Waiter');
    const [hourlyRate, setHourlyRate] = useState('');
    const [baseSalary, setBaseSalary] = useState('');
    const [workingDays, setWorkingDays] = useState('5');
    const [workingHours, setWorkingHours] = useState('8');
    const [staffLoading, setStaffLoading] = useState(false);

    // Face Recognition State
    const [faceDescriptor, setFaceDescriptor] = useState<Float32Array | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);

    // Load Face API Models

    const startCamera = async () => {
        setCameraLoading(true);
        setCameraError('');
        try {
            await loadFaceModels();
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            setCameraError(err.message || 'Failed to access camera.');
        } finally {
            setCameraLoading(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const handleCaptureFace = async () => {
        if (!videoRef.current) return;

        // Wait for video to have frames
        if (videoRef.current.readyState < 2) {
            setCameraError("Camera not ready yet — please wait and try again.");
            return;
        }

        setCameraLoading(true);
        setCameraError('');
        try {
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                .withFaceLandmarks()
                .withFaceDescriptor();
            
            if (detection) {
                setFaceDescriptor(detection.descriptor);
                stopCamera();
                setIsCameraOpen(false);
                // Show success inline instead of alert
            } else {
                setCameraError("No face detected — move closer and ensure good lighting.");
            }
        } catch (err: any) {
            console.error(err);
            setCameraError(err?.message || "An error occurred during face extraction.");
        } finally {
            setCameraLoading(false);
        }
    };


    useEffect(() => {
        if (user) setNewEmail(user.email || '');
        if (restaurantId) {
            fetchSecret();
            fetchStaff();
        }
    }, [user, restaurantId]);

    const fetchStaff = async () => {
        if (!restaurantId) return;
        const { data } = await supabase.from('staff').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: true });
        if (data) setStaffList(data);
    };

    const handleAddStaff = async () => {
        if (!staffName.trim() || !restaurantId) {
            alert("Please enter a staff name.");
            return;
        }
        setStaffLoading(true);
        try {
            const { error } = await supabase.from('staff').insert([{ 
                name: staffName.trim(), // Bypass original NOT NULL constraint
                full_name: staffName.trim(), 
                role: staffRole, 
                hourly_rate: parseFloat(hourlyRate) || 0,
                base_salary_per_month: parseFloat(baseSalary) || 0,
                working_days_per_week: parseInt(workingDays) || 5,
                working_hours_per_day: parseInt(workingHours) || 14,
                restaurant_id: restaurantId,
                is_active: true,
                face_descriptor: faceDescriptor ? Array.from(faceDescriptor) : null
            }]);
            
            if (error) {
                console.error("Staff Insert Error:", error);
                alert(`Error: ${error.message}`);
            } else {
                setStaffName('');
                setStaffRole('Waiter');
                setHourlyRate('');
                setBaseSalary('');
                // Reset other fields to defaults if needed
                setWorkingDays('5');
                setWorkingHours('14');
                setFaceDescriptor(null);
                fetchStaff();
            }
        } catch (err: any) {
            alert(`Critical error: ${err.message}`);
        } finally {
            setStaffLoading(false);
        }
    };

    const handleDeleteStaff = async (id: string) => {
        if (restaurantId && window.confirm('Remove this staff member?')) {
            await supabase.from('staff').delete().eq('id', id).eq('restaurant_id', restaurantId);
            fetchStaff();
        }
    };

    const toggleStaffActive = async (id: string, current: boolean) => {
        if (!restaurantId) return;
        await supabase.from('staff').update({ is_active: !current }).eq('id', id).eq('restaurant_id', restaurantId);
        fetchStaff();
    };

    const fetchSecret = async () => {
        if (!restaurantId) return;
        const { data, error } = await supabase.from('admin_secrets').select('secret_code').eq('restaurant_id', restaurantId).limit(1).single();
        if (data && !error) {
            setCurrentSecret('***' + data.secret_code.slice(-3));
        } else {
            setCurrentSecret('Not Set');
        }
    };

    const handleUpdateCredentials = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        const updates: any = {};
        if (newEmail !== user?.email) updates.email = newEmail;
        if (newPassword.length > 0) updates.password = newPassword;

        if (Object.keys(updates).length > 0) {
            const { error } = await supabase.auth.updateUser(updates);
            if (error) {
                setMessage({ type: 'error', text: error.message });
                setLoading(false);
                return;
            }
        }

        if (secretPhrase.length > 0 && restaurantId) {
            // Check if secret exists first
            const { data: existing } = await supabase.from('admin_secrets').select('id').eq('restaurant_id', restaurantId).limit(1).single();

            if (existing) {
                await supabase.from('admin_secrets').update({ secret_code: secretPhrase }).eq('id', existing.id).eq('restaurant_id', restaurantId);
            } else {
                await supabase.from('admin_secrets').insert([{ secret_code: secretPhrase, restaurant_id: restaurantId }]);
            }
            fetchSecret();
            setSecretPhrase('');
        }

        setMessage({ type: 'success', text: 'Settings updated successfully! Check your email if you changed it.' });
        setNewPassword('');
        setLoading(false);
    };

    return (
        <div className="max-w-2xl">
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Admin Settings</h2>
                <p className="text-muted-foreground text-sm">Update your credentials and recovery code.</p>
            </header>

            {message.text && (
                <div className={`p-4 mb-6 rounded-lg text-sm border ${message.type === 'error' ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleUpdateCredentials} className="bg-card shadow-sm border border-border rounded-xl p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Mail size={18} className="text-primary" />
                        Account Email
                    </h3>
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                    />
                </div>

                <div className="pt-4 border-t border-border">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <KeyRound size={18} className="text-primary" />
                        Change Password
                    </h3>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current password"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                    />
                </div>

                <div className="pt-4 border-t border-border">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                        <ShieldAlert size={18} className="text-primary" />
                        Recovery Secret Code
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">This code can be used to reset your password if you get locked out. Current: <span className="font-mono text-primary font-bold">{currentSecret}</span></p>
                    <input
                        type="password"
                        value={secretPhrase}
                        onChange={(e) => setSecretPhrase(e.target.value)}
                        placeholder="Set new secret recovery phrase (e.g., SandwichDog2025)"
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                    />
                </div>

                <div className="pt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>

            <section className="mt-12 mb-20 bg-card shadow-sm border border-border rounded-xl p-6">
                <header className="mb-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Users size={20} className="text-primary" />
                            Staff Management
                        </h3>
                        <p className="text-muted-foreground text-xs mt-1">Register waiters and manage their roles.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-secondary/20 rounded-2xl border border-border/50">
                    <div className="sm:col-span-2 flex gap-2">
                        <input
                            type="text"
                            value={staffName}
                            onChange={(e) => setStaffName(e.target.value)}
                            placeholder="Full Name..."
                            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-sm"
                        />
                        <select
                            value={staffRole}
                            onChange={(e) => setStaffRole(e.target.value)}
                            className="px-4 py-2 bg-background border border-border rounded-lg text-sm"
                        >
                            <option value="Admin">Admin</option>
                            <option value="Waiter">Waiter</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Cooks">Cooks</option>
                            <option value="Sanitary">Sanitary</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Monthly Salary (ETB)</label>
                        <input
                            type="number"
                            value={baseSalary}
                            onChange={(e) => setBaseSalary(e.target.value)}
                            placeholder="e.g. 8000"
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Hourly Rate (Optional)</label>
                        <input
                            type="number"
                            value={hourlyRate}
                            onChange={(e) => setHourlyRate(e.target.value)}
                            placeholder="e.g. 50"
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Days / Week</label>
                        <input
                            type="number"
                            value={workingDays}
                            onChange={(e) => setWorkingDays(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block">Hours / Day</label>
                        <input
                            type="number"
                            value={workingHours}
                            onChange={(e) => setWorkingHours(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-sm"
                        />
                    </div>
                    <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4 mt-2">
                        <button
                            onClick={() => {
                                setIsCameraOpen(true);
                                setTimeout(startCamera, 300);
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all border ${faceDescriptor ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'}`}
                        >
                            <Camera size={18} />
                            {faceDescriptor ? 'Face Captured ✓' : 'Add Face Profile (Optional)'}
                        </button>
                        <button
                            onClick={handleAddStaff}
                            disabled={staffLoading || !staffName}
                            className="flex-[2] bg-primary text-primary-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                        >
                            <Plus size={18} /> {staffLoading ? 'Registering...' : 'Register Staff Member'}
                        </button>
                    </div>
                </div>

                {/* Face Capture Modal */}
                {isCameraOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <div className="bg-card border border-border shadow-2xl rounded-3xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-black flex items-center gap-2"><Camera size={20} className="text-primary" /> Face Registration</h3>
                                <button onClick={() => { stopCamera(); setIsCameraOpen(false); }} className="p-2 bg-secondary rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center mb-6 border border-border">
                                {cameraLoading && !cameraError && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 backdrop-blur-sm">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                                <div className="absolute inset-0 border-4 border-primary/30 rounded-2xl pointer-events-none" style={{ borderRadius: '1rem' }} />
                                {/* Face Area Guide Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
                                    <div className="w-32 h-40 border-2 border-dashed border-white rounded-[2rem]"></div>
                                </div>
                            </div>
                            
                            {cameraError && (
                                <div className="p-3 mb-4 bg-red-500/10 text-red-500 text-xs font-bold rounded-xl border border-red-500/20 text-center">
                                    {cameraError}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { stopCamera(); setIsCameraOpen(false); }}
                                    className="flex-1 py-3 bg-secondary text-muted-foreground font-bold rounded-xl hover:bg-secondary/80 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCaptureFace}
                                    disabled={cameraLoading || !!cameraError || !videoRef.current?.srcObject}
                                    className="flex-[2] py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    Capture & Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {staffList.map(staff => (
                        <div key={staff.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${staff.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <div className="flex flex-col">
                                    <span className={`font-bold text-sm ${!staff.is_active && 'text-muted-foreground line-through'}`}>{staff.full_name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{staff.role}</span>
                                        <span className="text-[10px] text-primary font-bold">ETB {staff.hourly_rate}/hr</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleStaffActive(staff.id, staff.is_active)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-tighter transition-all ${staff.is_active ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-secondary text-muted-foreground border border-border'}`}
                                >
                                    {staff.is_active ? 'Active' : 'Inactive'}
                                </button>
                                <button
                                    onClick={() => handleDeleteStaff(staff.id)}
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {staffList.length === 0 && (
                        <p className="text-center py-6 text-muted-foreground text-sm italic">No staff members registered yet.</p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default AdminSettings;
