/** data-model.md "NotificationItem" — a message or signup as shown in the bell panel. */
export interface NotificationItem {
  kind: "message" | "signup";
  id: string;
  /** message: sender's name · signup: name */
  title: string;
  /** message: subject · signup: email */
  description: string;
  /** ISO — message: createdAt · signup: lastSignupAt */
  timestamp: string;
  /** message: `/admin/messages/${id}` · signup: `/admin/signups` */
  href: string;
}

/**
 * Who is looking (011 FR-010): a user's id plus what they may use. Message
 * data needs `messages`; signup data needs `careers`; registrations (013)
 * will need the main-admin role and are never part of this summary.
 */
export interface NotificationViewer {
  userId: string;
  role: "main_admin" | "content_manager";
  permissions: readonly string[];
}

export interface NotificationsSummary {
  messagesNew: number;
  signupsNew: number;
  /** Newest first, at most 10, mixed kinds. */
  items: NotificationItem[];
}
