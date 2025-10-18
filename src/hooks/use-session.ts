
"use client"

import { useState, useEffect, useCallback } from 'react';

type Session = {
    userId: string;
    name: string | null;
    email: string;
}

export function useSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [reload, setReload] = useState(0);

    const fetchSession = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/auth/session');
            if (res.ok) {
                const data = await res.json();
                setSession(data.session);
            } else {
                setSession(null);
            }
        } catch (error) {
            console.error("Failed to fetch session:", error);
            setSession(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSession();
    }, [fetchSession, reload]);

    const forceReload = useCallback(() => {
        setReload(prev => prev + 1);
    }, []);

    return { session, isLoading, forceReload };
}
