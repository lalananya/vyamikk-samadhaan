const mongoose = require('mongoose');

const DataCollectionSchema = new mongoose.Schema({
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

    // Personal Information
    personalInfo: {
        name: String,
        email: String,
        phone: String,
        userId: String,
        profilePhoto: String,
        emergencyContact: {
            name: String,
            phone: String
        }
    },

    // App Activity
    appActivity: {
        interactions: [{
            action: String,
            screen: String,
            timestamp: Date,
            metadata: mongoose.Schema.Types.Mixed
        }],
        searchHistory: [{
            query: String,
            timestamp: Date,
            results: Number
        }],
        userGeneratedContent: [{
            type: String, // 'text', 'image', 'audio', 'video'
            content: String,
            timestamp: Date,
            metadata: mongoose.Schema.Types.Mixed
        }]
    },

    // Location Data
    location: {
        currentLocation: {
            latitude: Number,
            longitude: Number,
            accuracy: Number,
            timestamp: Date
        },
        punchInLocation: {
            latitude: Number,
            longitude: Number,
            accuracy: Number,
            address: String,
            timestamp: Date
        },
        punchOutLocation: {
            latitude: Number,
            longitude: Number,
            accuracy: Number,
            address: String,
            timestamp: Date
        },
        geofenceEvents: [{
            type: String, // 'enter', 'exit'
            geofenceId: String,
            location: {
                latitude: Number,
                longitude: Number
            },
            timestamp: Date
        }]
    },

    // Attendance Data
    attendance: {
        punchIn: {
            timestamp: Date,
            location: {
                latitude: Number,
                longitude: Number,
                accuracy: Number,
                address: String
            },
            method: String, // 'manual', 'geofence', 'qr_code'
            deviceInfo: {
                deviceId: String,
                platform: String,
                version: String
            }
        },
        punchOut: {
            timestamp: Date,
            location: {
                latitude: Number,
                longitude: Number,
                accuracy: Number,
                address: String
            },
            method: String,
            deviceInfo: {
                deviceId: String,
                platform: String,
                version: String
            }
        },
        workHours: Number,
        breakTime: Number,
        overtime: Number
    },

    // Media Data
    media: {
        photos: [{
            filename: String,
            originalName: String,
            mimeType: String,
            size: Number,
            uploadedAt: Date,
            purpose: String, // 'profile', 'attendance', 'incident'
            metadata: mongoose.Schema.Types.Mixed
        }],
        videos: [{
            filename: String,
            originalName: String,
            mimeType: String,
            size: Number,
            duration: Number,
            uploadedAt: Date,
            purpose: String,
            metadata: mongoose.Schema.Types.Mixed
        }],
        audio: [{
            filename: String,
            originalName: String,
            mimeType: String,
            size: Number,
            duration: Number,
            uploadedAt: Date,
            purpose: String,
            metadata: mongoose.Schema.Types.Mixed
        }]
    },

    // Device Information
    deviceInfo: {
        deviceId: String,
        platform: String, // 'android', 'ios'
        version: String,
        model: String,
        manufacturer: String,
        osVersion: String,
        appVersion: String,
        lastSeen: Date
    },

    // Performance Data
    performance: {
        crashLogs: [{
            error: String,
            stackTrace: String,
            timestamp: Date,
            appVersion: String,
            deviceInfo: mongoose.Schema.Types.Mixed
        }],
        diagnostics: [{
            type: String, // 'performance', 'network', 'battery'
            data: mongoose.Schema.Types.Mixed,
            timestamp: Date
        }]
    },

    // Communication Data
    messages: {
        inAppMessages: [{
            messageId: String,
            content: String,
            type: String, // 'notification', 'chat', 'system'
            timestamp: Date,
            read: Boolean
        }],
        pushNotifications: [{
            notificationId: String,
            title: String,
            body: String,
            data: mongoose.Schema.Types.Mixed,
            sentAt: Date,
            deliveredAt: Date,
            openedAt: Date
        }]
    },

    // Data retention and compliance
    dataRetention: {
        personalInfoRetention: Date,
        locationDataRetention: Date,
        mediaDataRetention: Date,
        attendanceDataRetention: Date,
        lastPurged: Date
    },

    // Audit trail
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: String,
    ipAddress: String,
    userAgent: String,

    // Privacy flags
    anonymized: { type: Boolean, default: false },
    pseudonymized: { type: Boolean, default: false },
    encrypted: { type: Boolean, default: true }
}, {
    timestamps: true
});

// Indexes for efficient queries
DataCollectionSchema.index({ userId: 1, phone: 1 });
DataCollectionSchema.index({ 'attendance.punchIn.timestamp': -1 });
DataCollectionSchema.index({ 'location.currentLocation.latitude': 1, 'location.currentLocation.longitude': 1 });
DataCollectionSchema.index({ lastUpdated: -1 });

// TTL indexes for data retention
DataCollectionSchema.index({ 'dataRetention.personalInfoRetention': 1 }, { expireAfterSeconds: 0 });
DataCollectionSchema.index({ 'dataRetention.locationDataRetention': 1 }, { expireAfterSeconds: 0 });
DataCollectionSchema.index({ 'dataRetention.mediaDataRetention': 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('DataCollection', DataCollectionSchema);

