import React, { useMemo } from 'react';

interface UserAvatarProps {
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ name, size = 'md', className = '' }) => {
    // Generate initials (max 2 chars)
    const initials = useMemo(() => {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }, [name]);

    // Generate deterministic color based on name
    const bgColor = useMemo(() => {
        const colors = [
            '#ef4444', // red-500
            '#f97316', // orange-500
            '#f59e0b', // amber-500
            '#84cc16', // lime-500
            '#10b981', // emerald-500
            '#06b6d4', // cyan-500
            '#3b82f6', // blue-500
            '#6366f1', // indigo-500
            '#8b5cf6', // violet-500
            '#d946ef', // fuchsia-500
            '#f43f5e', // rose-500
        ];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colors[Math.abs(hash) % colors.length];
    }, [name]);

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-16 h-16 text-xl',
    };

    return (
        <div
            className={`rounded-full flex items-center justify-center font-bold text-white shadow-sm ${sizeClasses[size]} ${className}`}
            style={{ backgroundColor: bgColor }}
            title={name}
        >
            {initials}
        </div>
    );
};

export default UserAvatar;
