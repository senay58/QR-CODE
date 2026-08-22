import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock, UtensilsCrossed } from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
    const [secretCode, setSecretCode] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/admin');
        }
    };

    const handleSecretVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const { data, error } = await supabase.rpc('verify_admin_secret', { input_secret: secretCode });

        if (error || !data) {
            setError('Invalid secret recovery phrase.');
            setLoading(false);
            return;
        }

        const resetRes = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/admin/settings',
        });

        if (resetRes.error) {
            setError(resetRes.error.message);
        } else {
            setMode('reset');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            {/* Background subtle pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
            </div>

            <div className="max-w-md w-full relative">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-xl shadow-primary/20">
                        <UtensilsCrossed size={30} className="text-primary-foreground" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter text-foreground">
                        FANA <span className="text-primary">KITCHEN</span>
                    </h1>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.3em] mt-1">
                        Staff Portal
                    </p>
                </div>

                <div className="bg-card p-8 rounded-3xl shadow-xl border border-border">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 text-primary">
                            <Lock size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">
                            {mode === 'login' ? 'Sign In' : mode === 'forgot' ? 'Recover Access' : 'Email Sent'}
                        </h2>
                        <p className="text-muted-foreground text-center mt-1 text-sm">
                            {mode === 'login' && 'Sign in to manage Fana Kitchen operations'}
                            {mode === 'forgot' && 'Enter your admin email and secret recovery phrase'}
                            {mode === 'reset' && 'Password reset link dispatched securely.'}
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 mb-4 bg-destructive/10 text-destructive text-sm rounded-xl border border-destructive/20">
                            {error}
                        </div>
                    )}

                    {mode === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                    placeholder="admin@fanakitchen.com"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Password</label>
                                    <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary hover:underline font-bold">Forgot?</button>
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2 shadow-lg shadow-primary/20"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {mode === 'forgot' && (
                        <form onSubmit={handleSecretVerification} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Account Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                    placeholder="admin@fanakitchen.com"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Secret Recovery Phrase</label>
                                <input
                                    type="password"
                                    required
                                    value={secretCode}
                                    onChange={e => setSecretCode(e.target.value)}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                    placeholder="Enter your secret phrase..."
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMode('login')}
                                    className="flex-1 py-3 text-sm font-bold text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {loading ? 'Verifying...' : 'Recover Account'}
                                </button>
                            </div>
                        </form>
                    )}

                    {mode === 'reset' && (
                        <div className="text-center space-y-4">
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-xl text-sm leading-relaxed border border-green-200 dark:border-green-800">
                                Your secret phrase was verified. A secure reset link has been sent to:<br /><br />
                                <strong>{email}</strong>
                            </div>
                            <button
                                onClick={() => setMode('login')}
                                className="w-full py-3 text-sm font-bold text-primary hover:bg-primary/10 rounded-xl transition-colors"
                            >
                                Return to Sign In
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-6">
                    Fana Kitchen · Digital Ordering System
                </p>
            </div>
        </div>
    );
};

export default AdminLogin;
