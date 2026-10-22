/**
 * Admin area copy and navigation structure (Constitution VI — page copy
 * lives in content files, not hardcoded inside components).
 */

import { canAccess, type Access, type Role } from "@/lib/permissions";

export interface AdminNavItem {
  label: string;
  href: string;
  /** Who sees this item (011). Presentation only — pages enforce it themselves. */
  access: Access;
}

// Fixed order per FR-021: Overview, News, Messages, Applications (012, replaced Signups), Settings; 011 adds Users (main admin).
export const adminNavItems: AdminNavItem[] = [
  { label: "Overview", href: "/admin", access: "any" },
  { label: "News", href: "/admin/news", access: "news" },
  { label: "Messages", href: "/admin/messages", access: "messages" },
  { label: "Applications", href: "/admin/careers", access: "careers" },
  // 013: student registrations, main admin only (a content manager never sees the item).
  { label: "Registrations", href: "/admin/registrations", access: "main_admin" },
  // 014: either key opens Settings (Site-wide needs settings; the page tabs need pages).
  { label: "Settings", href: "/admin/settings", access: "settings_or_pages" },
  { label: "Users", href: "/admin/users", access: "main_admin" },
];

/** The nav items this user may use (011 FR-010). Presentation only. */
export function visibleNavItems(user: { role: Role; permissions: readonly string[] }): AdminNavItem[] {
  return adminNavItems.filter((item) => canAccess(user, item.access));
}

// Admin pages that aren't sidebar items but still need a top-bar title
// (010: the Account page is reached from the profile menu only).
export const adminExtraPageTitles: Record<string, string> = {
  "/admin/account": "Account",
  "/admin/users/activity": "Change record",
  // 014: Settings tabs, one per public page plus Site-wide (the sidebar item itself is "Settings").
  "/admin/settings/site-wide": "Site-wide",
  "/admin/settings/home": "Home",
  "/admin/settings/admission": "Admission",
  "/admin/settings/resources": "Resources",
};

export const loginCopy = {
  title: "Admin sign in",
  emailLabel: "Email",
  passwordLabel: "Password",
  submit: "Sign in",
  logout: "Logout",
  errors: {
    // Identical for wrong email, wrong password, and non-existent
    // account (FR-009) — never reveals which case applies.
    generic: "The email or password is incorrect.",
    blocked: "Too many attempts. Please try again later.",
    unavailable: "The service is temporarily unavailable. Please try again later.",
  },
} as const;

// Shown by src/app/admin/error.tsx when an admin page itself fails to
// render — in practice, the data store being unreachable (002 FR-014).
// Generic on purpose: no host names, error text or stack traces.
export const unavailableCopy = {
  title: "Service temporarily unavailable",
  body: loginCopy.errors.unavailable,
  retry: "Try again",
} as const;

export const placeholderCopy = {
  comingSoon: "This section hasn't been built yet — its content is coming in a later feature.",
} as const;

// News (003) admin copy: list, filters, editor and their messages.
export const newsCopy = {
  pageTitle: "News",
  newPost: "New post",
  table: {
    headers: {
      cover: "Cover",
      title: "Title",
      status: "Status",
      category: "Category",
      date: "Publish date",
      actions: "Actions",
    },
    empty: "No posts yet.",
    scheduled: "Scheduled",
    edit: "Edit",
    delete: "Delete",
  },
  filters: {
    searchPlaceholder: "Search by title…",
    statusAll: "All",
    statusDraft: "Draft",
    statusPublished: "Published",
    categoryAll: "All categories",
  },
  pagination: {
    previous: "Previous",
    next: "Next",
    pageOf: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
  },
  deleteDialog: {
    title: "Delete this post?",
    body: "This can be undone later by a developer — nothing is permanently deleted (soft delete). It will disappear from this list and from the public site immediately.",
    confirm: "Delete",
    cancel: "Cancel",
  },
  editor: {
    fields: {
      title: "Title",
      slug: "Address",
      slugHint: "Suggested from the title. You can edit it — it must be unique.",
      language: "Language",
      languageEn: "English",
      languageUr: "Urdu",
      category: "Category",
      publishDate: "Publish date",
      body: "Body",
      coverImage: "Cover image",
      coverImageAlt: "Alternative text",
      coverImageAltHint: "Describe the image for visitors who can't see it.",
    },
    toolbar: {
      heading2: "Heading",
      heading3: "Subheading",
      bold: "Bold",
      italic: "Italic",
      bulletList: "Bullet list",
      orderedList: "Numbered list",
      link: "Link",
      linkPrompt: "Enter a URL:",
    },
    buttons: {
      saveDraft: "Save draft",
      saveAndPublish: "Save & publish",
      publish: "Publish",
      unpublish: "Unpublish",
      cancel: "Cancel",
      addItem: (label: string) => `Add ${label}`,
    editItem: (label: string) => `Edit ${label}`,
    panelIntro: "Fill in the fields, then choose Done. Nothing is saved until you save the group.",
    deleteItem: (label: string) => `Delete ${label}`,
    chooseImage: "Choose image",
      removeImage: "Remove image",
      uploading: "Uploading…",
    },
    statusBadge: {
      draft: "Draft",
      published: "Published",
    },
    unsavedPrompt: "You have unsaved changes. Leave this page without saving?",
    validation: {
      title: "Title is required.",
      body: "Body is required.",
      category: "Choose a category.",
      publishDate: "Publish date is required.",
      slugTaken: "This address is already in use.",
      slugReserved: "This address is reserved.",
      imageTooLarge: "Image must be 5 MB or smaller.",
      imageBadFormat: "Please choose a JPEG, PNG or WebP image.",
      imageAltRequired: "Alternative text is required.",
    },
  },
  toasts: {
    draftSaved: "Saved as draft.",
    published: "Published.",
    unpublished: "Unpublished — no longer visible on the public site.",
    updated: "Saved.",
    deleted: "Deleted.",
    uploadFailed: "The image could not be uploaded. Please try again.",
    uploaded: "Image uploaded.",
    saveFailed: "Could not save. Please check the form and try again.",
    unavailable: loginCopy.errors.unavailable,
  },
} as const;

// Career applications (012) admin copy: list, detail, CV download, delete and export.
/**
 * Registrations (013) admin copy: list, detail, Deleted view, status and
 * delete. Status labels come from the public content file so both sides agree.
 */
export const registrationsAdminCopy = {
  pageTitle: "Registrations",
  export: "Export CSV",
  deletedLink: "Deleted registrations",
  table: {
    headers: {
      reference: "Reference",
      student: "Student",
      className: "Class",
      father: "Father",
      mobile: "Mobile",
      submitted: "Submitted",
    },
    empty: "No registrations yet.",
    emptyFiltered: "No registrations match your search or filter.",
    duplicate: "Likely duplicate",
  },
  filters: {
    searchPlaceholder: "Search by student, father or mother name…",
    classLabel: "Class",
    allClasses: "All classes",
    apply: "Filter",
  },
  pagination: {
    previous: "Previous",
    next: "Next",
    pageOf: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
  },
  detail: {
    back: "Back to registrations",
    sections: {
      student: "Student",
      parents: "Parents",
      contact: "Contact & address",
      health: "Health information",
      reference: "Reference",
      remarks: "Remarks",
      record: "Record",
      history: "History",
    },
    labels: {
      studentName: "Student's name",
      dateOfBirth: "Date of birth",
      className: "Class",
      motherTongue: "Mother tongue",
      fatherName: "Father's name",
      motherName: "Mother's name",
      fatherMobile: "Father's mobile",
      motherMobile: "Mother's mobile",
      email: "Email",
      address: "Address",
      emergencyPhone: "Emergency contact number",
      emergencyLegacyName: "Emergency contact name (older record)",
      vaccinated: "Vaccinated",
      medicalHistory: "Medical history",
      referenceName: "Reference student",
      referenceClass: "Reference student's class",
      referenceRelation: "Relation",
      remarks: "Remarks",
      reference: "Reference number",
      status: "Status",
      submittedAt: "Submitted",
      consentAt: "Consent given",
      duplicate: "Likely duplicate",
    },
    yes: "Yes",
    no: "No",
    none: "Not given",
    duplicateYes: "Yes: another registration has the same student, date of birth and father's mobile.",
    duplicateNo: "No",
    noHistory: "No changes yet.",
    historyStatus: (from: string, to: string, by: string) => `Status changed from ${from} to ${to} by ${by}`,
    historyDeleted: (by: string) => `Deleted by ${by}`,
    historyRestored: (by: string) => `Restored by ${by}`,
  },
  statusControl: {
    label: "Status",
    save: "Save status",
    saved: "Status updated",
    failed: "Couldn't update the status. Please try again.",
  },
  deleteDialog: {
    trigger: "Delete registration",
    title: "Delete this registration?",
    body: "It will be hidden from the list, search, counts and export. You can restore it from Deleted registrations for 30 days; after that it is removed permanently.",
    cancel: "Cancel",
    confirm: "Delete",
  },
  deleted: {
    pageTitle: "Deleted registrations",
    back: "Back to registrations",
    headers: {
      reference: "Reference",
      student: "Student",
      className: "Class",
      deletedOn: "Deleted on",
      daysLeft: "Days left",
      actions: "Actions",
    },
    empty: "No deleted registrations.",
    daysLeft: (days: number) => (days === 1 ? "1 day" : `${days} days`),
  },
  restoreDialog: {
    trigger: "Restore",
    title: "Restore this registration?",
    body: "It returns to the list unchanged, with its reference number and status.",
    cancel: "Cancel",
    confirm: "Restore",
    done: "Registration restored",
    notRestorable: "This registration can no longer be restored.",
    unavailable: "Couldn't restore right now. Please try again.",
  },
  toasts: {
    deleted: "Registration deleted",
    gone: "This registration is no longer available",
    unavailable: loginCopy.errors.unavailable,
  },
  overviewCard: "Registrations",
} as const;

export const careersAdminCopy = {
  pageTitle: "Applications",
  export: "Export CSV",
  table: {
    headers: {
      name: "Name",
      email: "Email",
      phone: "Phone",
      qualification: "Qualification",
      applied: "Applied",
    },
    empty: "No applications yet.",
    emptyFiltered: "No applications match your search.",
  },
  filters: {
    searchPlaceholder: "Search by name, email or phone…",
  },
  pagination: {
    previous: "Previous",
    next: "Next",
    pageOf: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
  },
  detail: {
    back: "Back to applications",
    email: "Email",
    phone: "Phone",
    qualification: "Qualification",
    applied: "Applied",
    cv: "CV",
    download: "Download CV",
    downloadHint: "A PDF file saved to your computer. It is never opened inside the admin.",
  },
  deleteDialog: {
    trigger: "Delete application",
    title: "Delete this application?",
    body: "The application and its CV file will be removed. The person will be able to apply again straight away.",
    cancel: "Cancel",
    confirm: "Delete",
  },
  toasts: {
    deleted: "Application deleted",
    gone: "This application is no longer available",
    unavailable: loginCopy.errors.unavailable,
  },
} as const;

// Contact messages (008) admin copy: inbox, detail, status and delete.
export const messagesCopy = {
  pageTitle: "Messages",
  table: {
    headers: {
      name: "Name",
      subject: "Subject",
      preview: "Message",
      status: "Status",
      received: "Received",
      actions: "Actions",
    },
    empty: "No messages yet.",
    emptyFiltered: "No messages match your search or filter.",
    delete: "Delete message",
  },
  filters: {
    searchPlaceholder: "Search name, email or subject",
    statusLabel: "Status",
    statusAll: "All statuses",
  },
  pagination: {
    previous: "Previous",
    next: "Next",
    pageOf: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
  },
  detail: {
    back: "Back to inbox",
    from: "From",
    email: "Email",
    phone: "Phone",
    phoneNone: "Not provided",
    whatsapp: "WhatsApp",
    received: "Received",
    status: "Status",
    markResponded: "Mark as responded",
    gone: "This message is no longer available.",
    replyPrefix: "Re: ",
  },
  deleteDialog: {
    title: "Delete this message?",
    body: "It will be removed from the inbox.",
    cancel: "Cancel",
    confirm: "Delete",
  },
  toasts: {
    deleted: "Message deleted",
    gone: "This message is no longer available",
    unavailable: loginCopy.errors.unavailable,
    statusSaved: (label: string) => `Status updated to ${label}`,
    statusFailed: "Couldn't update the status. Please try again.",
  },
} as const;

// Profile menu (010): the initial button left of the bell.
export const profileMenuCopy = {
  triggerLabel: "Account menu",
  account: "Account",
  logout: loginCopy.logout,
} as const;

// Admin account (010) copy: change password, last changed, sign out other devices.
export const accountCopy = {
  pageTitle: "Account",
  signedInAs: "Signed in as",
  changePassword: {
    title: "Change password",
    currentLabel: "Current password",
    newLabel: "New password",
    newHint: "At least 12 characters.",
    confirmLabel: "Confirm new password",
    submit: "Change password",
    submitting: "Changing…",
  },
  unsavedPrompt: "You've started changing your password. Leave this page and discard what you typed?",
  errors: {
    invalid: "Please fill in all three fields.",
    too_short: "The new password must be at least 12 characters.",
    too_long: "The new password must be 128 characters or fewer.",
    mismatch: "The new passwords don't match.",
    same_as_current: "The new password must be different from your current password.",
    wrong_current: "Your current password is incorrect.",
    blocked: loginCopy.errors.blocked,
    unavailable: "We couldn't save your change. Nothing was changed — please try again.",
    // 011: the server refuses a content manager (only a main admin changes a password).
    forbidden: "You don't have access to that.",
  },
  // 011: a content manager's password is controlled by the main admin.
  passwordManagedByAdmin: {
    title: "Password",
    body: "Your password is managed by the main admin. If you need it changed, ask them.",
  },
  success: "Your password has been changed. Other devices have been signed out.",
  changedOthersRemain: "Your password has been changed, but other devices may still be signed in.",
  changedSignedOut:
    "Your password has been changed. This device was signed out — please log in again with your new password, then use Sign out other devices on the Account page in case any other device is still signed in.",
  loginAgainLink: "Log in",
  unconfirmed:
    'We couldn\'t confirm whether your password was changed. Please reload the page and check "Password last changed" before trying again.',
  lastChangedLabel: "Password last changed",
  lastChangedUnavailable: "Unavailable",
  signOutOthers: {
    title: "Other devices",
    button: "Sign out other devices",
    dialogTitle: "Sign out other devices?",
    dialogBody: "Every other device will be signed out. This device stays signed in.",
    cancel: "Cancel",
    confirm: "Sign out",
    success: "All other devices have been signed out.",
    unavailable: "We couldn't sign out other devices. Please try again.",
  },
} as const;

// Roles & users (011) copy: denied notice, no-grants note, Users page, change record.
export const accessCopy = {
  denied: "You don't have access to that section.",
  noGrants: "No sections have been granted to you yet. Ask the main admin if you need access.",
  dismiss: "Dismiss",
} as const;

export const userStatusLabels = {
  active: "Active",
  disabled: "Disabled",
} as const;

export const usersCopy = {
  pageTitle: "Users",
  newUser: "Add user",
  changeRecord: "Change record",
  you: "(you)",
  table: {
    headers: {
      email: "Email",
      role: "Role",
      sections: "Sections",
      status: "Status",
      lastLogin: "Last login",
      actions: "Actions",
    },
    empty: "No users yet.",
    allSections: "All",
    noSections: "None",
    never: "Never",
  },
  roles: {
    main_admin: "Main admin",
    content_manager: "Content manager",
  },
  actions: {
    editAccess: "Edit",
    disable: "Disable",
    enable: "Enable",
    delete: "Delete",
    changeOwnPassword: "Change your password on the Account page",
  },
  // The right-hand panel for adding and editing a user (011 US1, US4).
  panel: {
    createTitle: "Add user",
    editTitle: "Edit user",
    createIntro: "Set the user's password and give it to them. Only a main admin can change it later.",
    editIntro: "Change this user's role and sections. Fill in a password only to change theirs.",
    emailLabel: "Email",
    roleLabel: "Role",
    sectionsLabel: "Sections",
    passwordLabel: "Password",
    passwordEditLabel: "New password (optional)",
    passwordHint: "At least 12 characters. You give it to the user; only a main admin can change it.",
    passwordEditHint: "Leave empty to keep their current password. A new one ends all their sessions.",
    generate: "Generate",
    showPassword: "Show password",
    hidePassword: "Hide password",
    create: "Add user",
    creating: "Adding…",
    save: "Save",
    saving: "Saving…",
    cancel: "Cancel",
    close: "Close",
    discardPrompt: "You have unsaved changes. Close without saving?",
  },
  confirm: {
    disableTitle: "Disable this user?",
    disableBody: "They will be signed out immediately and cannot log in until you enable them again.",
    disableConfirm: "Disable",
    enableTitle: "Enable this user?",
    enableBody: "They will be able to log in again with their existing password.",
    enableConfirm: "Enable",
    deleteTitle: "Delete this user?",
    deleteBody: "They will be signed out immediately and removed from this list. Their past changes stay in the change record.",
    deleteConfirm: "Delete",
    cancel: "Cancel",
  },
  errors: {
    email_taken: "An account with this email already exists.",
    self: "You can't do that to your own account.",
    last_main_admin: "At least one main admin must remain.",
    not_found: "This user is no longer available.",
    forbidden: "You don't have access to that.",
    unauthorized: "Your session has ended. Please log in again.",
    invalid: "Please check the form and try again.",
    invalidEmail: "Enter a valid email address.",
    invalidPassword: "The password must be 12 to 128 characters.",
    unavailable: "We couldn't complete that. Nothing was changed — please try again.",
  },
  toasts: {
    created: "User added.",
    saved: "User saved.",
    disabled: "User disabled.",
    enabled: "User enabled.",
    deleted: "User deleted.",
  },
} as const;

export const changeRecordCopy = {
  pageTitle: "Change record",
  back: "Back to Users",
  headers: { when: "When", by: "By", user: "User", change: "Change" },
  empty: "No changes recorded yet.",
  pagination: {
    previous: "Previous",
    next: "Next",
    pageOf: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
  },
  types: {
    created: (role: string, sections: string) => `Account created (${role}${sections ? `: ${sections}` : ""})`,
    restored: (role: string, sections: string) => `Account restored (${role}${sections ? `: ${sections}` : ""})`,
    role_changed: (from: string, to: string) => `Role: ${from} → ${to}`,
    permissions_changed: (added: string, removed: string) =>
      `Sections: ${[added && `added ${added}`, removed && `removed ${removed}`].filter(Boolean).join("; ")}`,
    disabled: "Disabled",
    enabled: "Enabled",
    password_set: "Password set",
    deleted: "Deleted",
  },
} as const;

// Admin notifications (009) copy: the bell, its panel, and their toasts.
export const notificationsCopy = {
  bellLabel: "Notifications",
  empty: "You're all caught up — nothing new.",
  markAllRead: "Mark all as read",
  seeAllMessages: "See all messages",
  seeAllApplications: "See all applications",
  newLabel: "New",
  toasts: {
    markAllReadFailed: "Couldn't mark everything as read. Please try again.",
  },
} as const;

// Settings (005) admin copy. Field labels and messages live here (Constitution
// IX); the group definitions in src/lib/settings/groups/ point at these strings.
export const settingsCopy = {
  pageTitle: "Settings",
  navLabel: "Settings groups",
  /** 014: one tab per public page plus Site-wide (src/lib/settings/panels.ts). */
  tabsNavLabel: "Settings sections",
  tabs: {
    "site-wide": "Site-wide",
    home: "Home",
    about: "About",
    academics: "Academics",
    admission: "Admission",
    resources: "Resources",
    careers: "Careers",
  },
  /** 014: each panel is titled with the public section it edits. */
  panels: {
    contact: "Contact & social",
    hero: "Hero slides",
    video: "Why Choose video",
    stats: "Progress dashboard",
    "admission-window": "Admission window",
    "admission-messages": "Admission messages",
    "admission-classes": "Classes open for admission",
    "photo-gallery": "Photo gallery",
    "portal-links": "Portal links",
    "class-levels": "Class levels",
    syllabi: "Syllabi",
    examination: "Examination",
  },
  viewOnSite: "View on site",
  unsavedBadge: "Unsaved changes",
  /** A panel shown to someone who may open its tab but not save it (014 FR-018). */
  readOnly: {
    needs: (permission: string) => `You need the ${permission} permission to change this.`,
  },
  /** The "Test link" button next to a web address that is being edited (014b). */
  testLink: "Test link",
  testLinkNeedsAddress: "Enter a valid address to test it",
  /** A Home panel whose group could not be read; the rest of the tab still works (014). */
  panelUnavailable: "This section couldn't be loaded. Reload to try again.",
  groups: {
    contact: { title: "Contact & social", description: "Shown on the Contact page, and as social icons in the top bar and footer." },
    hero: { title: "Hero slides", description: "The pictures at the top of the home page. Images only." },
    stats: { title: "Stats", description: "The four numbers in the home page progress dashboard." },
    video: { title: "Home video", description: "The one video shown on the home page." },
    admission: {
      title: "Admission",
      description: "When admissions are open, and the messages shown on the Admission page. Dates are in Pakistan time.",
    },
    gallery: { title: "Photo gallery", description: "Pictures for the Photo Gallery page." },
    examination: { title: "Examination", description: "How examinations work at each stage, as headed blocks of text. Shown as cards on the Academics page." },
    syllabi: { title: "Syllabi", description: "The syllabus for each class: subjects, and the topics under each. Shown as tabs on the Academics page." },
    classLevels: { title: "Class levels", description: "The table on the Admission page: each class level and the age a child must be. Registration offers the levels ticked as open." },
    portalLinks: { title: "Portal links", description: "The links in the footer's Portal Links column. Each opens in a new tab. With no links, the column is hidden." },
  },
  fields: {
    contact: {
      phone: "Phone",
      email: "Email",
      address: "Address",
      officeHours: "Office timings",
      mapUrl: "Map location (Google Maps link)",
      social: "Social links",
      facebook: "Facebook",
      instagram: "Instagram",
      youtube: "YouTube",
      tiktok: "TikTok",
    },
    hero: {
      displaySeconds: "Seconds each slide is shown",
      slides: "Slides",
      desktop: "Desktop image",
      mobile: "Mobile image (optional)",
      alt: "Alt text (describes the picture)",
      heading: "Heading (optional)",
      buttonLabel: "Button label (optional)",
      buttonLink: "Button link (optional)",
      visible: "Visible on the site",
    },
    stats: {
      students: "Students",
      books: "Books",
      teachers: "Teachers",
      campuses: "Campuses",
    },
    video: { youtubeUrl: "Home video (YouTube address)" },
    admission: {
      opensOn: "Opens on",
      closesOn: "Closes on",
      announcement: "Announcement",
      closedMessage: "Closed message",
      classes: "Classes open for admission",
      className: "Class name",
      levelId: "Class level",
    },
    gallery: { images: "Images", image: "Image", caption: "Caption (optional)" },
    portalLinks: { links: "Links", link: "Link", label: "Label", url: "Web address" },
    examination: { blocks: "Blocks", block: "Block", heading: "Heading", body: "Text" },
    syllabi: {
      levels: "Levels",
      levelName: "Level name",
      subjects: "Subjects",
      subjectName: "Subject name",
      groups: "Groups",
      heading: "Group heading (optional)",
      intro: "Intro (optional)",
      topics: "Topics",
    },
    classLevels: { ageReferenceDate: "Age reference date", day: "Day", month: "Month", levels: "Class levels", level: "Class level", name: "Class level", ageRule: "Age rule" },
  },
  hints: {
    topics: "One topic per line. Blank lines are ignored and each line is trimmed.",
    examinationBody: "Plain text. Leave a blank line between paragraphs.",
    ageReferenceDate: "The age column on the Admission page reads \"Age on <this date>\". Defaults to 31 July.",
    ageRule: "For example: 2½ to 3½ years.",
    classLevelName: "Shown in the registration form's class list when this level is open, so use the name parents know.",
    insecureUrl: "Visitors' browsers will mark this site as not secure.",
    testLink: "Opens the address in a new tab. Nothing is saved.",
    optionalLink: "Leave empty to hide this icon.",
    officeHours: "For example: Monday to Saturday, 9am to 6pm.",
    displaySeconds: "Between 3 and 15.",
    buttonLink: "A page on this site (starting with /) or a full web address.",
    videoUrl: "Leave empty to hide the video.",
    imageLimits: "JPG, PNG or WebP, up to 5 MB.",
    heroDesktop:
      "JPG, PNG or WebP, up to 5 MB. Best size: 1920 × 1080 pixels (landscape, 16:9). The slide fills the whole screen, so the edges are cropped on different screens: keep text and faces inside the middle 70% of the width and the middle 60% of the height. The menu covers the top edge and the dots and arrow cover the bottom edge.",
    opensOn: "Pakistan time. Admissions open at the start of this day. Leave empty to keep admissions closed.",
    closesOn: "Pakistan time. Admissions close at the end of this day.",
    announcement: "Shown on the Admission page while admissions are open. For example: Admissions are now open for Playgroup, Nursery, Class 1 and Class 2.",
    closedMessage: "Shown on the Admission page while admissions are closed. For example: Admissions for the new session will open soon.",
    classes: "Shown in this order in the registration form's class list.",
    heroMobile:
      "JPG, PNG or WebP, up to 5 MB. Best size: 1080 × 1920 pixels (portrait, 9:16). Keep text and faces inside the middle 60% of the height; the menu covers the top edge and the dots and arrow the bottom edge. Without a phone picture, phones show the desktop picture whole, with blue bars above and below it.",
  },
  save: "Save",
  saving: "Saving…",
  unsavedPrompt: "You have unsaved changes on this page. Leave without saving?",
  notSavedYet: "Not saved yet — showing the starting values.",
  lastSaved: (by: string, at: string) => `Last saved by ${by} on ${at}`,
  toasts: {
    saved: (group: string) => `${group} saved`,
    conflict: "This section was changed by someone else. Reload to see their changes.",
    unavailable: "Couldn't save right now. Please try again.",
    invalid: "Check the highlighted fields.",
    forbidden: "You don't have access to that section.",
    unauthorized: "Your session has ended. Please sign in again.",
  },
  errors: {
    required: "This field is required.",
    email: "Enter a valid email address.",
    url: "Enter a full web address starting with https://",
    urlOrPath: "Enter a site path starting with / or a full web address.",
    maxLength: (max: number) => `Use ${max} characters or fewer.`,
    wholeNumber: "Only whole numbers from 0 to 100,000,000 are accepted.",
    displaySeconds: "Enter a whole number of seconds from 3 to 15.",
    youtube: "Enter a YouTube video address",
    imageLimits: "Images must be JPG, PNG or WebP, up to 5 MB.",
    imageRequired: "Choose an image.",
    lastVisibleSlide: "At least one visible slide is required",
    buttonPair: "Add a button label and a link together, or neither.",
    tooMany: (max: number) => `You can have at most ${max} here.`,
    unknownItem: "This item can no longer be saved. Reload and try again.",
    date: "Enter a real date.",
    closesBeforeOpens: "Closes on must be on or after Opens on.",
    classDuplicate: "This class is already in the list.",
    urlCredentials: "Remove the username and password from the address.",
    dayMonth: "Choose a real day and month.",
    classLevelNameDuplicate: (name: string) =>
      `Another class level is already called '${name}'. Class names must be unique, because registration matches classes by name.`,
    classLevelLinkDuplicate: "This class level is already ticked.",
    tooManyLines: (max: number) => `Use ${max} lines or fewer.`,
    lineTooLong: (line: number, max: number) => `Line ${line} is longer than ${max} characters.`,
    groupNeedsContent: "Add an intro or at least one topic.",
    tooManyTopics: (max: number) => `A syllabus can hold at most ${max.toLocaleString("en-US")} topics in all.`,
  },
  /** The "pending client confirmation" notice on a seeded section, and its confirm action (014b). */
  pending: {
    notice: (source: string, date: string) =>
      `Copied from ${source} on ${date}. It awaits the client's confirmation that it applies to this campus. Saving changes does not clear this notice.`,
    confirmButton: "Mark as confirmed by client",
    dialog: {
      trigger: "Mark as confirmed by client",
      title: "Mark this section as confirmed by the client?",
      body: "Do this only when the client has confirmed that this content applies to this campus. The notice goes away, and who confirmed it and when is recorded.",
      cancel: "Cancel",
      confirm: "Mark as confirmed",
    },
    confirmed: (title: string) => `${title} marked as confirmed by the client`,
    failed: "Couldn't mark it as confirmed. Please try again.",
  },
  /** The Syllabi editor (014b): levels, subjects and groups, one level open at a time. */
  syllabus: {
    addLevel: "Add level",
    addSubject: "Add subject",
    addGroup: "Add group",
    preview: "Preview on the Academics page",
    empty: "No levels yet. Add the first level, for example Class 1.",
    noSubjects: "No subjects in this level yet.",
    noGroups: "No groups in this subject yet.",
    levelFallback: (n: number) => `Level ${n}`,
    subjectFallback: (n: number) => `Subject ${n}`,
    summary: (subjects: number, topics: number) => `${subjects} ${subjects === 1 ? "subject" : "subjects"}, ${topics} ${topics === 1 ? "topic" : "topics"}`,
    topicCount: (n: number) => `${n} of 100 topics`,
    duplicateName: (kind: "level" | "subject", name: string) => `Another ${kind} is also called "${name.trim()}". You can still save.`,
    openLevel: (name: string) => `Open ${name}`,
    removeLevel: (name: string, topics: number) => ({
      trigger: "Remove level",
      title: `Remove the level "${name}"?`,
      body: `This removes ${topics} ${topics === 1 ? "topic" : "topics"}, with all its subjects. It leaves the site when you save this section. A record of what was removed is kept.`,
      cancel: "Cancel",
      confirm: "Remove",
    }),
    removeSubject: (name: string, topics: number) => ({
      trigger: "Remove subject",
      title: `Remove the subject "${name}"?`,
      body: `This removes ${topics} ${topics === 1 ? "topic" : "topics"}. It leaves the site when you save this section. A record of what was removed is kept.`,
      cancel: "Cancel",
      confirm: "Remove",
    }),
    removeGroup: (topics: number) => ({
      trigger: "Remove group",
      title: "Remove this group?",
      body: `This removes ${topics} ${topics === 1 ? "topic" : "topics"} and its intro. It leaves the site when you save this section. A record of what was removed is kept.`,
      cancel: "Cancel",
      confirm: "Remove",
    }),
    removeEmptyGroup: "Remove group",
  },
  /** "Classes open for admission" as a checklist of the Class Levels rows (014b). */
  checklist: {
    intro: "Tick the class levels that are open for admission. The registration form lists them in the same order as the Class levels table.",
    noLevels: "There are no class levels yet. Add them in the Class levels panel, then tick the open ones here.",
    goToLevels: "Go to Class levels",
    notLinkedTitle: "Not linked to a class level",
    notLinkedIntro:
      "These names were typed before class levels existed. They are still offered in the registration form until you link each one to a class level or remove it.",
    linkTo: (name: string) => `Link ${name} to a class level`,
    linkPlaceholder: "Link to…",
    remove: (name: string) => `Remove ${name}`,
    removeButton: "Remove",
    removedWarning: (names: string[]) =>
      `${names.map((name) => `"${name}"`).join(", ")} ${names.length === 1 ? "was" : "were"} removed from Class levels and ${names.length === 1 ? "is" : "are"} no longer offered in the registration form. Clear this warning, then save.`,
    clearWarning: "Clear this warning",
  },
  /** Warnings shown under the status line on a Settings group (013). */
  admissionWarnings: {
    noClasses: "Admissions are open but no classes are listed, so the registration form is hidden. Add at least one class.",
  },
  /** What the public currently sees, shown on Settings → Admission (020 FR-012). */
  admissionStatus: {
    open: (date: string) => `Open now until ${date}`,
    upcoming: (date: string) => `Opens on ${date}`,
    closed: "Closed",
  },
  list: {
    addSlide: "Add slide",
    editSlide: "Edit slide",
    addImages: "Add images",
    edit: "Edit",
    hide: "Hide",
    show: "Show",
    hidden: "Hidden",
    visible: "Visible",
    done: "Done",
    cancel: "Cancel",
    close: "Close",
    moveUp: (name: string) => `Move ${name} up`,
    moveDown: (name: string) => `Move ${name} down`,
    moved: (name: string, position: number, total: number) => `${name} moved to position ${position} of ${total}`,
    dragHandle: "Drag to reorder",
    empty: "Nothing here yet.",
    lastVisibleReason: "At least one visible slide is required",
    uploading: (name: string) => `Uploading ${name}…`,
    uploadFailed: (name: string, reason: string) => `${name}: ${reason}`,
    dismiss: "Dismiss",
    selectionLimit: (max: number) => `Only the first ${max} files were used.`,
    panelUnsaved: "You have unsaved changes in this slide. Discard them?",
    slideName: (n: number) => `slide ${n}`,
    imageName: (n: number) => `image ${n}`,
    addItem: (label: string) => `Add ${label}`,
    editItem: (label: string) => `Edit ${label}`,
    panelIntro: "Fill in the fields, then choose Done. Nothing is saved until you save the group.",
    deleteItem: (label: string) => `Delete ${label}`,
    chooseImage: "Choose image",
    replaceImage: "Replace",
    removeImage: "Remove",
    charCount: (n: number, max: number) => `${n} / ${max}`,
    itemHasErrors: "Fix the highlighted fields",
  },
  deleteSlide: {
    trigger: "Delete slide",
    title: "Delete this slide?",
    body: "It will be removed from the list. It leaves the site when you save this group.",
    cancel: "Cancel",
    confirm: "Delete",
  },
  deleteImage: {
    trigger: "Delete image",
    title: "Delete this image?",
    body: "It will be removed from the list. It leaves the site when you save this group.",
    cancel: "Cancel",
    confirm: "Delete",
  },
  /** Any other list item (014b: portal link, class level, examination block, ...), named by the list's item label. */
  deleteItem: (label: string) => ({
    trigger: `Delete ${label}`,
    title: `Delete this ${label}?`,
    body: "It will be removed from the list. It leaves the site when you save this section.",
    cancel: "Cancel",
    confirm: "Delete",
  }),
} as const;

// Gallery albums (007) admin copy. Messages for the album and photo actions
// live here (Constitution IX); src/lib/gallery/schema.ts points at these.
export const galleryCopy = {
  pageTitle: "Photo gallery",
  intro: "Albums shown in the Photo Gallery on the Resources page. Up to 6 albums, 8 photos each.",
  backToAlbums: "Back to albums",
  createAlbum: "Create album",
  editAlbum: "Edit album",
  editDetails: "Edit details",
  albumFull: "The gallery is limited to 6 albums. Delete an album to create a new one.",
  emptyGallery: "No albums yet. Create one to start the gallery.",
  emptyAlbum: "No photos yet. Upload some to show this album on the site.",
  fields: {
    title: "Album title",
    description: "Short description (optional)",
    date: "Date (optional)",
    caption: "Caption (optional)",
  },
  photoCount: (n: number) => (n === 1 ? "1 photo" : `${n} photos`),
  uploadPhotos: "Upload photos",
  room: (n: number) => (n === 1 ? "Room for 1 more photo" : `Room for ${n} more photos`),
  photosFull: "This album is full (8 photos). Delete a photo to add another.",
  addedSummary: (added: number, refused: number) => {
    const parts: string[] = [];
    if (added > 0) parts.push(added === 1 ? "Added 1 photo." : `Added ${added} photos.`);
    if (refused > 0) parts.push(`${refused} not added: this album is full (8 photos).`);
    return parts.join(" ");
  },
  uploading: (name: string) => `Uploading ${name}…`,
  uploadFailed: (name: string, reason: string) => `${name}: ${reason}`,
  dismiss: "Dismiss",
  cover: "Cover",
  makeCover: "Make cover",
  noCover: "No photos yet",
  open: "Open",
  edit: "Edit",
  save: "Save",
  saving: "Saving…",
  cancel: "Cancel",
  close: "Close",
  unsavedPrompt: "You have unsaved changes in this album. Discard them?",
  moveUp: (name: string) => `Move ${name} up`,
  moveDown: (name: string) => `Move ${name} down`,
  moved: (name: string, position: number, total: number) => `${name} moved to position ${position} of ${total}`,
  dragHandle: "Drag to reorder",
  photoName: (n: number) => `photo ${n}`,
  charCount: (n: number, max: number) => `${n} / ${max}`,
  errors: {
    titleRequired: "Enter an album title",
    titleTooLong: "Title must be 80 characters or fewer",
    descriptionTooLong: "Description must be 300 characters or fewer",
    date: "Enter a valid date",
    captionTooLong: "Caption must be 150 characters or fewer",
    imageLimits: "Images must be JPG, PNG or WebP, up to 5 MB.",
  },
  toasts: {
    albumCreated: (title: string) => `Album "${title}" created`,
    albumUpdated: (title: string) => `Album "${title}" saved`,
    albumDeleted: (title: string) => `Album "${title}" deleted`,
    albumsReordered: "Album order saved",
    photoUpdated: "Caption saved",
    photosReordered: "Photo order saved",
    coverChanged: "Cover changed",
    photoDeleted: "Photo deleted",
    conflict: "This was changed by someone else. Reload to see their changes.",
    unavailable: "Couldn't save right now. Please try again.",
    invalid: "Check the highlighted fields.",
    notFound: "That album or photo no longer exists. Reload to see the latest.",
    forbidden: "You don't have access to that section.",
    unauthorized: "Your session has ended. Please sign in again.",
  },
  deleteAlbum: {
    trigger: "Delete album",
    title: "Delete this album?",
    body: "The album and its photos will be removed from the site.",
    cancel: "Cancel",
    confirm: "Delete",
  },
  deletePhoto: {
    trigger: "Delete photo",
    title: "Delete this photo?",
    body: "It will be removed from the album and the site.",
    cancel: "Cancel",
    confirm: "Delete",
  },
} as const;
