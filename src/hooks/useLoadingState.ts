/**
 * Reusable loading state management hook to eliminate duplicate loading logic
 */

import { useState, useCallback } from "react";

export interface LoadingState {
    isLoading: boolean;
    error: string | null;
    data: any;
}

export interface UseLoadingStateOptions {
    initialData?: any;
    onError?: (error: string) => void;
    onSuccess?: (data: any) => void;
}

export function useLoadingState(options: UseLoadingStateOptions = {}) {
    const { initialData = null, onError, onSuccess } = options;

    const [state, setState] = useState<LoadingState>({
        isLoading: false,
        error: null,
        data: initialData,
    });

    const setLoading = useCallback((isLoading: boolean) => {
        setState(prev => ({ ...prev, isLoading }));
    }, []);

    const setError = useCallback((error: string | null) => {
        setState(prev => ({ ...prev, error }));
        if (error && onError) {
            onError(error);
        }
    }, [onError]);

    const setData = useCallback((data: any) => {
        setState(prev => ({ ...prev, data }));
        if (onSuccess) {
            onSuccess(data);
        }
    }, [onSuccess]);

    const reset = useCallback(() => {
        setState({
            isLoading: false,
            error: null,
            data: initialData,
        });
    }, [initialData]);

    const execute = useCallback(async <T>(
        asyncFn: () => Promise<T>,
        options: {
            onSuccess?: (data: T) => void;
            onError?: (error: string) => void;
            resetError?: boolean;
        } = {}
    ): Promise<T | null> => {
        const { onSuccess: onExecuteSuccess, onError: onExecuteError, resetError = true } = options;

        if (resetError) {
            setError(null);
        }

        setLoading(true);

        try {
            const result = await asyncFn();
            setData(result);

            if (onExecuteSuccess) {
                onExecuteSuccess(result);
            }

            return result;
        } catch (error: any) {
            console.log("🚨 useLoadingState caught error:", error);
            console.log("🚨 Error type:", typeof error);
            console.log("🚨 Error message:", error?.message);
            console.log("🚨 Error status:", error?.status);
            console.log("🚨 Error code:", error?.code);

            const errorMessage = error?.message || "An error occurred";
            setError(errorMessage);

            if (onExecuteError) {
                onExecuteError(errorMessage);
            }

            return null;
        } finally {
            setLoading(false);
        }
    }, [setError, setData, setLoading]);

    return {
        ...state,
        setLoading,
        setError,
        setData,
        reset,
        execute,
    };
}

/**
 * Hook for managing multiple loading states
 */
export function useMultipleLoadingStates<T extends Record<string, any>>(
    initialStates: T
) {
    const [states, setStates] = useState<T>(initialStates);

    const setLoading = useCallback(<K extends keyof T>(
        key: K,
        isLoading: boolean
    ) => {
        setStates(prev => ({
            ...prev,
            [key]: { ...prev[key], isLoading },
        }));
    }, []);

    const setError = useCallback(<K extends keyof T>(
        key: K,
        error: string | null
    ) => {
        setStates(prev => ({
            ...prev,
            [key]: { ...prev[key], error },
        }));
    }, []);

    const setData = useCallback(<K extends keyof T>(
        key: K,
        data: any
    ) => {
        setStates(prev => ({
            ...prev,
            [key]: { ...prev[key], data },
        }));
    }, []);

    const reset = useCallback(<K extends keyof T>(key: K) => {
        setStates(prev => ({
            ...prev,
            [key]: { isLoading: false, error: null, data: null },
        }));
    }, []);

    const resetAll = useCallback(() => {
        setStates(initialStates);
    }, [initialStates]);

    return {
        states,
        setLoading,
        setError,
        setData,
        reset,
        resetAll,
    };
}

/**
 * Hook for managing pagination loading state
 */
export interface PaginationState {
    isLoading: boolean;
    isLoadingMore: boolean;
    isRefreshing: boolean;
    error: string | null;
    data: any[];
    hasMore: boolean;
    offset: number;
}

export function usePaginationLoadingState(initialData: any[] = []) {
    const [state, setState] = useState<PaginationState>({
        isLoading: false,
        isLoadingMore: false,
        isRefreshing: false,
        error: null,
        data: initialData,
        hasMore: true,
        offset: 0,
    });

    const setLoading = useCallback((isLoading: boolean) => {
        setState(prev => ({ ...prev, isLoading }));
    }, []);

    const setLoadingMore = useCallback((isLoadingMore: boolean) => {
        setState(prev => ({ ...prev, isLoadingMore }));
    }, []);

    const setRefreshing = useCallback((isRefreshing: boolean) => {
        setState(prev => ({ ...prev, isRefreshing }));
    }, []);

    const setError = useCallback((error: string | null) => {
        setState(prev => ({ ...prev, error }));
    }, []);

    const setData = useCallback((data: any[], replace: boolean = false) => {
        setState(prev => ({
            ...prev,
            data: replace ? data : [...prev.data, ...data],
        }));
    }, []);

    const setHasMore = useCallback((hasMore: boolean) => {
        setState(prev => ({ ...prev, hasMore }));
    }, []);

    const setOffset = useCallback((offset: number) => {
        setState(prev => ({ ...prev, offset }));
    }, []);

    const reset = useCallback(() => {
        setState({
            isLoading: false,
            isLoadingMore: false,
            isRefreshing: false,
            error: null,
            data: initialData,
            hasMore: true,
            offset: 0,
        });
    }, [initialData]);

    const loadMore = useCallback(async (
        loadFn: (offset: number) => Promise<{ data: any[]; hasMore: boolean }>
    ) => {
        if (state.isLoadingMore || !state.hasMore) return;

        setLoadingMore(true);
        setError(null);

        try {
            const result = await loadFn(state.offset);
            setData(result.data);
            setHasMore(result.hasMore);
            setOffset(prev => prev + result.data.length);
        } catch (error: any) {
            setError(error.message || "Failed to load more data");
        } finally {
            setLoadingMore(false);
        }
    }, [state.isLoadingMore, state.hasMore, state.offset, setLoadingMore, setError, setData, setHasMore, setOffset]);

    const refresh = useCallback(async (
        loadFn: (offset: number) => Promise<{ data: any[]; hasMore: boolean }>
    ) => {
        setRefreshing(true);
        setError(null);
        setOffset(0);

        try {
            const result = await loadFn(0);
            setData(result.data, true);
            setHasMore(result.hasMore);
            setOffset(result.data.length);
        } catch (error: any) {
            setError(error.message || "Failed to refresh data");
        } finally {
            setRefreshing(false);
        }
    }, [setRefreshing, setError, setOffset, setData, setHasMore]);

    return {
        ...state,
        setLoading,
        setLoadingMore,
        setRefreshing,
        setError,
        setData,
        setHasMore,
        setOffset,
        reset,
        loadMore,
        refresh,
    };
}

