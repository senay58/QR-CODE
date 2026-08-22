import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { KeyRound, Mail, ShieldAlert } from 'lucide-react';

const AdminSettings = () => {
    const { user, restaurantId } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [secretPhrase, setSecretPhrase] = useState('');
    const [currentSecret, setCurrentSecret] = useState('Not Set');

    useEffect(() => {
        if (user) setNewEmail(user.email || '');
        if (restaurantId) fetchSecret();
    }, [user, restaurantId]);

    const fetchSecret = async () => {
        if (!restaurantId) return;
        const { data, error } = await supabase
            .from('admin_secrets')
            .select('secret_code')
            .eq('restaurant_id', restaurantId)
            .limit(1)
            .single();
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
            const { data: existing } = await supabase
                .from('admin_secrets')
                .select('id')
                .eq('restaurant_id', restaurantId)
                .limit(1)
                .single();

            if (existing) {
                await supabase.from('admin_secrets').update({ secret_code: secretPhrase }).eq('id', existing.id).eq('restaurant_id', restaurantId);
            } else {
                await supabase.from('admin_secrets').insert([{ secret_code: secretPhrase, restaurant_id: restaurantId }]);
            }
            fetchSecret();
            setSecretPhrase('');
        }

        setMessage({ type: 'success', text: 'Settings updated successfully!' });
        setNewPassword('');
        setLoading(false);
    };

    return (
        <div className="max-w-xl">
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Account Settings</h2>
                <p className="text-muted-foreground text-sm">Update your login credentials and recovery code.</p>
            </header>

            {message.text && (
                <div className={`p-4 mb-6 rounded-xl text-sm border ${message.type === 'error'
                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                }`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleUpdateCredentials} className="bg-card shadow-sm border border-border rounded-2xl p-6 space-y-6">

                {/* Account Email */}
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <Mail size={18} className="text-primary" />
                        Account Email
                    </h3>
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>

                {/* Change Password */}
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
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>

                {/* Recovery Secret */}
                <div className="pt-4 border-t border-border">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                        <ShieldAlert size={18} className="text-primary" />
                        Recovery Secret Code
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                        Used to reset your password if you get locked out. Current: <span className="font-mono text-primary font-bold">{currentSecret}</span>
                    </p>
                    <input
                        type="password"
                        value={secretPhrase}
                        onChange={(e) => setSecretPhrase(e.target.value)}
                        placeholder="Set a new secret recovery phrase..."
                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminSettings;
