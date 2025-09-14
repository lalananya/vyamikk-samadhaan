import React, { createContext, useContext, useState, useCallback } from 'react';
import { router } from 'expo-router';

interface NavigationContextType {
    canGoBack: boolean;
    goBack: () => void;
    goToHome: () => void;
    goToDashboard: () => void;
    goToLogin: () => void;
    currentRoute: string;
    setCurrentRoute: (route: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentRoute, setCurrentRoute] = useState<string>('');

    const canGoBack = router.canGoBack() || false;

    const goBack = useCallback(() => {
        if (router.canGoBack && router.canGoBack()) {
            router.back();
        } else {
            // Fallback to dashboard if can't go back
            router.replace('/dashboard');
        }
    }, []);

    const goToHome = useCallback(() => {
        router.replace('/dashboard');
    }, []);

    const goToDashboard = useCallback(() => {
        router.replace('/dashboard');
    }, []);

    const goToLogin = useCallback(() => {
        router.replace('/login');
    }, []);

    const value: NavigationContextType = {
        canGoBack,
        goBack,
        goToHome,
        goToDashboard,
        goToLogin,
        currentRoute,
        setCurrentRoute,
    };

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = (): NavigationContextType => {
    const context = useContext(NavigationContext);
    if (context === undefined) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};

export default NavigationContext;
