# ReachInbox.ai — Full-Stack Email Job Scheduler & Dashboard

Production-grade **Email Job Scheduler Service and Frontend Dashboard** built for ReachInbox.ai. This solution handles high-throughput email scheduling, provider throttling, atomic hourly rate limiting per sender, server restart recovery, full-text Elasticsearch indexing, live Slack alerts, and real-time queue visibility using **BullMQ, Redis, PostgreSQL, Express, and React**.

---

## 🎯 Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                 REACT DASHBOARD                                   |
|   (Google OAuth, Scheduled & Sent Tables, CSV Lead Parser, Live Search & Stats)   |
+-----------------------------------------------------------------------------------+
                                          |
                                          | HTTP REST API
                                          v
+-----------------------------------------------------------------------------------+
|                             EXPRESS TYPESCRIPT SERVER                             |
|    - Controllers & Routes (/api/emails, /api/auth, /api/slack)                    |
|    - Bull Board Admin Dashboard (/admin/queues)                                   |
|    - Startup Recovery Sync Engine                                                 |
+-----------------------------------------------------------------------------------+
       |                        |                       |                   |
       v                        v                       v                   v
+--------------+       +------------------+     +---------------+   +-------------------+
|  PostgreSQL  |       | BullMQ + Redis   |     | Elasticsearch |   |   Ethereal SMTP   |
| (Prisma ORM) |       | (Delayed Queue)  |     | (Full-Text)   |   | (Fake Mail Test)  |
+--------------+       +------------------+     +---------------+   +-------------------+
```

### Key Technical Features

1. **No-Cron Job Scheduling (BullMQ + Redis)**:
   - All email sending requests are converted into **BullMQ delayed jobs** backed by Redis.
   - Job IDs correspond to relational `EmailJob.id` primary keys in PostgreSQL, guaranteeing **100% idempotency** with zero duplicate email sends.

2. **Persistence & Restart Survival**:
   - Delayed job state is stored natively in Redis.
   - On server reboot/restart, a startup recovery module (`syncScheduledJobsOnStartup`) queries PostgreSQL for pending `SCHEDULED` or `RATE_LIMITED_RESCHEDULED` jobs and reconciles them into BullMQ.
   - **Future scheduled emails are never lost, duplicated, or restarted from scratch.**

3. **Worker Concurrency & Minimum Throttling Delay**:
   - **Worker Concurrency**: Configurable via `WORKER_CONCURRENCY` env (default: `5`).
   - **Min Delay Between Sends**: Enforces provider throttling via `MIN_EMAIL_DELAY_MS` (default: `2000ms` / 2 seconds).

4. **Hourly Rate Limiting per Sender & Auto-Rescheduling**:
   - Atomic Redis counter (`ratelimit:{senderEmail}:{YYYY-MM-DD-HH}`) tracks hourly volume across multiple workers.
   - When the limit is exceeded (e.g. `MAX_EMAILS_PER_HOUR_PER_SENDER=10`), jobs are **not dropped or failed**.
   - Instead, pending emails are automatically **rescheduled into the next hourly window** (`current_hour + 1`), preserving FIFO sending order.

5. **Live Slack Notification on Rate Limit Hit**:
   - Integrates Slack OAuth and Incoming Webhook.
   - The moment a sender hits their hourly limit, a structured notification is sent to Slack with sender info, rescheduled job count, and next window time.

6. **Elasticsearch Full-Text Search**:
   - Emails are indexed into Elasticsearch (`emails` index) upon scheduling, delivery, or rescheduling.
   - Exposes `/api/emails/search?q=query` performing `multi_match` queries across subject, body, recipient, sender, and status with automatic fallback to PostgreSQL.

7. **Fake SMTP via Ethereal Email**:
   - Uses Nodemailer + Ethereal Email SMTP.
   - Generates and saves test message preview URLs (`https://ethereal.email/message/...`) clickable directly from the dashboard tables!

---

## 🧪 Tech Stack

- **Backend**: Node.js, TypeScript, Express.js, BullMQ, Redis, PostgreSQL (Prisma ORM), Elasticsearch, Nodemailer (Ethereal SMTP), Axios, Multer, Zod.
- **Frontend**: React.js, Vite, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion, Google OAuth Provider.
- **Infrastructure**: Docker & Docker Compose (PostgreSQL, Redis, Elasticsearch containers).

---

## 🚀 How to Run the Application

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Docker Desktop** (or running local PostgreSQL, Redis, & Elasticsearch)

### 2. Start Infrastructure Containers via Docker
From the project root directory, run:
```bash
docker compose up -d
```
This starts:
- **PostgreSQL**: `localhost:5432` (`reachinbox_db`)
- **Redis**: `localhost:6379`
- **Elasticsearch**: `localhost:9200`

---

### 3. Run Backend (Express & BullMQ Engine)

```bash
cd backend
npm install
npx prisma db push
npm run dev
```

The backend starts on `http://localhost:5000`.
- **Live BullMQ Queue Dashboard**: [http://localhost:5000/admin/queues](http://localhost:5000/admin/queues)
- **Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

---

### 4. Run Frontend (React + Vite Dashboard)

```bash
cd frontend
npm install
npm run dev
```

The frontend dashboard starts on [http://localhost:3000](http://localhost:3000).

---

## 🛠 Backend Environment Variables (`backend/.env`)

```env
PORT=5000
DATABASE_URL="postgresql://reachinbox:reachinbox_password@localhost:5432/reachinbox_db?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
ELASTICSEARCH_NODE="http://localhost:9200"

# Throttling & Rate Limits
WORKER_CONCURRENCY=5
MIN_EMAIL_DELAY_MS=2000
MAX_EMAILS_PER_HOUR_PER_SENDER=10

# Slack Integration (Optional OAuth keys, Webhook can be passed in UI)
SLACK_CLIENT_ID=""
SLACK_CLIENT_SECRET=""
SLACK_REDIRECT_URI="http://localhost:5000/api/slack/callback"
SLACK_DEFAULT_WEBHOOK_URL=""

FRONTEND_URL="http://localhost:3000"
```

---

## 🖥 Frontend Dashboard Features

1. **Google Login**:
   - Google Authentication button with fallback Demo Login.
   - Top bar displays user Name, Email, Avatar, and Logout option.
2. **Scheduled Emails Table**:
   - Displays Recipient, Subject, Scheduled Delivery Time, Status badges (`SCHEDULED`, `SENDING`, `RATE_LIMITED_RESCHEDULED`).
   - Includes job cancellation button.
3. **Sent Emails Table**:
   - Displays Recipient, Subject, Sent Time, Status (`SENT` / `FAILED`), and clickable **"View in Ethereal"** preview links.
4. **Compose & Schedule Modal**:
   - Subject & HTML body input.
   - Lead CSV / Text file upload with live regex parser & valid email counter.
   - Start Time date picker, Delay per email (seconds), and Sender Hourly Rate Limit settings.
5. **Elasticsearch Full-Text Search**:
   - Real-time search bar querying Elasticsearch across all email contents.
6. **Slack Integration Modal**:
   - Connect Slack Webhook / OAuth & test live rate-limit alerts.
7. **System Limits Controls**:
   - Live adjustments for Worker Concurrency, Min Delay, and Max Hourly Limit.

---

## 📽 Demo Video Guidelines

In your submission video:
1. **Google Login / Demo Login** & Overview of Header (User info, Slack status, BullMQ button).
2. **Compose & Schedule Campaign**: Upload CSV or paste lead emails, set start time, submit schedule request.
3. **View Scheduled & Sent Emails**: Show emails in `Scheduled Emails` tab, wait for delivery, view delivered emails in `Sent Emails` tab, and click **"View in Ethereal"** to open fake SMTP message preview.
4. **Server Restart Scenario**:
   - Schedule emails for 2 minutes in the future.
   - Stop backend server (`Ctrl+C`).
   - Restart backend server (`npm run dev`).
   - Observe startup log `[Startup Sync] Restored job ... to BullMQ`.
   - Verify future emails send at the exact scheduled time without duplication.
5. **Rate Limiting & Slack Alert**:
   - Set hourly limit to `2`.
   - Schedule 4 emails.
   - Observe 2 sent emails and 2 rescheduled emails (`RATE_LIMITED_RESCHEDULED`).
   - Verify live Slack rate-limit alert message.

---

## 📋 Requirements Mapping Summary

| Requirement | Implementation Status | Notes |
| :--- | :---: | :--- |
| **No Cron Jobs** | ✅ Completed | BullMQ delayed jobs + Redis engine |
| **Server Restart Survival** | ✅ Completed | Redis persistence + startup DB reconciliation sync |
| **Relational DB** | ✅ Completed | PostgreSQL with Prisma ORM |
| **Fake SMTP** | ✅ Completed | Ethereal Email with preview links stored in DB |
| **Elasticsearch Indexing** | ✅ Completed | Indexing on schedule/send + full-text search API |
| **BullMQ Admin Board** | ✅ Completed | Mounted at `/admin/queues` via Bull Board UI |
| **Worker Concurrency** | ✅ Completed | Configurable via `WORKER_CONCURRENCY` |
| **Minimum Delay per Send** | ✅ Completed | Configurable via `MIN_EMAIL_DELAY_MS` |
| **Hourly Rate Limiting** | ✅ Completed | Redis atomic counter + next hour window auto-reschedule |
| **Slack Rate Limit Notification** | ✅ Completed | OAuth & Incoming Webhook live notification call |
| **Google Login** | ✅ Completed | Google OAuth & user profile header |
| **Dashboard UI** | ✅ Completed | React + Vite + Tailwind CSS dashboard matching Figma aesthetics |
| **CSV Lead Upload & Parse** | ✅ Completed | Backend & Frontend CSV parser with preview count |
