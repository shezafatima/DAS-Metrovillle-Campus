# Specification Quality Checklist: Careers — Application Form with CV Upload and Admin Applications

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-02
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain — Q1 resolved by ADR-0006 (either field); Q2 (main admin only deletes) and Q3 (configurable retention, default 12 months) resolved in /sp.clarify 2026-10-02; reapply policy changed to a 30-day window (ADR-0008, supersedes ADR-0003/0006; PRD v0.4)
- [x] Requirements are testable and unambiguous (except the three marked items)
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Q1 conflicts with an accepted ADR: the brief says "either email or phone"; PRD §5.9 and ADR-0003 say "both" (compound pair). Choosing "either" requires amending ADR-0003 and PRD §5.9.
- Signup retirement touches 009 notifications, the admin overview, the admin sidebar and the access inventory (FR-029, FR-033).
- Items marked incomplete require spec updates before `/sp.clarify` or `/sp.plan`.
