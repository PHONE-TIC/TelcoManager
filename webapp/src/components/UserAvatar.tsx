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

    // Generate deterministic gradient colors based on name
    const gradientColors = useMemo(() => {
        const colorPairs = [
            ['#ef4444', '#dc2626'], // red
            ['#f97316', '#ea580c'], // orange
            ['#f59e0b', '#d97706'], // amber
            ['#84cc16', '#65a30d'], // lime
            ['#10b981', '#059669'], // emerald
            ['#06b6d4', '#0891b2'], // cyan
            ['#3b82f6', '#2563eb'], // blue
            ['#6366f1', '#4f46e5'], // indigo
            ['#8b5cf6', '#7c3aed'], // violet
            ['#d946ef', '#c026d3'], // fuchsia
            ['#ec4899', '#db2777'], // pink
        ];

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        return colorPairs[Math.abs(hash) % colorPairs.length];
    }, [name]);

    const sizeStyles: Record<string, { width: string; height: string; fontSize: string; borderWidth: string }> = {
        sm: { width: '40px', height: '40px', fontSize: '14px', borderWidth: '2px' },
        md: { width: '52px', height: '52px', fontSize: '18px', borderWidth: '3px' },
        lg: { width: '64px', height: '64px', fontSize: '22px', borderWidth: '3px' },
        xl: { width: '80px', height: '80px', fontSize: '28px', borderWidth: '4px' },
    };

    const currentSize = sizeStyles[size];

    return (
        <div
            className={className}
            style={{
                width: currentSize.width,
                height: currentSize.height,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: currentSize.fontSize,
                color: 'white',
                background: `linear-gradient(145deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
                boxShadow: `0 4px 14px ${gradientColors[0]}40, 0 2px 6px rgba(0,0,0,0.15)`,
                border: `${currentSize.borderWidth} solid rgba(255,255,255,0.25)`,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                letterSpacing: '0.5px',
                flexShrink: 0,
            }}
            title={name}
        >
            {initials}
        </div>
    );
};

export default UserAvatar;

