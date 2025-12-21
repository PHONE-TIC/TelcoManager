import React, { useRef, useEffect } from 'react';
import { Animated, Dimensions, ViewStyle, StyleProp } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTabTransition } from '../contexts/TabTransitionContext';

interface SlideWrapperProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

const { width } = Dimensions.get('window');

export const SlideWrapper: React.FC<SlideWrapperProps> = ({ children, style }) => {
    const { direction } = useTabTransition();
    const translateX = useRef(new Animated.Value(0)).current;

    // We also use opacity for a smoother effect
    const opacity = useRef(new Animated.Value(0)).current;

    useFocusEffect(
        React.useCallback(() => {
            // Initial position based on direction
            let initialX = 0;
            if (direction === 'right') initialX = width * 0.2; // Enter from right
            if (direction === 'left') initialX = -width * 0.2; // Enter from left

            // If none (first load), start at 0 but fade in
            translateX.setValue(initialX);
            opacity.setValue(0);

            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                    // easing: Easing.out(Easing.cubic) // Default is mostly fine
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();

            return () => {
                // Optional exit animation?
            };
        }, [direction])
    );

    return (
        <Animated.View style={[{ flex: 1, opacity, transform: [{ translateX }] }, style]}>
            {children}
        </Animated.View>
    );
};
