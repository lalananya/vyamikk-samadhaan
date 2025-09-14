import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { appState } from '../src/state/AppState';

const LANGUAGE_OPTIONS = [
    {
        code: 'EN',
        label: 'English',
        nativeLabel: 'English',
        flag: '🇺🇸',
        description: 'Continue in English'
    },
    {
        code: 'HI',
        label: 'Hindi',
        nativeLabel: 'हिन्दी',
        flag: '🇮🇳',
        description: 'हिन्दी में जारी रखें'
    },
];

export default function LanguageSelection() {
    const [selectedLanguage, setSelectedLanguage] = useState<string>('EN');
    const [isLoading, setIsLoading] = useState(false);

    const handleLanguageSelect = async (languageCode: string) => {
        setSelectedLanguage(languageCode);
        setIsLoading(true);

        try {
            // Save language preference
            await appState.setLanguage(languageCode);

            // Small delay for better UX
            setTimeout(() => {
                setIsLoading(false);
                // Navigate to the next screen (post-login gate or profile wizard)
                router.replace('/post-login-gate');
            }, 500);
        } catch (error) {
            console.error('Failed to save language preference:', error);
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="globe" size={48} color="#007AFF" />
                    </View>
                    <Text style={styles.title}>Choose Your Language</Text>
                    <Text style={styles.subtitle}>
                        Select your preferred language for the app
                    </Text>
                </View>

                <View style={styles.languageContainer}>
                    {LANGUAGE_OPTIONS.map((language) => (
                        <TouchableOpacity
                            key={language.code}
                            style={[
                                styles.languageCard,
                                selectedLanguage === language.code && styles.languageCardSelected,
                            ]}
                            onPress={() => handleLanguageSelect(language.code)}
                            disabled={isLoading}
                        >
                            <View style={styles.languageFlag}>
                                <Text style={styles.flagEmoji}>{language.flag}</Text>
                            </View>

                            <View style={styles.languageInfo}>
                                <Text style={[
                                    styles.languageLabel,
                                    selectedLanguage === language.code && styles.languageLabelSelected,
                                ]}>
                                    {language.nativeLabel}
                                </Text>
                                <Text style={[
                                    styles.languageDescription,
                                    selectedLanguage === language.code && styles.languageDescriptionSelected,
                                ]}>
                                    {language.description}
                                </Text>
                            </View>

                            {selectedLanguage === language.code && (
                                <View style={styles.selectedIndicator}>
                                    <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.continueButton,
                            isLoading && styles.continueButtonDisabled,
                        ]}
                        onPress={() => handleLanguageSelect(selectedLanguage)}
                        disabled={isLoading}
                    >
                        <Text style={styles.continueButtonText}>
                            {isLoading ? 'Setting up...' : 'Continue'}
                        </Text>
                        <Ionicons
                            name={isLoading ? "hourglass" : "arrow-forward"}
                            size={20}
                            color="#ffffff"
                            style={styles.continueIcon}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: 60,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#cccccc',
        textAlign: 'center',
        lineHeight: 22,
    },
    languageContainer: {
        flex: 1,
        justifyContent: 'center',
        gap: 16,
    },
    languageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    languageCardSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    languageFlag: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    flagEmoji: {
        fontSize: 24,
    },
    languageInfo: {
        flex: 1,
    },
    languageLabel: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 4,
    },
    languageLabelSelected: {
        color: '#ffffff',
    },
    languageDescription: {
        fontSize: 14,
        color: '#cccccc',
    },
    languageDescriptionSelected: {
        color: '#e0e0e0',
    },
    selectedIndicator: {
        marginLeft: 12,
    },
    footer: {
        paddingBottom: 40,
    },
    continueButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueButtonDisabled: {
        backgroundColor: '#666666',
    },
    continueButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    continueIcon: {
        marginLeft: 4,
    },
});
