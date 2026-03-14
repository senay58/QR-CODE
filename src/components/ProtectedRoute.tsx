import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute: React.FC<{ children: React.ReactNode, allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
    const { user, role, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="h-screen flex items-center justify-center p-4 text-lg font-bold animate-pulse">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // Allow access if no specific roles required, or role matches, or role not yet resolved
    if (allowedRoles && role && !allowedRoles.includes(role)) {
        return <Navigate to="/admin/login" replace />;
    }

    return <>{children}</>;
};

