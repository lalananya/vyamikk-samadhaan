// app/dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, Alert, ScrollView } from 'react-native';
import { apiFetch } from '../src/api';
import { clearToken } from '../src/auth';
import { router } from 'expo-router';

export default function Dashboard() {
    const [me, setMe] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiFetch('/me'); // throws on non-2xx
            setMe(data);
        } catch (e: any) {
            const msg = e?.message ?? String(e);
            // if token is bad/expired, kick back to login
            if (/401|unauthorized/i.test(msg)) {
                await clearToken();
                router.replace('/');
                return;
            }
            Alert.alert('Session check failed', msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <View style={{ flex: 1, padding: 24, gap: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: '700' }}>Dashboard</Text>

            <Button title={loading ? 'Refreshing…' : 'Refresh'} onPress={load} disabled={loading} />

            <ScrollView style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 12 }}>
                <Text selectable style={{ fontFamily: 'Courier', fontSize: 12 }}>
                    {me ? JSON.stringify(me, null, 2) : loading ? 'Loading /me…' : 'No data'}
                </Text>
            </ScrollView>

            <Button
                title="Log out"
                onPress={async () => {
                    await clearToken();
                    router.replace('/');
                }}
            />
        </View>
    );
}
