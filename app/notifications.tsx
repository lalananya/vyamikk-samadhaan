// app/notifications.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { apiFetch } from "../src/api";
import { getToken } from "../src/auth";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "job" | "payment" | "system" | "reminder";
  priority: "high" | "medium" | "low";
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  actionText?: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // In a real app, this would fetch from the backend
      // For now, we'll use mock data
      const mockNotifications: Notification[] = [
        {
          id: "1",
          title: "New Job Match",
          message:
            "A new construction job in Mumbai matches your skills. Apply now!",
          type: "job",
          priority: "high",
          isRead: false,
          createdAt: "2024-01-15T10:30:00Z",
          actionUrl: "/job-search",
          actionText: "View Job",
        },
        {
          id: "2",
          title: "Payment Received",
          message:
            "You have received ₹2,500 for your work on ABC Construction project.",
          type: "payment",
          priority: "high",
          isRead: false,
          createdAt: "2024-01-15T09:15:00Z",
          actionUrl: "/cash-receipts",
          actionText: "View Receipt",
        },
        {
          id: "3",
          title: "Punch In Reminder",
          message: "Don't forget to punch in for your shift at 9:00 AM.",
          type: "reminder",
          priority: "medium",
          isRead: true,
          createdAt: "2024-01-15T08:45:00Z",
          actionUrl: "/punch-in-out",
          actionText: "Punch In",
        },
        {
          id: "4",
          title: "Profile Update Required",
          message:
            "Please update your skills and experience to get better job matches.",
          type: "system",
          priority: "low",
          isRead: true,
          createdAt: "2024-01-14T16:20:00Z",
          actionUrl: "/profile",
          actionText: "Update Profile",
        },
        {
          id: "5",
          title: "Job Application Status",
          message:
            "Your application for the plumbing job has been reviewed. Check for updates.",
          type: "job",
          priority: "medium",
          isRead: true,
          createdAt: "2024-01-14T14:30:00Z",
          actionUrl: "/job-search",
          actionText: "Check Status",
        },
        {
          id: "6",
          title: "Weekly Summary",
          message: "You worked 42 hours this week. Great job!",
          type: "system",
          priority: "low",
          isRead: true,
          createdAt: "2024-01-14T18:00:00Z",
          actionUrl: "/punch-in-out",
          actionText: "View Details",
        },
      ];
      setNotifications(mockNotifications);
    } catch (error) {
      Alert.alert("Error", "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif,
      ),
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, isRead: true })),
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications((prev) =>
      prev.filter((notif) => notif.id !== notificationId),
    );
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "job":
        return "💼";
      case "payment":
        return "💰";
      case "system":
        return "⚙️";
      case "reminder":
        return "⏰";
      default:
        return "📢";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const unreadCount = notifications.filter((notif) => !notif.isRead).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {unreadCount > 0 && (
        <View style={styles.markAllContainer}>
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.notificationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.map((notification) => (
          <TouchableOpacity
            key={notification.id}
            style={[
              styles.notificationCard,
              !notification.isRead && styles.unreadCard,
            ]}
            onPress={() => handleNotificationPress(notification)}
          >
            <View style={styles.notificationHeader}>
              <View style={styles.notificationIcon}>
                <Text style={styles.iconText}>
                  {getNotificationIcon(notification.type)}
                </Text>
              </View>

              <View style={styles.notificationContent}>
                <View style={styles.notificationTitleRow}>
                  <Text
                    style={[
                      styles.notificationTitle,
                      !notification.isRead && styles.unreadTitle,
                    ]}
                  >
                    {notification.title}
                  </Text>
                  <View
                    style={[
                      styles.priorityDot,
                      {
                        backgroundColor: getPriorityColor(
                          notification.priority,
                        ),
                      },
                    ]}
                  />
                </View>

                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>

                <View style={styles.notificationFooter}>
                  <Text style={styles.notificationTime}>
                    {formatDate(notification.createdAt)}
                  </Text>
                  {notification.actionText && (
                    <Text style={styles.actionText}>
                      {notification.actionText} →
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteNotification(notification.id)}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {notifications.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📭</Text>
            <Text style={styles.emptyStateTitle}>No Notifications</Text>
            <Text style={styles.emptyStateMessage}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a1a",
  },
  badge: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  markAllContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  markAllButton: {
    alignSelf: "flex-end",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  markAllText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  notificationsList: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
  },
  notificationCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  unreadTitle: {
    fontWeight: "700",
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationTime: {
    fontSize: 12,
    color: "#6b7280",
  },
  actionText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
});
