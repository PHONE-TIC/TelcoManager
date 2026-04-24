import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop-compact' | 'desktop';

interface UseResponsiveReturn {
    device: DeviceType;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    width: number;
    height: number;
}

export const useResponsive = (): UseResponsiveReturn => {
    const [dimensions, setDimensions] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });

    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getDevice = (): DeviceType => {
        if (dimensions.width < 769) return 'mobile';
        if (dimensions.width < 1025) return 'tablet';
        if (dimensions.width < 1400) return 'desktop-compact';
        return 'desktop';
    };

    const device = getDevice();

    return {
        device,
        isMobile: device === 'mobile',
        isTablet: device === 'tablet',
        isDesktop: device === 'desktop' || device === 'desktop-compact',
        width: dimensions.width,
        height: dimensions.height
    };
};
