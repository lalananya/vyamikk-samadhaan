/**
 * Centralized strings for the Vyaamik Samadhaan app
 */

export const Strings = {
  // Roles
  ROLES: {
    ORGANISATION: "organisation",
    PROFESSIONAL: "professional",
    ORGANISATION_LABEL: "Organisation",
    PROFESSIONAL_LABEL: "Professional",
  },

  // Role descriptions
  ROLE_DESCRIPTIONS: {
    ORGANISATION: "Post jobs, manage employees, and grow your business",
    PROFESSIONAL:
      "Find jobs, build your career, and connect with opportunities",
  },

  // Common labels
  LABELS: {
    ROLE: "Role",
    ROLE_LOCKED: "Role (locked)",
    REQUEST_ROLE_CHANGE: "Request role change",
    SWITCH_ROLE: "Switch role",
    CHOOSE_ROLE: "Choose your role",
    ORGANISATION: "Organisation",
    PROFESSIONAL: "Professional",
  },

  // Messages
  MESSAGES: {
    ROLE_ALREADY_SET: "Role already set; contact support",
    ROLE_CHANGE_REQUESTED: "Role change request submitted",
    CHOOSE_ROLE_ONCE: "Choose your role to get started",
    ROLE_LOCKED_MESSAGE: "Your role is locked and cannot be changed",
    TICKET_SUBMITTED: "Request submitted",
  },

  // Role change specific labels
  ROLE_CHANGE: {
    ROLE_LOCKED_LABEL: "Role: {{role}} (locked)",
    REQUEST_ROLE_CHANGE: "Request role change",
    SELECT_NEW_ROLE: "Select new role",
    REASON_LABEL: "Reason (min 10 chars)",
    SUBMIT_REQUEST: "Submit request",
    ADMIN_INBOX_TITLE: "Support Inbox",
    APPROVE: "Approve",
    REJECT: "Reject",
    ADMIN_TOKEN_PLACEHOLDER: "Enter admin token",
    SET_TOKEN: "Set Token",
    NO_REQUESTS: "No pending requests",
    LOADING: "Loading...",
    ERROR: "Error",
    SUCCESS: "Success",
  },

  // Dashboard tiles
  DASHBOARD: {
    ORGANISATION: {
      POST_JOBS: "Post Jobs",
      MANAGE_JOBS: "Manage Jobs",
      EMPLOYEES: "Employees",
      TEAM: "Team",
      LEDGER: "Ledger",
      LOI: "LOI",
      ATTENDANCE_APPROVALS: "Attendance Approvals",
      NOTIFICATIONS: "Notifications",
    },
    PROFESSIONAL: {
      FIND_JOBS: "Find Jobs",
      PUNCH_IN_OUT: "Punch In/Out",
      MY_PROFILE: "My Profile",
      NOTIFICATIONS: "Notifications",
      SMART_SEARCH: "Smart Search",
    },
  },

  // Navigation
  NAVIGATION: {
    HOME: "Home",
    PROFILE: "Profile",
    JOBS: "Jobs",
    EMPLOYEES: "Employees",
    LEDGER: "Ledger",
    LOI: "LOI",
    ATTENDANCE: "Attendance",
    SEARCH: "Search",
  },
} as const;

export default Strings;
