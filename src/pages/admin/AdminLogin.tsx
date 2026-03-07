import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Lock } from 'lucide-react';

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

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

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

        // Secret matched! We can't automatically log them in without a valid session token from Supabase Auth,
        // so standard practice for this backdoor is updating the password via a backend admin edge function.
        // However, since we don't have an edge environment, we will use the standard Supabase reset flow here
        // AFTER verifying they know the secret.
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
        <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card p-8 rounded-2xl shadow-xl border border-border relative overflow-hidden">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {mode === 'login' ? 'Admin Portal' : mode === 'forgot' ? 'Recover Access' : 'Email Sent'}
                    </h1>
                    <p className="text-muted-foreground text-center mt-2 text-sm">
                        {mode === 'login' && 'Sign in to manage Sandwich House operations'}
                        {mode === 'forgot' && 'Enter your admin email and secret recovery phrase'}
                        {mode === 'reset' && 'Password reset link dispatched securely.'}
                    </p>
                </div>

                {error && (
                    <div className="p-3 mb-4 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
                        {error}
                    </div>
                )}

                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                placeholder="admin@sandwichhouse.com"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-foreground">Password</label>
                                <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary hover:underline font-medium">Forgot?</button>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 mt-6"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                )}

                {mode === 'forgot' && (
                    <form onSubmit={handleSecretVerification} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Account Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                placeholder="admin@sandwichhouse.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Secret Recovery Phrase</label>
                            <input
                                type="password"
                                required
                                value={secretCode}
                                onChange={e => setSecretCode(e.target.value)}
                                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                                placeholder="Enter your secret phrase..."
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="flex-1 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Recover Account'}
                            </button>
                        </div>
                    </form>
                )}

                {mode === 'reset' && (
                    <div className="text-center space-y-4">
                        <div className="p-4 bg-green-50 text-green-800 rounded-xl text-sm leading-relaxed border border-green-200">
                            Because your Secret Phrase was correct, you are authorized to reset your password. <br /><br />
                            <strong>We have emailed a secure reset link to:</strong><br />
                            {email}
                        </div>
                        <button
                            onClick={() => setMode('login')}
                            className="w-full py-3 text-sm font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                            Return to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLogin;
