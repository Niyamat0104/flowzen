<<<<<<< HEAD
# ⚡ FlowZen — Kanban Board + Intelligent Workflow Engine

FlowZen is a fully deployable, real-time collaborative Kanban board web application and intelligent workflow engine built strictly with **pure HTML5, CSS3, and Vanilla JavaScript (ES6+ ESM)** — no frontend frameworks (no React/Vue/Angular), no build steps or bundlers, and zero custom backend servers.

---

## 🤖 Novel AI Feature — FlowZen Intelligence

FlowZen includes a built-in **Predictive Task Risk & Recommendation Engine** operating on your task data and workflow history:

### 1. Task Risk Prediction (0–100)
- Calculates a dynamic **Risk Score from 0–100** using:
  - **Deadline Pressure**: Due date proximity & overdue status.
  - **Priority**: Critical, Urgent, High, Medium, Low.
  - **Estimated Effort**: Tasks with larger estimated hours increase risk.
  - **Task Age**: Duration sitting incomplete in a column.
  - **Dependency Impact**: Number of downstream tasks blocked.
  - **Historical Performance**: Category estimation accuracy ratios.
- Classified into:
  - `0–30` → **Low Risk**
  - `31–60` → **Moderate Risk**
  - `61–80` → **High Risk**
  - `81–100` → **Critical Risk**
- Generates **Explainable Reason Bullet Points** (e.g. *Risk: 86/100 — High • Deadline is approaching • Similar Backend tasks take 25% longer than estimated • This task blocks 3 downstream tasks*).

### 2. Predicted Effort & Confidence Rating
- Learns estimation habits per category (`Backend`, `Frontend`, `Design`, `Docs`, `DevOps`) from completed task history.
- Formula: `Predicted Effort = Estimated Effort × Historical Estimation Ratio`.
- Displays a dynamic **Confidence Score** based on available category sample data.

### 3. Intelligent "What Should I Work On Next?" Recommendation
- Ranks active tasks using weighted scoring (30% Urgency, 25% Risk, 20% Priority, 15% Dependency Impact, 10% Effort Suitability).
- Displays the top-recommended focus task with an explicit breakdown ("Why?") and 1-click **"Start Task Now"** action.

### 4. Dependency Intelligence
- Tracks direct dependencies and calculates downstream blocked tasks.
- Identifies high-impact tasks (e.g. *"Completing this task unblocks 3 downstream tasks"*).

### 5. Bottleneck Detection
- Dynamically flags columns accumulating tasks (>40% of active tasks) or exhibiting long task residence times.

### 6. Historical Learning & Analytics
- Records task completion statistics (`estimatedHours`, `actualHours`, `category`, `completedAt`) to calculate estimation errors per category (e.g. `Backend: +28%`, `Frontend: +12%`, `Docs: -8%`).

---

## 🔑 Real-Life 6-Digit OTP Email Verification System
- **6-Digit Numeric OTP Code**: Generated on signup and valid for 10 minutes.
- **Client Email Dispatch**: Web API endpoint (`https://api.emailjs.com/api/v1.0/email/send`) dispatches actual emails to user inboxes.
- **Auto-Focusing 6-Digit Modal**: 6 styled digit boxes with auto-focusing & paste support.
- **📬 Sent Mail Inbox Previewer**: Interactive modal to inspect dispatched verification emails.

---

## 🌐 Local Live Preview

A local static web server is running on your machine:
- **Landing Page**: [http://localhost:8085/index.html](http://localhost:8085/index.html)
- **Workspace Dashboard**: [http://localhost:8085/boards.html](http://localhost:8085/boards.html)
- **Interactive Intelligent Board**: [http://localhost:8085/board.html?id=board_demo_1](http://localhost:8085/board.html?id=board_demo_1)
=======
# flowzen
FlowZen is a kanban Board Style agile team collaboration tool 
>>>>>>> a3786852805e93d9c06131643a51e23b52182b95
