# UI Wireframe Structure

## 1. Dashboard / Overview
**Components:**
- Top Navbar: Workspace Selector, Notifications (agent status), Profile, Platform Connect.
- Key Metrics Cards: Total Reach, Engagement Rate, AI-Generated Posts this week.
- Active Campaigns List: Status of agents working in the background (e.g., "Researching Trends...").
- Upcoming Scheduled Posts (Calendar view).

## 2. Campaign Creation (Agent Orchestration Flow)
**Components:**
- Step 1: Goal & Audience (Input fields for Niche, Tone, Objective).
- Step 2: Agent Customization (Toggle which agents to use: SEO, Media Gen, Cross-Platform).
- Step 3: Generation Status (Progress trackers for Strategy Agent -> Content Agent -> Creative Agent).

## 3. Approval & Publishing
**Components:**
- Inbox view of drafted posts.
- Split-screen:
  - Left: AI generated content (text, image, suggested hashtags).
  - Right: Platform Preview (Twitter mockup, LinkedIn mockup).
- Edit controls (Ask the *Content Agent* to "make it funnier", "shorten it").
- Approve & Schedule button.

## 4. Analytics & Continuous Learning
**Components:**
- Line graphs: Impressions vs. Engagements over time.
- "AI Insights" Box: Output from *Learning Agent* (e.g., "Your morning tweets perform 20% better than afternoon. I have adjusted the Scheduler Agent. Threads with emojis get 15% more retweets.")

---

## Example UI Mockup (Mermaid Layout Concept)

```text
+-------------------------------------------------------------+
|  [Logo]   | Workspace: "Acme Corp" |  [Connect Socials]     |
+-------------------------------------------------------------+
| [Side]   |  Welcome back. The agents have been busy.        |
| [Nav]    |                                                  |
| - Home   |  [ Reach: 2.4M ]  [ Active Campaigns: 4 ]      |
| - Cmpgn  |                                                  |
| - Apprv  |  >> Agent Activity Log <<                      |
| - Anlyx  |  - Research Agent completed trend analysis.    |
| - Settgs |  - Content Agent generated 14 new drafts.      |
|          |  - Scheduler Agent queued 3 posts for today.   |
|          |                                                  |
|          |  >> Items Needing Approval <<                  |
|          |  [ Twitter Draft: "AI brings new scaling..." ] |
|          |  [ Edit ] [ Approve ] [ Ask AI to Rewrite ]    |
+-------------------------------------------------------------+
```
