/** data-model.md "NotificationItem" — a message or a career application as shown in the bell panel. */
export interface NotificationItem {
  kind: "message" | "application";
  id: string;
  /** message: sender's name · application: applicant's name */
  title: string;
  /** message: subject · application: qualification */
  description: string;
  /** ISO — message: createdAt · application: createdAt */
  timestamp: string;
  /** message: `/admin/messages/${id}` · application: `/admin/careers/${id}` */
  href: string;
}

/**
 * Who is looking (011 FR-010): a user's id plus what they may use. Message
 * data needs `messages`; application data needs `careers`; registrations (013)
 * will need the main-admin role and are never part of this summary.
 */
export interface NotificationViewer {
  userId: string;
  role: "main_admin" | "content_manager";
  permissions: readonly string[];
}

export interface NotificationsSummary {
  messagesNew: number;
  applicationsNew: number;
  /** Newest first, at most 10, mixed kinds. */
  items: NotificationItem[];
}
