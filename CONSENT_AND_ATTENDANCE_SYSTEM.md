# Vyaamikk Samadhaan - Consent & Attendance System

## Overview

This document outlines the comprehensive consent management and attendance tracking system implemented for the Vyaamikk Samadhaan mobile application, designed to meet enterprise-grade privacy and compliance requirements similar to Slack's data collection practices.

## 🏗️ Architecture

### Backend Components

#### 1. Consent Management (`server/models/Consent.js`)
- **Purpose**: Stores user consent preferences for all data collection activities
- **Data Categories**: Personal Info, App Activity, Location, Media, Contacts, Device Info, Notifications, Analytics
- **Compliance**: GDPR, CCPA compliant with audit trails
- **Retention**: Configurable data retention policies

#### 2. Data Collection (`server/models/DataCollection.js`)
- **Purpose**: Comprehensive data storage matching Slack's collection patterns
- **Categories**:
  - Personal Information (name, email, phone, user ID)
  - App Activity (interactions, search history, user-generated content)
  - Location Data (current, punch in/out locations, geofencing)
  - Attendance Data (punch in/out times, work hours, overtime)
  - Media Data (photos, videos, audio files)
  - Device Information (device IDs, crash logs, diagnostics)
  - Communication Data (in-app messages, push notifications)

#### 3. API Endpoints

##### Consent Management (`/api/v1/consent/`)
- `GET /status` - Get user's current consent status
- `POST /update` - Update consent preferences
- `GET /data-summary` - Get data collection summary
- `POST /export-data` - GDPR data export
- `POST /delete-data` - GDPR data deletion
- `GET /legal-documents` - Get privacy policy and terms versions

##### Attendance Tracking (`/api/v1/attendance/`)
- `POST /punch-in` - Record punch in with location
- `POST /punch-out` - Record punch out with location
- `GET /history` - Get attendance history
- `POST /update-location` - Update current location
- `GET /geofence-status` - Check geofence status

## 📱 Frontend Implementation

### 1. Consent Screen (`app/consent.tsx`)
- **Step 0** of the profile creation flow
- Required consents for attendance system:
  - Terms of Service ✓
  - Privacy Policy ✓
  - Data Storage ✓
  - Location Tracking ✓ (Required for attendance)
- Optional consents:
  - Push Notifications
  - Usage Analytics

### 2. Attendance Screen (`app/attendance.tsx`)
- Real-time location tracking
- Punch in/out functionality
- Work hours calculation
- Location accuracy display
- Geofencing support

### 3. Post-Login Gate (`app/post-login-gate.tsx`)
- Welcome screen after login
- "Create Profile" vs "Ask Me Later" options
- Benefits explanation for profile completion

### 4. Limited Dashboard (`app/dashboard-limited.tsx`)
- Read-only access for users who skip profile creation
- Locked features with upgrade prompts
- Settings access

## 🔐 Privacy & Compliance Features

### Data Collection Categories (Matching Slack's Pattern)

#### Personal Information
- **Name**: Required for attendance system
- **Email**: Optional
- **Phone**: Required for authentication
- **User ID**: Required for system identification

#### App Activity
- **Interactions**: Track user actions for analytics
- **Search History**: Optional, for search improvements
- **User-Generated Content**: Optional, for content features
- **Other Actions**: General app usage tracking

#### Location Data
- **Approximate Location**: Required for attendance tracking
- **Precise Location**: Optional, for geofencing
- **Geofencing**: Required for location-based punch in/out

#### Media Data
- **Photos**: Optional, for profile pictures
- **Videos**: Optional, for incident reporting
- **Audio**: Optional, for voice notes

#### Device Information
- **Device IDs**: Required for security and analytics
- **Crash Logs**: Required for app stability
- **Diagnostics**: Required for performance monitoring

### Compliance Features

#### GDPR Compliance
- ✅ Explicit consent collection
- ✅ Data export functionality
- ✅ Right to deletion
- ✅ Data retention policies
- ✅ Audit trails
- ✅ Lawful basis documentation

#### CCPA Compliance
- ✅ Privacy policy transparency
- ✅ Data collection disclosure
- ✅ Opt-out mechanisms
- ✅ Data deletion rights

## 🚀 Usage Flow

### 1. Initial Setup
```
Login → PostLoginGate → Consent Screen → Profile Wizard → Dashboard
```

### 2. Attendance Tracking
```
Dashboard → Attendance Screen → Location Permission → Punch In/Out
```

### 3. Data Management
```
Settings → Privacy Controls → Data Export/Deletion
```

## 📊 Data Retention Policies

### Automatic Expiration (TTL Indexes)
- **Personal Info**: 7 years (legal requirement)
- **Location Data**: 1 year (privacy optimization)
- **Media Data**: 2 years (storage optimization)
- **Attendance Data**: 7 years (legal requirement)

### Manual Deletion
- User-initiated data deletion
- Admin-initiated account deletion
- Compliance-required data purging

## 🔧 Technical Implementation

### Database Schema
- **MongoDB** with Mongoose ODM
- **Indexed queries** for performance
- **TTL indexes** for automatic data expiration
- **Audit trails** for compliance

### Location Services
- **Expo Location** for React Native
- **Accuracy levels**: Balanced for battery optimization
- **Geofencing**: Support for location-based attendance
- **Address resolution**: Reverse geocoding for user-friendly display

### Security Features
- **JWT authentication** for all API calls
- **Encrypted data storage** in database
- **IP address logging** for audit trails
- **User agent tracking** for security

## 📈 Analytics & Monitoring

### Data Collection Metrics
- Consent acceptance rates
- Location accuracy statistics
- Attendance pattern analysis
- App usage analytics

### Performance Monitoring
- API response times
- Database query performance
- Location service reliability
- Error rate tracking

## 🛡️ Security Considerations

### Data Protection
- All sensitive data encrypted at rest
- Secure API endpoints with authentication
- Regular security audits
- Compliance with data protection regulations

### Privacy Controls
- Granular consent management
- User data export capabilities
- Right to deletion implementation
- Transparent data collection policies

## 📋 Testing Checklist

### Consent Flow
- [ ] Required consents enforced
- [ ] Optional consents work correctly
- [ ] Backend consent storage
- [ ] Data export functionality
- [ ] Data deletion functionality

### Attendance Tracking
- [ ] Location permission handling
- [ ] Punch in/out with location
- [ ] Work hours calculation
- [ ] Geofencing detection
- [ ] Data persistence

### Privacy Compliance
- [ ] GDPR compliance features
- [ ] CCPA compliance features
- [ ] Data retention policies
- [ ] Audit trail logging
- [ ] User privacy controls

## 🔄 Future Enhancements

### Planned Features
- **Biometric authentication** for punch in/out
- **QR code scanning** for location verification
- **Advanced geofencing** with multiple zones
- **Real-time notifications** for attendance events
- **Manager dashboard** for attendance oversight
- **Integration with HR systems**

### Compliance Updates
- **Regular privacy policy updates**
- **New regulation compliance** (as they emerge)
- **Enhanced data protection** measures
- **Improved user controls**

## 📞 Support & Maintenance

### Monitoring
- Real-time error tracking
- Performance monitoring
- User feedback collection
- Compliance audit trails

### Updates
- Regular security patches
- Feature enhancements
- Compliance updates
- Performance optimizations

---

This system provides enterprise-grade consent management and attendance tracking while maintaining user privacy and regulatory compliance. The implementation follows industry best practices and is designed to scale with the application's growth.

