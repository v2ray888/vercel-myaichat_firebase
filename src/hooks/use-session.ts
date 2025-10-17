
"use client"

import { useState, useEffect } from 'react';

type Session = {
    userId: string;
    name: string | null;
    email: string;
}

export function useSession() {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSession = async () => {
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
        };

        fetchSession();
    }, []);

    return { session, isLoading };
}
