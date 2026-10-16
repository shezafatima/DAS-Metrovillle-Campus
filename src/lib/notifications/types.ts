/** data-model.md "NotificationItem" — a message or a career application as shown in the bell panel. */
export interface NotificationItem {
  kind: "message" | "application" | "registration";
  id: string;
  /** message: sender's name · application: applicant's name · registration: `Registration <reference>` (never a name) */
  title: string;
  /** message: subject · application: qualification · registration: the class */
  description: string;
  /** ISO — message: createdAt · application: createdAt */
  timestamp: string;
  /** message: `/admin/messages/${id}` · application: `/admin/careers/${id}` */
  /** registration: `/admin/registrations/${id}` */
  href: string;
}

/**
 * Who is looking (011 FR-010): a user's id plus what they may use. Message
 * data needs `messages`; application data needs `careers`; registrations (013)
 * need the main-admin role: for anyone else the kind is never queried, counted or listed (013 FR-039).
 */
export interface NotificationViewer {
  userId: string;
  role: "main_admin" | "content_manager";
  permissions: readonly string[];
}

export interface NotificationsSummary {
  messagesNew: number;
  applicationsNew: number;
  /** Main admin only; 0 for everyone else (013). */
  registrationsNew: number;
  /** Newest first, at most 10, mixed kinds. */
  items: NotificationItem[];
}
