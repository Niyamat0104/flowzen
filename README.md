# ⚡ FlowZen — Collaborative Intelligent Kanban & Multi-View Engine

**FlowZen** is an enterprise-grade **Intelligent Real-Time Kanban & Workflow Engine** built using pure HTML5, Vanilla CSS3 (SaaS Obsidian & Slate Design System), and ES6+ Vanilla JavaScript.

---

## 🌟 Key Features & Best Practices

1. **📊 Multi-View Switcher (Kanban | Gantt Timeline | Monthly Calendar)**:
   - **Kanban Board**: Drag-and-drop task cards across columns with WIP capacity limits, risk badges, and status pills.
   - **Gantt Timeline Chart**: Interactive 14-day timeline view with color-coded duration bars, subtask progress, and risk indicators.
   - **Monthly Calendar Grid**: 7-column calendar view mapping task due dates, with interactive click-to-create date scheduling.

2. **🤖 FlowZen Predictive Intelligence Engine**:
   - **Task Risk Scoring (0–100)**: Evaluates deadline pressure, priority, effort, age, and dependencies with explainable reason breakdown.
   - **Category Effort Prediction**: Learns execution ratios across categories (`Backend`, `Frontend`, `Design`, `Docs`, `DevOps`) to calculate predicted effort & confidence levels.
   - **"Next Recommended Task" Widget**: Weighted recommendation algorithm (30% Urgency, 25% Risk, 20% Priority, 15% Dependencies, 10% Effort).
   - **Dynamic Bottleneck & Dependency Tracker**: Identifies stage bottlenecks and handles task blocking & automatic dependency unblocking.
   - **Natural Language AI Query Assistant**: Interactive side drawer to query board metrics, risk scores, and team task assignments.

3. **👥 Executive Team Management System**:
   - Creator owner locking with role controls (`Owner`, `Member`, `Viewer`).
   - Deterministic avatar color palette and dynamic assignee filter dropdowns.

4. **⚡ Multi-Tab Real-Time BroadcastChannel Sync**:
   - Native browser `BroadcastChannel('flowzen_realtime_sync')` for sub-50ms live updates across open browser tabs without server polling.

5. **🌙 Obsidian & Slate Visual Identity**:
   - Executive dark & light modes with persistent `localStorage` theme preference.

---

## 🛠️ Tech Stack & Guidelines Compliance

- **100% Pure HTML5, CSS3, Vanilla JavaScript (ES6+ ESM)**
- **0% Build Tools / Node Server / External UI Frameworks**
- **Clean Folder Structure**:
  - `index.html`, `boards.html`, `board.html` (Semantic HTML5 pages)
  - `/css` (`variables.css`, `base.css`, `components.css`, `board.css`, `views.css`, `responsive.css`)
  - `/js` (`auth.js`, `boards.js`, `board-state.js`, `board-render.js`, `timeline-render.js`, `calendar-render.js`, `flowzen-intelligence.js`, `dependency-system.js`, etc.)
- **Security**: No hardcoded API keys, secrets, or private passwords.
- **License**: MIT Open Source License (`LICENSE`).
- **Version Control**: `.gitignore` configured to ignore IDE/OS files (`.vscode/`, `.DS_Store`, `node_modules/`).

---

## 🚀 Running Locally

### Prerequisites
- Any standard web browser (Chrome, Firefox, Edge, Safari).
- Python 3.x (or any local static HTTP web server).

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
   - Landing Page: `http://localhost:8085/index.html`
   - Workspaces Dashboard: `http://localhost:8085/boards.html`
   - Kanban & Multi-View Board: `http://localhost:8085/board.html`

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for details.
