const mongoose = require('mongoose');

const ConsentSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    phone: {
        type: String,
        required: true,
        index: true
    },
    // General consents
    termsOfService: {
        accepted: { type: Boolean, default: false },
        acceptedAt: Date,
        version: String
    },
    privacyPolicy: {
        accepted: { type: Boolean, default: false },
        acceptedAt: Date,
        version: String
    },

    // Data collection consents (matching Slack's pattern)
    personalInfo: {
        name: { type: Boolean, default: false },
        email: { type: Boolean, default: false },
        phone: { type: Boolean, default: false },
        userId: { type: Boolean, default: false }
    },

    appActivity: {
        interactions: { type: Boolean, default: false },
        searchHistory: { type: Boolean, default: false },
        userGeneratedContent: { type: Boolean, default: false },
        otherActions: { type: Boolean, default: false }
    },

    messages: {
        inAppMessages: { type: Boolean, default: false }
    },

    audio: {
        voiceRecordings: { type: Boolean, default: false },
        audioFiles: { type: Boolean, default: false }
    },

    location: {
        approximateLocation: { type: Boolean, default: false },
        preciseLocation: { type: Boolean, default: false },
        geofencing: { type: Boolean, default: false }
    },

    media: {
        photos: { type: Boolean, default: false },
        videos: { type: Boolean, default: false }
    },

    contacts: {
        contacts: { type: Boolean, default: false }
    },

    deviceInfo: {
        deviceIds: { type: Boolean, default: false },
        crashLogs: { type: Boolean, default: false },
        diagnostics: { type: Boolean, default: false }
    },

    // Notification preferences
    notifications: {
        push: { type: Boolean, default: false },
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false }
    },

    // Analytics and marketing
    analytics: {
        usageAnalytics: { type: Boolean, default: false },
        performanceAnalytics: { type: Boolean, default: false },
        marketingAnalytics: { type: Boolean, default: false }
    },

    // Data retention and processing
    dataRetention: {
        profileData: { type: Boolean, default: false },
        attendanceData: { type: Boolean, default: false },
        locationData: { type: Boolean, default: false },
        mediaData: { type: Boolean, default: false }
    },

    // Audit trail
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: String,
    ipAddress: String,
    userAgent: String,

    // Compliance flags
    gdprCompliant: { type: Boolean, default: false },
    ccpaCompliant: { type: Boolean, default: false },
    dataProcessingBasis: {
        type: String,
        enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'],
        default: 'consent'
    }
}, {
    timestamps: true
});

// Index for efficient queries
ConsentSchema.index({ userId: 1, phone: 1 });
ConsentSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('Consent', ConsentSchema);

