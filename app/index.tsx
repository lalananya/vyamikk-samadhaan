
import React, { useState } from "react";
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";
import { postJson } from "../src/api";
// import { saveToken } from "../src/auth";
import { router } from "expo-router";


export default function Login() {
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);

    async function submit() {
        if (!phone) return Alert.alert("Enter phone number");
        setLoading(true);
        try {
            const res = await postJson<{ token: string; user: any }>("/login", { phone, otp });
            // await saveToken(res.token);
            Alert.alert("Success", `Logged in as ${res.user.phone}`);
            router.replace("/dashboard");
        } catch (e: any) {
            Alert.alert("Login failed", e?.message ?? String(e));
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Login</Text>

            <TextInput
                style={styles.input}
                placeholder="Phone"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
            />

            <TextInput
                style={styles.input}
                placeholder="OTP (optional)"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
            />

            {loading ? <ActivityIndicator /> : <Button title="Submit" onPress={submit} />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
    input: {
        width: "100%",
        maxWidth: 420,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: "white",
    },
});
