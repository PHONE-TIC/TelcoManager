import React, { createContext, useContext, useState, useRef } from 'react';

type Direction = 'left' | 'right' | 'none';

interface TabTransitionContextType {
    direction: Direction;
    setDirection: (dir: Direction) => void;
    handleTabChange: (newRouteName: string) => void;
}

const TabTransitionContext = createContext<TabTransitionContextType>({
    direction: 'none',
    setDirection: () => { },
    handleTabChange: () => { },
});

export const useTabTransition = () => useContext(TabTransitionContext);

const TAB_ORDER = ['DashboardTab', 'PlanningTab', 'StockTab'];

export const TabTransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [direction, setDirection] = useState<Direction>('none');
    const previousRoute = useRef<string>('DashboardTab');

    const handleTabChange = (newRouteName: string) => {
        const prevIndex = TAB_ORDER.indexOf(previousRoute.current);
        const newIndex = TAB_ORDER.indexOf(newRouteName);

        if (prevIndex === -1 || newIndex === -1 || prevIndex === newIndex) {
            setDirection('none');
        } else if (newIndex > prevIndex) {
            setDirection('right'); // Moving to right, entering from right (slide left)
        } else {
            setDirection('left'); // Moving to left, entering from left (slide right)
        }
        previousRoute.current = newRouteName;
    };

    return (
        <TabTransitionContext.Provider value={{ direction, setDirection, handleTabChange }}>
            {children}
        </TabTransitionContext.Provider>
    );
};
