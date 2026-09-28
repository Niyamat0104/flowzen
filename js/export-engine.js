/* FlowZen Export & Import Engine — JSON Backup/Restore, CSV Spreadsheet Export & Executive PDF Report Generator */
import { showToast, escapeHTML, generateId } from './ui-utils.js';
import { getCurrentUser } from './auth.js';
import { MEMBER_AVATAR_COLORS, sanitizeBoardData } from './boards.js';

/**
 * 1. EXPORT BOARD TO JSON BACKUP
 */
export function exportBoardToJSON(boardId) {
  if (!boardId) return;

  try {
    const metaKey = `flowzen_board_${boardId}`;
    const colKey = `flowzen_cols_${boardId}`;
    const taskKey = `flowzen_tasks_${boardId}`;
    const logKey = `flowzen_activity_${boardId}`;

    const rawMeta = localStorage.getItem(metaKey);
    const rawCols = localStorage.getItem(colKey);
    const rawTasks = localStorage.getItem(taskKey);
    const rawLogs = localStorage.getItem(logKey);

    let boardData = rawMeta ? JSON.parse(rawMeta) : null;
    if (!boardData) {
      const rawAll = localStorage.getItem('flowzen_all_boards');
      if (rawAll) {
        const allBoards = JSON.parse(rawAll);
        boardData = allBoards.find(b => b.id === boardId) || null;
      }
    }

    if (!boardData) {
      showToast("Could not find board metadata to export", "error");
      return;
    }

    const exportPayload = {
      app: "FlowZen Intelligent Kanban",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      board: boardData,
      columns: rawCols ? JSON.parse(rawCols) : [],
      tasks: rawTasks ? JSON.parse(rawTasks) : [],
      activityLog: rawLogs ? JSON.parse(rawLogs) : []
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const sanitizeFilename = (boardData.title || "board")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_");

    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename}_flowzen_backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported JSON backup for "${boardData.title}"`, "success");
  } catch (err) {
    console.error("JSON Export Error:", err);
    showToast("Failed to export JSON backup", "error");
  }
}

/**
 * 2. IMPORT / RESTORE BOARD FROM JSON FILE
 */
export function importBoardFromJSONFile(file, onSuccess) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      const data = JSON.parse(content);

      if (!data || !data.board || !data.board.title) {
        showToast("Invalid FlowZen JSON backup file format", "error");
        return;
      }

      const currentUser = getCurrentUser();
      const userId = currentUser ? (currentUser.id || currentUser.uid) : "usr_owner";

      // Generate a fresh unique board ID to prevent collisions
      const newBoardId = generateId("board");
      const importedBoard = {
        ...data.board,
        id: newBoardId,
        title: `${data.board.title} (Restored)`,
        ownerId: userId,
        createdAt: new Date().toISOString()
      };

      const sanitized = sanitizeBoardData(importedBoard);

      // Save individual storage keys
      localStorage.setItem(`flowzen_board_${newBoardId}`, JSON.stringify(sanitized));
      localStorage.setItem(`flowzen_cols_${newBoardId}`, JSON.stringify(data.columns || []));
      localStorage.setItem(`flowzen_tasks_${newBoardId}`, JSON.stringify(data.tasks || []));
      localStorage.setItem(`flowzen_activity_${newBoardId}`, JSON.stringify(data.activityLog || []));

      // Add to global boards list
      const rawAll = localStorage.getItem("flowzen_all_boards");
      const allBoards = rawAll ? JSON.parse(rawAll) : [];
      allBoards.unshift(sanitized);
      localStorage.setItem("flowzen_all_boards", JSON.stringify(allBoards));

      showToast(`Restored board "${sanitized.title}" successfully!`, "success");

      if (onSuccess) onSuccess(sanitized);
    } catch (err) {
      console.error("JSON Import Error:", err);
      showToast("Error parsing backup JSON file", "error");
    }
  };

  reader.readAsText(file);
}

/**
 * 3. EXPORT TASKS TO CSV SPREADSHEET (EXCEL / GOOGLE SHEETS COMPATIBLE)
 */
export function exportBoardToCSV(boardId) {
  if (!boardId) return;

  try {
    const metaKey = `flowzen_board_${boardId}`;
    const colKey = `flowzen_cols_${boardId}`;
    const taskKey = `flowzen_tasks_${boardId}`;

    const rawMeta = localStorage.getItem(metaKey);
    const rawCols = localStorage.getItem(colKey);
    const rawTasks = localStorage.getItem(taskKey);

    let boardData = rawMeta ? JSON.parse(rawMeta) : { title: "Workspace" };
    const cols = rawCols ? JSON.parse(rawCols) : [];
    const tasks = rawTasks ? JSON.parse(rawTasks) : [];

    const colMap = {};
    cols.forEach(c => colMap[c.id] = c.title);

    const headers = [
      "Task ID",
      "Title",
      "Description",
      "Stage / Column",
      "Priority",
      "Category",
      "Assignee",
      "Estimated Hours",
      "Actual Hours Worked",
      "Due Date",
      "Subtasks Count",
      "Subtasks Completed",
      "Created Date"
    ];

    const csvRows = [];
    csvRows.push(headers.join(","));

    tasks.forEach(t => {
      const stageName = colMap[t.columnId] || t.columnId || "Unknown";
      const subtasks = Array.isArray(t.subtasks) ? t.subtasks : [];
      const subtasksDone = subtasks.filter(s => s.done).length;

      const escapeCSV = (field) => {
        if (field === null || field === undefined) return '""';
        const str = String(field).replace(/"/g, '""');
        return `"${str}"`;
      };

      const row = [
        escapeCSV(t.id),
        escapeCSV(t.title),
        escapeCSV(t.description),
        escapeCSV(stageName),
        escapeCSV(t.priority || "medium"),
        escapeCSV(t.category || "General"),
        escapeCSV(t.assignee || "Unassigned"),
        escapeCSV(t.estimatedHours || 0),
        escapeCSV(t.actualHours || 0),
        escapeCSV(t.dueDate || "Continuous"),
        escapeCSV(subtasks.length),
        escapeCSV(subtasksDone),
        escapeCSV(t.createdAt ? t.createdAt.split("T")[0] : "")
      ];

      csvRows.push(row.join(","));
    });

    const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const sanitizeFilename = (boardData.title || "board")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_");

    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFilename}_tasks_report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported CSV spreadsheet for "${boardData.title}"`, "success");
  } catch (err) {
    console.error("CSV Export Error:", err);
    showToast("Failed to export CSV spreadsheet", "error");
  }
}

/**
 * 4. GENERATE PRINTABLE EXECUTIVE PDF SPRINT REPORT
 */
export function generatePDFReport(boardId) {
  if (!boardId) return;

  try {
    const metaKey = `flowzen_board_${boardId}`;
    const colKey = `flowzen_cols_${boardId}`;
    const taskKey = `flowzen_tasks_${boardId}`;

    const rawMeta = localStorage.getItem(metaKey);
    const rawCols = localStorage.getItem(colKey);
    const rawTasks = localStorage.getItem(taskKey);

    let boardData = rawMeta ? JSON.parse(rawMeta) : null;
    if (!boardData) {
      const rawAll = localStorage.getItem("flowzen_all_boards");
      if (rawAll) {
        const allBoards = JSON.parse(rawAll);
        boardData = allBoards.find(b => b.id === boardId) || { title: "FlowZen Workspace" };
      }
    }

    const cols = rawCols ? JSON.parse(rawCols) : [
      { id: 'col_backlog', title: 'BACKLOG' },
      { id: 'col_todo', title: 'TO DO' },
      { id: 'col_in_progress', title: 'IN PROGRESS' },
      { id: 'col_done', title: 'DONE' }
    ];
    const tasks = rawTasks ? JSON.parse(rawTasks) : [];

    const colMap = {};
    cols.forEach(c => colMap[c.id] = c.title);

    // Compute Metrics
    const totalTasks = tasks.length;
    const doneCols = cols.filter(c => c.isDoneColumn || (c.title && c.title.toLowerCase().includes('done')));
    const doneColIds = doneCols.map(c => c.id);
    if (doneColIds.length === 0 && cols.length > 0) doneColIds.push(cols[cols.length - 1].id);

    const completedTasks = tasks.filter(t => doneColIds.includes(t.columnId));
    const inProgressTasks = tasks.filter(t => !doneColIds.includes(t.columnId));

    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
    const totalEstHours = tasks.reduce((acc, t) => acc + (parseFloat(t.estimatedHours) || 0), 0);
    const totalActHours = tasks.reduce((acc, t) => acc + (parseFloat(t.actualHours) || 0), 0);

    // Team Workload Summary
    const teamMap = {};
    tasks.forEach(t => {
      const assignee = t.assignee || "Unassigned";
      if (!teamMap[assignee]) teamMap[assignee] = { total: 0, done: 0, est: 0 };
      teamMap[assignee].total += 1;
      if (doneColIds.includes(t.columnId)) teamMap[assignee].done += 1;
      teamMap[assignee].est += parseFloat(t.estimatedHours) || 0;
    });

    const reportDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const reportHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>FlowZen Executive Sprint Report — ${escapeHTML(boardData.title)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #0F172A;
            background: #FFFFFF;
            padding: 2.5rem;
            line-height: 1.5;
          }
          .report-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px solid #6366F1;
            padding-bottom: 1.25rem;
            margin-bottom: 2rem;
          }
          .brand-title {
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 1.8rem;
            font-weight: 800;
            color: #4F46E5;
            letter-spacing: -0.02em;
          }
          .report-title {
            font-size: 1.4rem;
            font-weight: 800;
            margin-top: 0.2rem;
            color: #0F172A;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            margin-bottom: 2rem;
          }
          .kpi-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 8px;
            padding: 1rem;
            text-align: center;
          }
          .kpi-num {
            font-size: 1.8rem;
            font-weight: 800;
            color: #4F46E5;
          }
          .kpi-label {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748B;
            letter-spacing: 0.05em;
          }
          .section-title {
            font-size: 1.1rem;
            font-weight: 800;
            color: #1E293B;
            margin-bottom: 0.85rem;
            border-left: 4px solid #4F46E5;
            padding-left: 0.6rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2rem;
            font-size: 0.85rem;
          }
          th, td {
            padding: 0.65rem 0.85rem;
            text-align: left;
            border-bottom: 1px solid #E2E8F0;
          }
          th {
            background: #F1F5F9;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
            font-size: 0.72rem;
            letter-spacing: 0.05em;
          }
          .badge {
            display: inline-block;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            font-weight: 700;
            font-size: 0.7rem;
            text-transform: uppercase;
          }
          .badge-done { background: #DCFCE7; color: #166534; }
          .badge-wip { background: #FEF9C3; color: #854D0E; }
          .badge-urgent { background: #FEE2E2; color: #991B1B; }
          .footer {
            margin-top: 3rem;
            border-top: 1px solid #E2E8F0;
            padding-top: 1rem;
            font-size: 0.75rem;
            color: #94A3B8;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="background: #EEF2FF; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; border: 1px solid #C7D2FE;">
          <span style="font-weight: 600; font-size: 0.9rem; color: #3730A3;">📄 Printable Executive PDF Report Preview</span>
          <button onclick="window.print()" style="background: #4F46E5; color: #FFF; border: none; padding: 0.6rem 1.4rem; font-weight: 700; border-radius: 6px; cursor: pointer; font-size: 0.88rem;">
            Print / Save as PDF 🖨️
          </button>
        </div>

        <div class="report-header">
          <div>
            <div class="brand-title">⚡ FlowZen Enterprise</div>
            <div class="report-title">${escapeHTML(boardData.title)}</div>
            <div style="font-size: 0.85rem; color: #64748B; margin-top: 2px;">Category: ${escapeHTML(boardData.projectType || "Software Development")} • Target Deadline: ${escapeHTML(boardData.targetDeadline || "Continuous")}</div>
          </div>
          <div style="text-align: right; font-size: 0.82rem; color: #64748B;">
            <div><strong>Report Generated:</strong></div>
            <div>${reportDate}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-num">${totalTasks}</div>
            <div class="kpi-label">Total Tasks</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num">${completionRate}%</div>
            <div class="kpi-label">Completion Rate</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num">${totalEstHours}h</div>
            <div class="kpi-label">Total Estimated</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-num">${completedTasks.length} / ${totalTasks}</div>
            <div class="kpi-label">Tasks Shipped</div>
          </div>
        </div>

        <div class="section-title">Sprint Task Execution Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Task Title</th>
              <th>Stage / Column</th>
              <th>Assignee</th>
              <th>Priority</th>
              <th>Est. Hours</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map(t => `
              <tr>
                <td style="font-weight: 600;">${escapeHTML(t.title)}</td>
                <td><span class="badge ${doneColIds.includes(t.columnId) ? 'badge-done' : 'badge-wip'}">${escapeHTML(colMap[t.columnId] || t.columnId)}</span></td>
                <td>${escapeHTML(t.assignee || 'Unassigned')}</td>
                <td><span class="badge ${t.priority === 'urgent' ? 'badge-urgent' : ''}">${escapeHTML(t.priority || 'medium')}</span></td>
                <td>${t.estimatedHours || 0}h</td>
                <td>${escapeHTML(t.dueDate || 'Continuous')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">Team Workload Distribution</div>
        <table>
          <thead>
            <tr>
              <th>Team Member</th>
              <th>Assigned Tasks</th>
              <th>Completed Tasks</th>
              <th>Workload %</th>
              <th>Total Est. Hours</th>
            </tr>
          </thead>
          <tbody>
            ${Object.keys(teamMap).map(member => {
              const info = teamMap[member];
              const pct = totalTasks > 0 ? Math.round((info.total / totalTasks) * 100) : 0;
              return `
                <tr>
                  <td style="font-weight: 700;">${escapeHTML(member)}</td>
                  <td>${info.total}</td>
                  <td>${info.done}</td>
                  <td>${pct}%</td>
                  <td>${info.est}h</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>FlowZen Executive Kanban & Intelligent Workflow Engine</div>
          <div>Page 1 of 1 • Web Fundamentals 2026 Audit Deliverable</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      showToast("Opened Printable PDF Executive Report Preview", "info");
    } else {
      showToast("Please allow popups to open the PDF printable report", "warning");
    }
  } catch (err) {
    console.error("PDF Report Error:", err);
    showToast("Failed to generate PDF report", "error");
  }
}
