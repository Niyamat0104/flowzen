/* FlowZen Intelligence Analytics & Historical Predictive Performance Dashboard */
import { getTaskHistory } from './flowzen-intelligence.js';

/**
 * Renders FlowZen Intelligence Productivity & Historical Learning Modal
 */
export function renderAnalyticsDashboard(tasks, columns, containerEl) {
  if (!containerEl) return;

  const totalTasks = tasks.length;
  const history = getTaskHistory();

  // Find Done column
  const doneCols = columns.filter(c => c.isDoneColumn || c.title.toLowerCase().includes('done') || c.title.toLowerCase().includes('completed') || c.title.toLowerCase().includes('finish'));
  const doneColIds = doneCols.length > 0 ? doneCols.map(c => c.id) : (columns.length > 0 ? [columns[columns.length - 1].id] : []);
  const doneTasks = tasks.filter(t => doneColIds.includes(t.columnId));
  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

  // Category Estimation Ratios Math
  const catHistoryMap = {};
  history.forEach(item => {
    const cat = item.category || 'General';
    if (!catHistoryMap[cat]) catHistoryMap[cat] = { totalEst: 0, totalAct: 0, count: 0 };
    catHistoryMap[cat].totalEst += parseFloat(item.estimatedHours) || 4;
    catHistoryMap[cat].totalAct += parseFloat(item.actualHours) || 4;
    catHistoryMap[cat].count += 1;
  });

  const categoryBreakdown = Object.entries(catHistoryMap).map(([cat, data]) => {
    const ratio = data.totalEst > 0 ? data.totalAct / data.totalEst : 1.0;
    const diffPct = Math.round((ratio - 1.0) * 100);
    const sign = diffPct >= 0 ? '+' : '';
    return {
      cat,
      count: data.count,
      ratio: ratio.toFixed(2),
      diffPctText: `${sign}${diffPct}%`,
      isOver: diffPct > 0
    };
  });

  // Priority Stats
  const priorities = { critical: 0, urgent: 0, high: 0, medium: 0, low: 0 };
  tasks.forEach(t => {
    if (priorities[t.priority] !== undefined) priorities[t.priority]++;
  });

  containerEl.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
      <div class="card card-purple" style="border-radius: 0px !important;">
        <h4 style="font-size: 0.85rem; text-transform: uppercase;">Overall Completion</h4>
        <div style="font-size: 2.2rem; font-weight: 800; margin: 0.3rem 0; font-family: var(--font-heading);">${completionRate}%</div>
        <div class="progress-container" style="border-radius: 0px !important;">
          <div class="progress-fill" style="width: ${completionRate}%; border-radius: 0px !important;"></div>
        </div>
      </div>

      <div class="card card-yellow" style="border-radius: 0px !important;">
        <h4 style="font-size: 0.85rem; text-transform: uppercase;">Completed Tasks</h4>
        <div style="font-size: 2.2rem; font-weight: 800; margin: 0.3rem 0; font-family: var(--font-heading);">${doneTasks.length} / ${totalTasks}</div>
        <p style="font-size: 0.8rem; margin: 0; color: var(--text-secondary);">Active workspace tasks</p>
      </div>

      <div class="card card-cyan" style="border-radius: 0px !important;">
        <h4 style="font-size: 0.85rem; text-transform: uppercase;">Learning History</h4>
        <div style="font-size: 2.2rem; font-weight: 800; margin: 0.3rem 0; font-family: var(--font-heading);">${history.length}</div>
        <p style="font-size: 0.8rem; margin: 0; color: var(--text-secondary);">Completed task records analyzed</p>
      </div>
    </div>

    <!-- Historical Predictive Category Estimation Insights -->
    <div class="card card-yellow" style="margin-bottom: 1.5rem; border-radius: 0px !important;">
      <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; font-family: var(--font-heading);">FlowZen Historical Category Estimation Insights</h3>
      <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
        FlowZen intelligence analyzes your historical completed task accuracy to calculate category estimation ratios:
      </p>

      ${categoryBreakdown.length === 0 ? `
        <div style="font-size: 0.85rem; color: var(--text-tertiary); padding: 0.75rem; border: 1px dashed var(--color-border); border-radius: 0px !important; text-align: center;">
          FlowZen is learning your workflow. Complete tasks to unlock detailed estimation ratios per category (Backend, Frontend, Design, Docs).
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
          ${categoryBreakdown.map(item => `
            <div class="card" style="padding: 0.75rem; border: 1px solid var(--color-border); background: var(--bg-card); border-radius: 0px !important;">
              <div style="font-weight: 700; font-size: 0.95rem;">${escapeHTML(item.cat)}</div>
              <div style="font-size: 1.25rem; font-weight: 800; color: ${item.isOver ? 'var(--accent-coral)' : 'var(--accent-emerald)'}; margin: 2px 0;">
                ${item.diffPctText} error
              </div>
              <div style="font-size: 0.75rem; font-weight: 500; color: var(--text-secondary);">
                Estimation Ratio: <strong>${item.ratio}x</strong> (${item.count} tasks)
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Tasks per Column Distribution -->
    <div class="card" style="margin-bottom: 1.5rem; border-radius: 0px !important;">
      <h3 style="font-size: 1.1rem; margin-bottom: 1rem; font-family: var(--font-heading);">Tasks per Workflow Stage</h3>
      <div style="width: 100%; height: 180px; display: flex; align-items: flex-end; justify-content: space-around; gap: 0.5rem; padding-top: 1rem; border-bottom: 1px solid var(--color-border);">
        ${columns.map(col => {
          const count = tasks.filter(t => t.columnId === col.id).length;
          const pct = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
          const heightPx = Math.max(20, Math.round((pct / 100) * 140));
          return `
            <div style="display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end;">
              <span style="font-weight: 700; font-size: 0.85rem; margin-bottom: 4px;">${count}</span>
              <div style="width: 100%; max-width: 48px; height: ${heightPx}px; background-color: var(--primary); border: 1px solid var(--color-border); border-radius: 0px !important; transition: height 0.3s ease;"></div>
              <span style="font-size: 0.75rem; font-weight: 600; margin-top: 6px; text-align: center; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 80px; color: var(--text-secondary);">${col.title}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Priority Canvas Donut Chart -->
    <div class="card" style="border-radius: 0px !important;">
      <h3 style="font-size: 1.1rem; margin-bottom: 1rem; font-family: var(--font-heading);">Priority Breakdown</h3>
      <div style="display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 1rem;">
        <canvas id="priorityChartCanvas" width="160" height="160"></canvas>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge badge-urgent" style="border-radius: 0px !important;">Critical</span> <strong>${priorities.critical}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge badge-urgent" style="border-radius: 0px !important;">Urgent</span> <strong>${priorities.urgent}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge badge-high" style="border-radius: 0px !important;">High</span> <strong>${priorities.high}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge badge-medium" style="border-radius: 0px !important;">Medium</span> <strong>${priorities.medium}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="badge badge-low" style="border-radius: 0px !important;">Low</span> <strong>${priorities.low}</strong>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => drawPriorityDonutCanvas(priorities, totalTasks), 50);
}

function drawPriorityDonutCanvas(priorities, total) {
  const canvas = document.getElementById('priorityChartCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  const colors = {
    critical: '#E11D48',
    urgent: '#F43F5E',
    high: '#F97316',
    medium: '#EAB308',
    low: '#06B6D4'
  };

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const outerRadius = 70;
  const innerRadius = 40;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (total === 0) return;

  let startAngle = -Math.PI / 2;

  Object.entries(priorities).forEach(([key, count]) => {
    if (count === 0) return;
    const sliceAngle = (count / total) * (2 * Math.PI);
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
    ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
    ctx.closePath();

    ctx.fillStyle = colors[key] || '#6366F1';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#262626';
    ctx.stroke();

    startAngle = endAngle;
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

