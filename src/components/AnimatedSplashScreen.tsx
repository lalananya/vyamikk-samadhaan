import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import AnimatedLogo from './AnimatedLogo';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
    message?: string;
    submessage?: string;
}

const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
    message = "Vyamikk Samadhaan",
    submessage = "Loading..."
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <AnimatedLogo size={150} showAnimation={true} />
                <Text style={styles.title}>{message}</Text>
                <Text style={styles.subtitle}>{submessage}</Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Designed & developed by{" "}
                    <Text style={styles.footerBrand}>Special</Text>
                </Text>
                <Text style={styles.footerSubtext}>
                    Empowering MSMEs with smart workforce management
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginTop: 30,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    footerText: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
    },
    footerBrand: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    footerSubtext: {
        color: '#444',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
    },
});

export default AnimatedSplashScreen;

