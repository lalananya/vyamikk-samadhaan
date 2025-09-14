import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Clipboard
} from 'react-native';
import { useRouter } from 'expo-router';
import NavigationHeader from '../src/components/NavigationHeader';
import { appState } from '../src/state/AppState';
import { authService } from '../src/api/auth';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ueid, setUeid] = useState<string>('');

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // In development mode, use local user data instead of API call
      const localUser = appState.getUser();
      if (localUser) {
        setUser(localUser);
        
        // Use stored UEID or generate one for display
        if (localUser.ueid) {
          setUeid(localUser.ueid);
        } else if (localUser.pin) {
          // Generate UEID using the same logic as profile wizard
          const randomPart1 = Math.random().toString(36).substr(2, 4).toUpperCase();
          const randomPart2 = Math.random().toString(36).substr(2, 4).toUpperCase();
          const generatedUeid = `VS-${localUser.pin}-${randomPart1}-${randomPart2}`;
          setUeid(generatedUeid);
        }
      } else {
        // Fallback to API call if no local user data
        const userData = await authService.getMe();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const copyUEID = async () => {
    try {
      await Clipboard.setString(ueid);
      Alert.alert('Copied', 'UEID copied to clipboard');
    } catch (error) {
      console.error('Failed to copy UEID:', error);
      Alert.alert('Error', 'Failed to copy UEID');
    }
  };

  const handleLogout = async () => {
    try {
      await appState.clearAllData();
      router.replace('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
      router.replace('/login');
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'company': return 'Company/Org';
      case 'professional': return 'Professional';
      case 'employee': return 'Employee';
      default: return role;
    }
  };

  const getRoleBasedActions = () => {
    if (user?.role === 'company') {
      return [
        {
          icon: 'person-add',
          title: 'Onboard Employee',
          subtitle: 'Add via UEID or mobile number',
          onPress: () => Alert.alert('Coming Soon', 'Employee onboarding feature')
        },
        {
          icon: 'shield-checkmark',
          title: 'Onboard Supervisor',
          subtitle: 'Assign petty cash management',
          onPress: () => Alert.alert('Coming Soon', 'Supervisor onboarding feature')
        },
        {
          icon: 'people',
          title: 'Manage Team',
          subtitle: 'View and manage your workforce',
          onPress: () => Alert.alert('Coming Soon', 'Team management feature')
        },
        {
          icon: 'analytics',
          title: 'Business Analytics',
          subtitle: 'View company performance metrics',
          onPress: () => Alert.alert('Coming Soon', 'Analytics feature')
        },
        {
          icon: 'business',
          title: 'Company Profile',
          subtitle: 'Manage company information',
          onPress: () => Alert.alert('Coming Soon', 'Company profile management')
        }
      ];
    } else if (user?.role === 'professional') {
      return [
        {
          icon: 'briefcase',
          title: 'Professional Services',
          subtitle: 'Manage your service offerings',
          onPress: () => Alert.alert('Coming Soon', 'Professional services feature')
        },
        {
          icon: 'people',
          title: 'Client Network',
          subtitle: 'Connect with potential clients',
          onPress: () => Alert.alert('Coming Soon', 'Client network feature')
        },
        {
          icon: 'document-text',
          title: 'Document Library',
          subtitle: 'Store and manage documents',
          onPress: () => Alert.alert('Coming Soon', 'Document library feature')
        },
        {
          icon: 'calendar',
          title: 'Appointments',
          subtitle: 'Schedule and manage meetings',
          onPress: () => Alert.alert('Coming Soon', 'Appointments feature')
        }
      ];
    } else {
      return [
        {
          icon: 'cash',
          title: 'View Earnings',
          subtitle: 'Track your income and payments',
          onPress: () => Alert.alert('Coming Soon', 'Earnings feature')
        },
        {
          icon: 'time',
          title: 'Attendance History',
          subtitle: 'View your work hours and attendance',
          onPress: () => Alert.alert('Coming Soon', 'Attendance feature')
        },
        {
          icon: 'people',
          title: 'Team Directory',
          subtitle: 'Connect with colleagues',
          onPress: () => Alert.alert('Coming Soon', 'Team directory feature')
        },
        {
          icon: 'briefcase',
          title: 'Job Assignments',
          subtitle: 'View current and upcoming tasks',
          onPress: () => Alert.alert('Coming Soon', 'Job assignments feature')
        }
      ];
    }
  };

  const getRoleBasedMetrics = () => {
    if (user?.role === 'company') {
      return [
        { label: 'Employees', value: '12', icon: 'people' },
        { label: 'Active Projects', value: '5', icon: 'briefcase' },
        { label: 'Revenue', value: '₹2,45,000', icon: 'trending-up' }
      ];
    } else if (user?.role === 'professional') {
      return [
        { label: 'Clients', value: '24', icon: 'people' },
        { label: 'Services', value: '8', icon: 'briefcase' },
        { label: 'Earnings', value: '₹45,000', icon: 'cash' }
      ];
    } else {
      return [
        { label: 'Hours This Week', value: '42', icon: 'time' },
        { label: 'Earnings', value: '₹15,750', icon: 'cash' },
        { label: 'Team Members', value: '12', icon: 'people' }
      ];
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="Profile"
          showBackButton={true}
          onBackPress={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  const fullName = user?.fullName || user?.profile?.fullName || user?.profile?.name || 'User';
  const role = getRoleDisplayName(user?.role || '');
  const roleSpecificName = user?.roleSpecificName || '';
  const metrics = getRoleBasedMetrics();
  const actions = getRoleBasedActions();

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Profile"
        showBackButton={true}
        onBackPress={() => router.back()}
        rightComponent={
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            </View>
            <View style={styles.statusDot} />
          </View>
          
          <Text style={styles.profileName}>{fullName}</Text>
          {roleSpecificName && (
            <Text style={styles.roleSpecificText}>{roleSpecificName}</Text>
          )}
          <TouchableOpacity onPress={copyUEID} style={styles.ueidContainer}>
            <Text style={styles.ueidText}>{ueid}</Text>
            <Ionicons name="copy-outline" size={16} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.roleText}>{role} • Active</Text>

          {/* Metrics */}
          <View style={styles.metricsContainer}>
            {metrics.map((metric, index) => (
              <View key={index} style={styles.metricItem}>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Role-Specific Information */}
        {roleSpecificName && (
          <>
            <Text style={styles.sectionTitle}>Profile Details</Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailItem}>
                <Ionicons name="person" size={20} color="#007AFF" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>
                    {user?.role === 'company' ? 'Your Designation' : 
                     user?.role === 'employee' ? 'Designation & Department' : 
                     'Professional Qualification'}
                  </Text>
                  <Text style={styles.detailValue}>{roleSpecificName}</Text>
                </View>
              </View>
              
              {user?.role === 'company' && user?.companyType && (
                <View style={styles.detailItem}>
                  <Ionicons name="business" size={20} color="#007AFF" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Company Type</Text>
                    <Text style={styles.detailValue}>{user.companyType}</Text>
                  </View>
                </View>
              )}
              
              {user?.role === 'employee' && user?.department && (
                <View style={styles.detailItem}>
                  <Ionicons name="business" size={20} color="#007AFF" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Company Name</Text>
                    <Text style={styles.detailValue}>{user.department}</Text>
                  </View>
                </View>
              )}
              
              {user?.role === 'professional' && user?.practiceArea && (
                <View style={styles.detailItem}>
                  <Ionicons name="briefcase" size={20} color="#007AFF" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Practice Area</Text>
                    <Text style={styles.detailValue}>{user.practiceArea}</Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionItem}
              onPress={action.onPress}
            >
              <View style={styles.actionIcon}>
                <Ionicons name={action.icon as any} size={20} color="#007AFF" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsContainer}>
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="person" size={20} color="#8E8E93" />
            <Text style={styles.settingText}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="notifications" size={20} color="#8E8E93" />
            <Text style={styles.settingText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="shield-checkmark" size={20} color="#8E8E93" />
            <Text style={styles.settingText}>Privacy & Security</Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  roleSpecificText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  ueidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ueidText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
    marginRight: 8,
  },
  roleText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    marginTop: 8,
  },
  actionsContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    marginBottom: 24,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#3A3A3C',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  settingsContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#3A3A3C',
  },
  settingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 16,
    flex: 1,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  detailsContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#3A3A3C',
  },
  detailContent: {
    flex: 1,
    marginLeft: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
});