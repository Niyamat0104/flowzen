# ⚡ FlowZen — Collaborative Intelligent Kanban & Multi-View Engine

> **Web Fundamentals Project 2026 Deliverable & Project Proposal Document**  
> **Tech Stack:** Pure Vanilla HTML5 • Vanilla CSS3 • Modern ES6+ Vanilla JavaScript (ES Modules)  
> **Repository:** [https://github.com/niyamat/taskflow](https://github.com/niyamat/taskflow)

---

## 📋 Table of Contents
1. [Project Proposal & Executive Overview](#-project-proposal--executive-overview)
2. [Project Goals & Core Objectives](#-project-goals--core-objectives)
3. [Technical Specifications & Architecture](#-technical-specifications--architecture)
4. [Data Storage & Web Storage Specifications](#-data-storage--web-storage-specifications)
5. [CRUD Operations Matrix](#-crud-operations-matrix)
6. [Design System & Responsive Layout Matrix](#-design-system--responsive-layout-matrix)
7. [Web Fundamentals 2026 Compliance Audit](#-web-fundamentals-2026-compliance-audit)
8. [Deployment Options & Deployment Guide (Best Choice)](#-deployment-options--deployment-guide-best-choice)
9. [Running Locally](#-running-locally)
10. [License](#-license)

---

## 🎯 Project Proposal & Executive Overview

### Project Description
**FlowZen** is an enterprise-grade, zero-dependency **Collaborative Intelligent Kanban & Multi-View Engine**. Designed for modern software engineering and product teams, FlowZen solves the friction of traditional task management by combining:
1. **Interactive Multi-View Interfaces**: Seamless switching between Kanban Board, Gantt Timeline Chart, and Monthly Calendar View.
2. **Predictive Intelligence Engine**: Automated 0–100 task risk scoring, category effort velocity estimation, bottleneck alerts, and automated task recommendation algorithms.
3. **Zero-Latency Broadcast Channel Synchronization**: Native inter-tab live state mirroring across multiple browser windows without requiring external backend servers.

### Target Audience & Use Case
Engineering managers, product designers, DevOps leads, and software developers requiring a fast, local-first workspace tool to manage backlogs, track project deadlines, assign roles, and mitigate workflow bottlenecks.

---

## 🎯 Project Goals & Core Objectives

- **100% Native Web Fundamentals**: Build a state-of-the-art web application using exclusively **HTML5, CSS3, and ES6+ JavaScript Modules**, without React, Angular, Vue, jQuery, npm build bundlers, or third-party JS libraries.
- **Complete Local Web Storage**: Utilize HTML5 `localStorage` and `sessionStorage` for persistent board storage, user session management, theme preferences, and activity logging.
- **Native Real-Time Synchronization**: Leverage the browser's native `BroadcastChannel` API for sub-50ms multi-tab state updates.
- **Full CRUD Capabilities**: Implement intuitive Create, Read, Update, and Delete operations across Workspaces/Boards, Columns, Tasks, Subtasks, Team Members, and User Profiles.
- **Responsive & Accessible Design**: Deliver a fluid, adaptive UI with custom breakpoints supporting Mobile ($<768\text{px}$), Tablet ($768\text{px}-1024\text{px}$), and Desktop ($>1024\text{px}$) viewports.
- **Comprehensive Documentation**: Provide a production-ready proposal, architecture overview, and step-by-step deployment guide.

---

## 🏗️ Technical Specifications & Architecture

### Folder & File Structure
```
taskflow/
├── index.html                   # Landing page with interactive live animated showcase
├── boards.html                  # Workspace Dashboard & Board Creation Hub
├── board.html                   # Main Interactive Kanban Board & Multi-View Workspace
├── LICENSE                      # MIT Open Source License
├── README.md                    # Project Proposal & Documentation (Markdown)
├── .gitignore                   # Excludes IDE (.vscode, .vs) and OS temp files (.DS_Store)
├── assets/                      # Graphic assets & illustrations
│   └── flowzen_team_kanban.jpg  # Team workspace illustration
├── css/                         # Modular CSS Architecture
│   ├── variables.css            # Executive design tokens, glassmorphism, & dark mode themes
│   ├── base.css                 # CSS reset, typography system, & utility classes
│   ├── components.css           # Buttons, cards, modals, badges, & navigation dock
│   ├── board.css                # Kanban column layout, task cards, & floating drawers
│   ├── views.css                # Gantt Timeline & Monthly Calendar view styles
│   ├── live-kanban-showcase.css # Landing page animated card-pasting showcase
│   └── responsive.css           # Mobile, tablet, & desktop media query breakpoints
└── js/                          # Modular ES JavaScript Architecture (ESM)
    ├── auth.js                  # Authentication controller & user session manager
    ├── boards.js                # Boards grid fetcher, create/delete board handler
    ├── board-state.js           # Central state manager & BroadcastChannel multi-tab sync
    ├── board-render.js          # Kanban DOM renderer, quick stats bar, & card handlers
    ├── timeline-render.js       # Gantt Timeline chart renderer & date duration bars
    ├── calendar-render.js       # 7-column Monthly Calendar grid renderer
    ├── flowzen-intelligence.js  # Risk scoring (0-100), effort predictor, & AI query assistant
    ├── dependency-system.js     # Task dependency tracker & auto-unblocking logic
    ├── analytics.js             # Workflow metrics, completion gauges, & chart drawer
    ├── activity-log.js          # Persistent live activity log feed
    ├── filters-sort.js          # Task search, category/priority filter, & sorter
    ├── live-kanban-showcase.js  # Real-time animated card-pasting controller
    ├── theme.js                 # Executive Dark & Light theme switcher
    └── ui-utils.js              # Modal handlers, toast notifications, & profile manager
```

---

## 💾 Data Storage & Web Storage Specifications

FlowZen uses browser-native HTML5 Web Storage mechanisms to ensure 100% offline capability and instant data retrieval:

| Storage Type | Key Name | Purpose / Contents |
| :--- | :--- | :--- |
| `localStorage` | `flowzen_all_boards` | Array of workspace board metadata (IDs, titles, project categories, target deadlines, team members, owner ID). |
| `localStorage` | `flowzen_tasks_<boardId>` | Array of task objects (title, description, assignee, priority, estimated hours, columnId, dueDate, labels, subtasks, dependsOnTaskId). |
| `localStorage` | `flowzen_cols_<boardId>` | Column stage configurations (title, position, wipLimit, isDoneColumn). |
| `localStorage` | `flowzen_currentUser` | Active authenticated user session details (email, displayName, role, avatar color). |
| `localStorage` | `flowzen_theme` | Active UI color theme mode (`dark` vs `light`). |
| `localStorage` | `flowzen_activity_<boardId>`| Historical log feed of task movements, edits, and team actions. |
| `BroadcastChannel` | `flowzen_realtime_sync` | Inter-tab event bus broadcasting state mutations (`TASK_MOVED`, `BOARD_UPDATED`) for zero-latency multi-tab sync. |

---

## 🔄 CRUD Operations Matrix

FlowZen supports complete Create, Read, Update, and Delete operations:

| Entity | Create | Read | Update | Delete |
| :--- | :--- | :--- | :--- | :--- |
| **Workspace Board** | Modal form in `boards.html` with title, category, target deadline, and initial team members. | `fetchUserBoards()` loads boards owned by or shared with current user. | `saveBoardMetadata()` updates board properties & team roles. | `deleteBoard()` purges board and associated storage keys. |
| **Kanban Column** | `+ Add Column` modal allows adding custom workflow stages. | Column list rendered dynamically across views. | `Column Options` modal updates title, WIP capacity limit, and Done status. | `deleteColumn()` removes column and reassigns orphan tasks. |
| **Task Item** | `+ New Task` modal adds task with assignee, priority, subtasks, & dependencies. | Task cards displayed on Kanban Board, Timeline Chart, and Calendar Grid. | Task edit modal updates details; drag-and-drop or 1-click complete moves task. | `Delete Task` button purges task and updates dependent tasks. |
| **Subtask Checklist** | Inline input inside task modal adds checklist items. | Rendered inside task edit modal and task cards. | Checkboxes toggle subtask completion percentage ($0\% - 100\%$). | Remove button deletes subtask item from checklist. |
| **Team Member** | `Manage Team` modal adds new member with name, email, and role. | Team members displayed in avatar stacks and assignee filters. | Role selector updates permissions (`Owner`, `Member`, `Viewer`). | Remove button removes member from board access. |
| **User Profile** | Registration form creates new user session profile. | Top navbar profile badge displays active user credentials. | `Edit Profile` modal updates display name, age, and role. | `Log Out` clears active session state. |

---

## 🎨 Design System & Responsive Layout Matrix

### Typography Hierarchy & Color System
- **Heading Font**: `Plus Jakarta Sans` ($2.2\text{rem}$ Hero Title, $1.25\text{rem}$ Board Titles, $1.15\text{rem}$ Modal Headers).
- **Body Font**: `Inter` ($0.88\text{rem}$ Body, $0.85\text{rem}$ Descriptions, $0.78\text{rem}$ Metadata dates).
- **Micro Badges**: Uppercase tracked typography ($0.7\text{rem}$, `font-weight: 800`, `letter-spacing: 0.05em`).
- **Color Palette**: SaaS Executive Indigo (`#4F46E5`), Crisp SaaS Cyan (`#0EA5E9`), Emerald Green (`#10B981`), Pink Accent (`#D946EF`), Coral Red (`#EF4444`).

### Responsive Viewport Adaptation
- **Desktop ($>1024\text{px}$)**: Full multi-column Kanban board, 14-day Gantt timeline, 7-column calendar grid, and floating insights drawer.
- **Tablet ($768\text{px} - 1024\text{px}$)**: Scrollable horizontal Kanban columns, compact toolbar dropdowns, and drawer toggles.
- **Mobile ($<768\text{px}$)**: Single-column stack view, collapsible subnav toolbar, hidden mobile avatar labels, and full-screen glass modal overlays.

---

## ✅ Web Fundamentals 2026 Compliance Audit

| Guideline Requirement | Project Compliance Status | Implementation Detail |
| :--- | :---: | :--- |
| **Tech Stack: HTML, CSS, JS** | ✅ **100% Compliant** | Built using pure Vanilla HTML5, Vanilla CSS3, and ES Modules. Zero external JS libraries. |
| **At least 2 Pages** | ✅ **100% Compliant** | Includes 3 primary pages: `index.html` (Landing Page), `boards.html` (Dashboard), and `board.html` (Board Workspace). |
| **Web Storage & Cookies** | ✅ **100% Compliant** | Uses `localStorage` for state/boards/tasks, `sessionStorage` for temporary session buffers, and `BroadcastChannel` for tab sync. |
| **Full CRUD Operations** | ✅ **100% Compliant** | Complete Create, Read, Update, and Delete for Boards, Columns, Tasks, Subtasks, Team Members, and Profiles. |
| **Responsive Design** | ✅ **100% Compliant** | Fully fluid layout tested for mobile, tablet, and desktop viewports (`css/responsive.css`). |
| **Clean Project Structure** | ✅ **100% Compliant** | Clean separation into `/css`, `/js`, `/assets`, root HTML pages, `README.md`, and `LICENSE`. |
| **GitHub Repository Best Practices**| ✅ **100% Compliant** | Version controlled with `.gitignore`, `LICENSE`, descriptive atomic commit messages, and no committed secrets. |
| **Project Proposal in README.md** | ✅ **100% Compliant** | Complete proposal, goals, specifications, architecture, and design document included directly in `README.md`. |

---

## 🌐 Deployment Options & Deployment Guide (Best Choice)

Since FlowZen is built using **pure static HTML, CSS, and Vanilla JavaScript**, it can be deployed for **free** on any web hosting platform without requiring server runtimes (like Node.js, PHP, or Python).

### 🏆 Recommended & Best Option: GitHub Pages (Free & Automatic)
**GitHub Pages** is the best deployment option because:
- It is **100% free**, built directly into your GitHub repository.
- Requires **zero configuration** files.
- Automatically updates whenever you push code changes to GitHub.
- Provides a free HTTPS SSL certificate and a custom `github.io` URL.

#### Step-by-Step GitHub Pages Deployment Guide:
1. Push your repository code to GitHub:
   ```bash
   git add .
   git commit -m "Deploy project to GitHub Pages"
   git push origin main
   ```
2. Open your repository on GitHub (`https://github.com/niyamat/taskflow`).
3. Click on the **Settings** tab at the top of your repository.
4. On the left sidebar under *Code and automation*, click **Pages**.
5. Under **Build and deployment** $\rightarrow$ **Source**, select **Deploy from a branch**.
6. Under **Branch**, select `main` branch and `/ (root)` folder, then click **Save**.
7. Wait 1–2 minutes. Your live deployed website URL will appear at:
   `https://niyamat.github.io/taskflow/`

---

### Alternative Deployment Options

#### Option 2: Vercel (Instant One-Click Deploy)
1. Sign up for free at [vercel.com](https://vercel.com).
2. Click **Add New** $\rightarrow$ **Project**.
3. Import your `taskflow` GitHub repository.
4. Leave framework preset as **Other** (Static HTML) and click **Deploy**.
5. Your app will be live at `https://taskflow.vercel.app`.

#### Option 3: Netlify (Drag-and-Drop or Git Deploy)
1. Sign up for free at [netlify.com](https://netlify.com).
2. Drag and drop your `taskflow` project folder directly into the Netlify Deploy box, or connect your GitHub repository.
3. Your app will be live at `https://taskflow.netlify.app`.

#### Option 4: Cloudflare Pages
1. Sign up for free at [pages.cloudflare.com](https://pages.cloudflare.com).
2. Connect your GitHub account and select your `taskflow` repository.
3. Set build output folder to `/` (root) and click **Save and Deploy**.

---

## 🚀 Running Locally

### Prerequisites
- Any standard modern web browser (Google Chrome, Mozilla Firefox, Microsoft Edge, Safari).
- Python 3.x (or any local static web server).

### Step-by-Step Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/niyamat/taskflow.git
   cd taskflow
   ```

2. **Start a local HTTP server**:
   ```bash
   python -m http.server 8085
   ```

3. **Open in Browser**:
   Navigate to:
   - **Landing Page**: `http://localhost:8085/index.html`
   - **Workspaces Dashboard**: `http://localhost:8085/boards.html`
   - **Kanban Workspace**: `http://localhost:8085/board.html`

---

## 📄 License

Distributed under the **MIT Open Source License**. See [`LICENSE`](LICENSE) for details.
