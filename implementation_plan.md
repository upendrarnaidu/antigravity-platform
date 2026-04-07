# Production Preparedness: Legal Pages & Chaos Testing

This plan outlines the creation of necessary compliance pages for Razorpay Live Mode approval, integrating a global footer, and setting up an automated end-to-end testing suite using Playwright.

## User Review Required

> [!IMPORTANT]
> The legal pages (Terms, Privacy, Refund, and Contact) are typically expected to be **publicly accessible** without an account, so Razorpay compliance officers can review them. 
> I plan to add them as public routes in `App.jsx` (similar to `/login`) and display the new `Footer.jsx` on both the authenticated `Layout.jsx` and the public layout. Let me know if you prefer them strictly gated.

> [!CAUTION]
> Installing Playwright will modify `package.json` and initialize a testing environment (usually taking a moment to download browser binaries). Is it strictly fine if I run `npm init playwright@latest` or would you prefer I just supply the configuration code for you to run? (The prompt implies you want me to provide the terminal commands at the end, so I will do that rather than running it myself).

## Proposed Changes

### `frontend/src/pages/`
These will be created as new pages for compliance, featuring Antigravity branding:
#### [NEW] [TermsOfService.jsx](file:///c:/Users/Upendra/.gemini/antigravity/scratch/ai-marketing-platform/frontend/src/pages/TermsOfService.jsx)
#### [NEW] [PrivacyPolicy.jsx](file:///c:/Users/Upendra/.gemini/antigravity/scratch/ai-marketing-platform/frontend/src/pages/PrivacyPolicy.jsx)
#### [NEW] [RefundPolicy.jsx](file:///c:/Users/Upendra/.gemini/antigravity/scratch/ai-marketing-platform/frontend/src/pages/RefundPolicy.jsx)
#### [NEW] [ContactUs.jsx](file:///c:/Users/Upendra/.gemini/antigravity/scratch/ai-marketing-platform/frontend/src/pages/ContactUs.jsx)

### `frontend/src/components/`
#### [NEW] [Footer.jsx](file:///c:/Users/Upendra/.gemini/antigravity/scratch/ai-marketing-platform/frontend/src/components/Footer.jsx)
A dark-mode footer component displaying the links to the 4 compliance pages, the copyright note, and a sleek aesthetic.

#### [MODIFY] [Layout.jsx](file:///c:/Users/Upendra/.gemini/antigravity/scratch/ai-marketing-platform/frontend/src/components/Layout.jsx)
Integrate the `Footer` component at the bottom of the main content area so it displays beautifully on all dashboard pages.

### `frontend/src/`
#### [MODIFY] [App.jsx](file:///c:/Users/Upendra/.gemini/antigravity/scratch/ai-marketing-platform/frontend/src/App.jsx)
- Import the new legal pages.
- Add public `<Route>` definitions for `/terms`, `/privacy`, `/refund`, `/contact`.
- Wrap the public pages with a simple styled layout that includes the `Footer` and Antigravity logo.

### `tests/`
#### [NEW] [core-workflow.spec.js](file:///c:/Users/Upendra/.gemini/antigravity/scratch/ai-marketing-platform/tests/core-workflow.spec.js)
Define an automated E2E test script using Playwright syntax mapping to the 'Unhappy Path' flow:
- navigating to the homepage.
- verifying the AuthModal gating logic.
- Mocking a 1-credit user payload testing the 'Video Campaign' (16 credits).
- Asserting the Razorpay paywall block appears instead of the workflow executing.

## Open Questions
- Is there a specific support email and physical address you want encoded right now in the Contact Us page, or are placeholders (e.g., `support@antigravity-ai.com`, `123 AI Boulevard`) acceptable?

## Verification Plan

### Automated Tests
- Review the supplied Playwright test file.
- User acts on Playwright terminal commands.

### Manual Verification
- Visual inspection of the 4 new public URLs `/terms`, `/contact`, etc.
- Testing responsive alignment of the `Footer.jsx` inside the user dashboard.
