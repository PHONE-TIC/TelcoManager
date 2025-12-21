import React, { useRef, useEffect, useCallback } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

interface FadeWrapperProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    duration?: number;
}

export const FadeWrapper: React.FC<FadeWrapperProps> = ({
    children,
    style,
    duration = 200 // Fast but noticeable fade
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        useCallback(() => {
            // Reset opacity to 0 visually before animating? 
            // Better behavior: Start from 0 and animate to 1
            fadeAnim.setValue(0);

            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: duration,
                useNativeDriver: true,
            }).start();

            return () => {
                // Optional: Fade out on blur? usually overkill for tabs
                // fadeAnim.setValue(0);
            };
        }, [fadeAnim, duration])
    );

    return (
        <Animated.View style={[{ flex: 1, opacity: fadeAnim }, style]}>
            {children}
        </Animated.View>
    );
};
