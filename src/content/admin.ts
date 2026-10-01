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

// Fixed order per FR-021: Overview, News, Messages, Signups, Settings; 011 adds Users (main admin).
export const adminNavItems: AdminNavItem[] = [
  { label: "Overview", href: "/admin", access: "any" },
  { label: "News", href: "/admin/news", access: "news" },
  { label: "Messages", href: "/admin/messages", access: "messages" },
  { label: "Signups", href: "/admin/signups", access: "careers" },
  { label: "Settings", href: "/admin/settings", access: "settings" },
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
  // 005: Settings group pages (the sidebar item itself is "Settings").
  "/admin/settings/contact": "Contact & social",
  "/admin/settings/hero": "Hero slides",
  "/admin/settings/stats": "Stats",
  "/admin/settings/video": "Home video",
  "/admin/settings/gallery": "Photo gallery",
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

// Signup (004) admin copy: list, filters, delete and export.
export const signupsCopy = {
  pageTitle: "Signups",
  export: "Export CSV",
  table: {
    headers: {
      name: "Name",
      email: "Email",
      phone: "Phone",
      pages: "Pages",
      first: "First signup",
      latest: "Latest signup",
      actions: "Actions",
    },
    empty: "No signups yet.",
    emptyFiltered: "No signups match your search.",
    delete: "Delete",
  },
  filters: {
    searchPlaceholder: "Search by name, email or phone…",
    sourceAll: "All pages",
  },
  pagination: {
    previous: "Previous",
    next: "Next",
    pageOf: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
  },
  deleteDialog: {
    title: "Delete this signup?",
    body: "The signup will be removed from the list. If this person signs up again, their record will be restored.",
    cancel: "Cancel",
    confirm: "Delete",
  },
  toasts: {
    deleted: "Signup deleted",
    gone: "This signup is no longer available",
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
  seeAllSignups: "See all signups",
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
  groups: {
    contact: { title: "Contact & social", description: "Shown on the Contact page, and as social icons in the top bar and footer." },
    hero: { title: "Hero slides", description: "The pictures at the top of the home page. Images only." },
    stats: { title: "Stats", description: "The four numbers in the home page progress dashboard." },
    video: { title: "Home video", description: "The one video shown on the home page." },
    gallery: { title: "Photo gallery", description: "Pictures for the Photo Gallery page." },
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
    gallery: { images: "Images", image: "Image", caption: "Caption (optional)" },
  },
  hints: {
    optionalLink: "Leave empty to hide this icon.",
    officeHours: "For example: Monday to Saturday, 9am to 6pm.",
    displaySeconds: "Between 3 and 15.",
    buttonLink: "A page on this site (starting with /) or a full web address.",
    videoUrl: "Leave empty to hide the video.",
    imageLimits: "JPG, PNG or WebP, up to 5 MB.",
  },
  save: "Save",
  saving: "Saving…",
  unsavedPrompt: "You have unsaved changes in this group. Leave without saving?",
  notSavedYet: "Not saved yet — showing the starting values.",
  lastSaved: (by: string, at: string) => `Last saved by ${by} on ${at}`,
  toasts: {
    saved: (group: string) => `${group} saved`,
    conflict: "This group was changed by someone else. Reload to see their changes.",
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
