# 📋 Product Requirements Document — Pharmiq

| Field | Details |
|---|---|
| **Product Name** | Pharmiq |
| **Type** | Web & Mobile EdTech Platform |
| **Version** | 1.0 |
| **Date** | May 25, 2026 |
| **Status** | Draft |

---

## 1. 🧭 Overview

Pharmiq is an affordable, content-rich online learning platform targeting students preparing for pharmacy and pharmaceutical science exams — including D.Pharm, B.Pharm, M.Pharm, GPAT, NIPER, and Drug Inspector exams.

The platform delivers high-quality video lectures, live classes, practice tests, and AI-powered doubt resolution at accessible pricing — built for the underserved pharma education segment in India.

---

## 2. 🔍 Problem Statement

Pharmacy students in Tier 2/3 cities lack access to quality coaching for competitive exams like GPAT and NIPER. Existing EdTech platforms (BYJU'S, Unacademy, PW) focus heavily on JEE/NEET and largely ignore the pharma education segment.

**Pharmiq fills this gap** with dedicated, high-quality pharma-focused content at affordable prices.

---

## 3. 🎯 Goals & Success Metrics

| Goal | Metric | Timeline |
|---|---|---|
| Acquire active learners | 100,000 registered users | 6 months |
| Drive engagement | Avg. 3+ hours/week per active user | Ongoing |
| Monetize | 10% free-to-paid conversion | 6 months |
| Retention | 60% monthly active user retention | Ongoing |

---

## 4. 👥 Target Users

| Segment | Details |
|---|---|
| **Primary** | Pharmacy students aged 18–26 preparing for GPAT, NIPER, D.Pharm, B.Pharm exams |
| **Secondary** | Working pharmacists seeking upskilling and certification |
| **Geography** | India-first (Hindi + English medium) |

---

## 5. ✅ Core Features

### 5.1 User Onboarding
- Sign up via mobile number / Google / email
- Profile setup: select exam goal (GPAT, NIPER, B.Pharm, etc.), year of study, preferred language
- Personalized dashboard based on exam target

---

### 5.2 Video Lectures
- Pre-recorded HD video lessons organized by subject, chapter, topic
- Subjects covered: Pharmacology, Pharmaceutics, Medicinal Chemistry, Pharmacognosy, Clinical Pharmacy, and more
- Playback speed control (0.5x – 2x)
- Offline download (mobile app)
- Video bookmarking and in-player notes
- Multilingual support (Hindi, English)

---

### 5.3 Live Classes
- Scheduled live sessions by faculty
- Real-time chat and Q&A during class
- Session recordings available post-class
- Class reminders via push notification / SMS

---

### 5.4 Practice & Tests
- Chapter-wise MCQ practice sets
- Full-length mock tests (GPAT/NIPER pattern)
- Previous year question (PYQ) bank
- Detailed solutions for every question
- Performance analytics after each test (accuracy, time spent, weak topics)

---

### 5.5 Doubt Resolution
- Text-based doubt posting with image upload (snap a question)
- AI-powered instant doubt answering
- Peer-to-peer doubt forum
- Faculty-answered doubts (within 24 hrs for paid users)

---

### 5.6 Study Material
- PDF notes, formula sheets, drug classification charts
- Downloadable for paid users
- Chapter summaries and revision modules
- Pharma-specific references (drug monographs, pharmacopoeia notes)

---

### 5.7 Batches & Courses
- Structured batches (e.g., "GPAT 2027 Crash Course", "B.Pharm Complete Batch")
- Free batches with limited content
- Paid batches with full access
- Batch progress tracker

---

### 5.8 Notifications & Engagement
- Daily study reminders
- Streak tracking (study consistency rewards)
- Leaderboards within batches
- Achievement badges

---

### 5.9 Payments & Subscriptions
- **Free tier:** Limited videos, no downloads, no live classes
- **Paid batch access:** One-time purchase or subscription model
- Payment methods: UPI, debit/credit card, EMI options
- Coupon and referral codes

---

### 5.10 Admin / Faculty Panel
- Upload and manage video content
- Create and schedule live classes
- Create test papers and question banks
- Monitor student performance and engagement analytics

---

## 6. 📱 Platform Priorities

| Platform | Priority |
|---|---|
| Android App | 🔴 P0 — Primary |
| iOS App | 🟡 P1 |
| Web (Browser) | 🟡 P1 |

---

## 7. 🛠️ Technical Requirements

| Component | Technology |
|---|---|
| Video Hosting | Vdocipher / Mux / Cloudflare (with DRM) |
| Live Streaming | Agora / 100ms SDK |
| Backend | Node.js or Django REST API |
| Database | PostgreSQL + Redis (caching) |
| Authentication | OTP-based via Firebase / AWS SNS |
| Payment Gateway | Razorpay / Cashfree |
| AI Doubt Engine | Claude API |
| Push Notifications | Firebase Cloud Messaging (FCM) |

---

## 8. ⚙️ Non-Functional Requirements

| Requirement | Target |
|---|---|
| Performance | Video load time < 3 seconds on 4G |
| Uptime | 99.5% availability |
| Security | DRM on paid content, encrypted payments |
| Scalability | 50,000 concurrent users during live classes |
| Accessibility | Works on low-end Android devices (2GB RAM) |

---

## 9. 🚫 Out of Scope (v1.0)

- Live 1:1 tutoring sessions
- Non-pharmacy or non-science curriculum
- International certifications (USP, FDA compliance courses)
- College placement services
- AR/VR learning experiences

---

## 10. ⚠️ Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Content piracy | DRM protection + video watermarking |
| Faculty churn | Long-term contracts + revenue share model |
| Low paid conversion | 7-day free trial of paid batches |
| Niche market size | Expand to allied health sciences (Nursing, MLT) in v2 |
| High infra cost at scale | Progressive CDN scaling + video compression |

---

## 11. 🗓️ Milestones & Timeline

| Phase | Timeline | Deliverables |
|---|---|---|
| **Phase 1** | Month 1–2 | Auth system, video player, basic content upload |
| **Phase 2** | Month 3 | Live classes, practice tests, doubt forum |
| **Phase 3** | Month 4 | Payments, batch system, mobile app (Android) |
| **Phase 4** | Month 5–6 | AI doubt engine, analytics dashboard, leaderboards |

---

## 12. 🔮 Future Scope (v2.0)

- Expand to allied health sciences: Nursing, Medical Lab Technology (MLT), Physiotherapy
- Live 1:1 doubt sessions with faculty
- International pharma certifications
- Job board and placement support for pharmacy graduates
- Vernacular language support (Tamil, Telugu, Bengali)

---

*Document Owner: Product Team | Last Updated: May 25, 2026*
##how to update
2. 📱 Front-End UI & Design Updates (Play Store Release Flow)
If you change the React code (like modifying the CSS, adding a new tab, or changing how the buttons look):

Increment the Version Code:
Open the file android/app/build.gradle.
Increment the version settings (e.g., change versionCode 1 to 2, and versionName "1.0" to "1.1").
Compile the new Bundle:
Run your standard build commands:
powershell
npm run build
npx cap sync android
cd android
.\gradlew bundleRelease
Upload to Google Play Console:
Log into your Google Play Console, go to your app, and upload the new .aab file under Releases.
Once Google approves it (usually takes 4–24 hours), your students will see the "Update" button in their Play Store app!
🚀 3. The Superpower: "Over-The-Air" (OTA) Live Updates
If you want to update your React front-end design without making your users download an update from the Play Store, you can integrate a free/low-cost library like Capacitor Updater or Ionic Appflow.

How it works: Whenever you change your React code, the library silently downloads the new HTML/JS bundle in the background when the student opens the app. The next second, they see your new design instantly—completely bypassing Play Store review tim