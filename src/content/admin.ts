/**
 * Admin area copy and navigation structure (Constitution VI — page copy
 * lives in content files, not hardcoded inside components).
 */

export interface AdminNavItem {
  label: string;
  href: string;
}

// Fixed order per FR-021: Overview, News, Messages, Signups, Settings.
export const adminNavItems: AdminNavItem[] = [
  { label: "Overview", href: "/admin" },
  { label: "News", href: "/admin/news" },
  { label: "Messages", href: "/admin/messages" },
  { label: "Signups", href: "/admin/signups" },
  { label: "Settings", href: "/admin/settings" },
];

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
