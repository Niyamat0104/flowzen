# ⚡ FlowZen — Kanban Board + Intelligent Workflow Engine

**FlowZen** is an **Intelligent Real-Time Kanban Board & Workflow Engine** built using pure HTML5, Vanilla CSS3 (Neo-Brutalist Design System), and ES6+ Vanilla JavaScript.

---

## 🌟 Key Features

1. **🤖 FlowZen Intelligence Predictive Engine**:
   - **Task Risk Scoring (0–100)**: Evaluates deadline pressure, priority, effort, age, and dependencies with explainable reason bullets.
   - **Category Effort Prediction**: Learns actual execution ratios across categories (`Backend`, `Frontend`, `Design`, `Docs`, `DevOps`) to calculate predicted effort & confidence percentages.
   - **"What Should I Work On Next?" Widget**: Weighted recommendation algorithm (30% Urgency, 25% Risk, 20% Priority, 15% Dependencies, 10% Effort).
   - **Dynamic Bottleneck Detection**: Automatically identifies stage bottlenecks.
   - **Natural Language Board Query Assistant**: Interactive side drawer to ask questions about risks, team tasks, and bottlenecks.

2. **🔑 6-Digit Email OTP Authentication**:
   - Log in with Email & Password or Register with Full Name, Age, Role, Email, and Password.
   - Generates random 6-digit numeric OTP codes dispatched via EmailJS Web API.
   - Includes interactive local **Sent Email Inbox Viewer** for instant testing.
   - Gated workspace access requiring OTP verification.

3. **📋 ASCII Alignment Kanban Board**:
   - **Quick Stats Bar**: `XX Tasks` • `XX Done` • `X Overdue` • `X Blocked`.
   - **4 Default Columns**: `📋 BACKLOG`, `📝 TO DO`, `⚡ IN PROGRESS`, `🎉 DONE` with WIP limits and drag-and-drop.
   - **Assignees**: Team assignment badges (`Alex`, `Priya`, `Aman`).
   - **Right-Side INSIGHTS Panel**: Stage bottlenecks, blocked task count, aging tasks (>5 days), and completion rate progress.

4. **🌙 Neo-Brutalist Deep Dark Mode**:
   - Idempotent click listener binding with persistent `localStorage` theme preference (`flowzen_theme_preference`).
   - Deep Midnight Dark theme tokens across all pages, modals, drawers, and cards.

5. **⚡ Multi-Tab Real-Time Sync**:
   - Native browser `BroadcastChannel('flowzen_realtime_sync')` for sub-50ms live updates across open browser tabs.

---

## 🛠️ Tech Stack Compliance
- **100% Pure HTML5, CSS3, Vanilla JavaScript (ES6+ ESM)**
- **0% React / Vue / Angular / Node Server / Build Tools**
- **Native Web APIs**: `localStorage`, `BroadcastChannel`, `fetch` API.

---

## 🚀 Running Locally
Start any HTTP web server from the project directory:

```bash
python -m http.server 8085
```

Open your browser to:
- Landing Page: `http://localhost:8085/index.html`
- Dashboard: `http://localhost:8085/boards.html`
- Intelligent Board: `http://localhost:8085/board.html?id=board_demo_1`
