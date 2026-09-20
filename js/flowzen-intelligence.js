/* FlowZen Intelligence Engine — Predictive Task Risk, Effort & Interactive Query Assistant */
import { isOverdue, getDaysRemaining, getTaskAgeDays } from './date-utils.js';

const HISTORICAL_STORAGE_KEY = 'flowzen_historical_tasks';

/**
 * Main FlowZen Intelligence Analyzer
 * Returns full intelligence snapshot: Risk predictions, Next Task Recommendation, Bottlenecks, and Category Ratios
 */
export function analyzeFlowZenIntelligence(tasks = [], columns = []) {
  if (!tasks || !Array.isArray(tasks)) {
    return {
      recommendation: null,
      analyzedTasks: [],
      bottlenecks: [],
      coldStart: true,
      categoryStats: {}
    };
  }

  const doneColIds = columns
    .filter(col => col.title.toLowerCase().includes('done') || col.title.toLowerCase().includes('completed'))
    .map(col => col.id);

  const activeTasks = tasks.filter(t => !doneColIds.includes(t.columnId));
  const history = getTaskHistory();
  const isColdStart = history.length < 3;

  const categoryStats = computeCategoryEstimationStats(history);
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  const downstreamCounts = new Map();
  tasks.forEach(t => {
    if (t.dependsOnTaskId) {
      const parentId = t.dependsOnTaskId;
      downstreamCounts.set(parentId, (downstreamCounts.get(parentId) || 0) + 1);
    }
  });

  const analyzedTasks = activeTasks.map(task => {
    const category = task.category || 'Backend';
    const catStats = categoryStats[category] || { ratio: 1.0, count: 0, avgErrorPct: 0 };

    const estimatedHours = parseFloat(task.estimatedHours) || 4;
    const predictedEffort = parseFloat((estimatedHours * catStats.ratio).toFixed(2));
    
    let confidencePct = 25;
    if (catStats.count >= 10) confidencePct = 92;
    else if (catStats.count >= 5) confidencePct = 80;
    else if (catStats.count >= 2) confidencePct = 60;

    const blockedDownstreamCount = downstreamCounts.get(task.id) || 0;

    let isBlocked = false;
    let parentTaskTitle = null;
    if (task.dependsOnTaskId) {
      const parentTask = taskMap.get(task.dependsOnTaskId);
      if (parentTask && !doneColIds.includes(parentTask.columnId)) {
        isBlocked = true;
        parentTaskTitle = parentTask.title;
      }
    }

    const riskAnalysis = calculateTaskRisk(task, catStats, blockedDownstreamCount, isBlocked);
    const recAnalysis = calculateRecommendationScore(task, riskAnalysis.score, blockedDownstreamCount, isBlocked, estimatedHours);

    return {
      task,
      category,
      estimatedHours,
      predictedEffort,
      confidencePct,
      isBlocked,
      parentTaskTitle,
      blockedDownstreamCount,
      riskScore: riskAnalysis.score,
      riskLevel: riskAnalysis.level,
      riskReasons: riskAnalysis.reasons,
      recScore: recAnalysis.score,
      recReasons: recAnalysis.reasons
    };
  });

  const sortedRecs = [...analyzedTasks]
    .filter(t => !t.isBlocked)
    .sort((a, b) => b.recScore - a.recScore);

  const topRecommendation = sortedRecs.length > 0 ? sortedRecs[0] : null;
  const bottlenecks = detectWorkflowBottlenecks(activeTasks, columns);

  return {
    recommendation: topRecommendation,
    analyzedTasks,
    bottlenecks,
    coldStart: isColdStart,
    categoryStats,
    totalHistoryCount: history.length
  };
}

/**
 * Interactive Query Assistant: Answers user questions about board tasks, risks, assignees, and bottlenecks
 */
export function queryBoardIntelligence(queryText, tasks = [], columns = []) {
  const q = (queryText || '').toLowerCase().trim();
  const intel = analyzeFlowZenIntelligence(tasks, columns);
  const doneColIds = columns.filter(c => c.title.toLowerCase().includes('done') || c.title.toLowerCase().includes('completed')).map(c => c.id);
  const activeTasks = tasks.filter(t => !doneColIds.includes(t.columnId));

  if (!q) {
    return "Please enter a question about your board (e.g., 'Which tasks are critical risk?', 'What should I work on next?', 'Show tasks assigned to Priya').";
  }

  // Question 1: Next recommended task / What should I focus on
  if (q.includes('next') || q.includes('focus') || q.includes('work on') || q.includes('recommend')) {
    if (!intel.recommendation) {
      return "FlowZen Intelligence Insight:\nAll current board tasks are either completed or blocked by dependencies.";
    }
    const rec = intel.recommendation;
    return `FlowZen Recommended Focus Task:\n\n` +
      `**${rec.task.title}** (Recommendation Score: ${rec.recScore}/100)\n` +
      `• Category: **${rec.category}** | Assignee: **${rec.task.assignee || 'Unassigned'}**\n` +
      `• Estimated: **${rec.estimatedHours}h** → Predicted Effort: **${rec.predictedEffort}h**\n` +
      `• Risk Score: **${rec.riskScore}/100 (${rec.riskLevel})**\n\n` +
      `**Why this task?**\n${rec.recReasons.map(r => `• ${r}`).join('\n')}\n\n` +
      `**Action**: Start this task now to maximize workflow velocity.`;
  }

  // Question 2: Critical / High Risk tasks
  if (q.includes('risk') || q.includes('critical') || q.includes('delay') || q.includes('overdue')) {
    const highRisk = intel.analyzedTasks
      .filter(t => t.riskScore >= 60 || isOverdue(t.task.dueDate))
      .sort((a, b) => b.riskScore - a.riskScore);

    if (highRisk.length === 0) {
      return "FlowZen Risk Assessment:\nAll active tasks are currently in the Low/Moderate risk range (< 60/100). No critical delays detected.";
    }

    return `High Risk & Delayed Tasks (${highRisk.length}):\n\n` +
      highRisk.map(item => 
        `• **${item.task.title}** — Risk Score: **${item.riskScore}/100 (${item.riskLevel})**\n` +
        `  Assignee: ${item.task.assignee || 'Unassigned'} | Due: ${item.task.dueDate ? formatDate(item.task.dueDate) : 'No due date'}\n` +
        `  Reasons: ${item.riskReasons.join('; ')}`
      ).join('\n\n');
  }

  // Question 3: Assignee lookup (e.g. Priya, Alex, Aman)
  const assignees = ['priya', 'alex', 'aman'];
  const matchedAssignee = assignees.find(a => q.includes(a));
  if (matchedAssignee) {
    const nameMap = { priya: 'Priya Sharma', alex: 'Alex Rivera', aman: 'Aman Verma' };
    const fullName = nameMap[matchedAssignee];
    const userTasks = intel.analyzedTasks.filter(item => (item.task.assignee || '').toLowerCase().includes(matchedAssignee));

    if (userTasks.length === 0) {
      return `Task Assignment Insight:\nNo active tasks are currently assigned to **${fullName}**.`;
    }

    return `Active Tasks Assigned to ${fullName} (${userTasks.length}):\n\n` +
      userTasks.map(item => 
        `• **${item.task.title}** (${item.task.priority.toUpperCase()})\n` +
        `  Risk: ${item.riskScore}/100 (${item.riskLevel}) | Est: ${item.estimatedHours}h → Pred: ${item.predictedEffort}h\n` +
        `  Status: Column ID ${item.task.columnId}`
      ).join('\n\n');
  }

  // Question 4: Bottleneck inquiry
  if (q.includes('bottleneck') || q.includes('column') || q.includes('stage')) {
    if (intel.bottlenecks.length === 0) {
      return "Workflow Bottleneck Assessment:\nNo active column bottlenecks detected. Tasks are evenly distributed across workflow stages.";
    }
    return `Detected Workflow Bottlenecks (${intel.bottlenecks.length}):\n\n` +
      intel.bottlenecks.map(b => `• **${b.columnTitle}**: ${b.reason}`).join('\n');
  }

  // Question 5: Blocked tasks
  if (q.includes('blocked') || q.includes('dependency') || q.includes('lock')) {
    const blockedList = intel.analyzedTasks.filter(t => t.isBlocked);
    if (blockedList.length === 0) {
      return "Dependency Status:\nNo active tasks are currently blocked by dependencies.";
    }
    return `Blocked Tasks (${blockedList.length}):\n\n` +
      blockedList.map(item => 
        `• **${item.task.title}** is BLOCKED by parent task "${item.parentTaskTitle}".`
      ).join('\n');
  }

  // Default General Summary
  return `FlowZen Board Overview:\n\n` +
    `• **Active Tasks**: ${activeTasks.length}\n` +
    `• **Completed Tasks History**: ${intel.totalHistoryCount}\n` +
    `• **Next Recommended Focus Task**: "${intel.recommendation ? intel.recommendation.task.title : 'None'}"\n` +
    `• **Detected Bottlenecks**: ${intel.bottlenecks.length}\n\n` +
    `Try asking: *"Which tasks are critical risk?"*, *"Show tasks assigned to Priya"*, or *"Where are the bottlenecks?"*`;
}

function calculateTaskRisk(task, catStats, blockedDownstreamCount, isBlocked) {
  let score = 0;
  const reasons = [];

  if (task.dueDate) {
    if (isOverdue(task.dueDate)) {
      score += 45;
      reasons.push("Deadline is overdue");
    } else {
      const daysLeft = getDaysRemaining(task.dueDate);
      if (daysLeft !== null) {
        if (daysLeft <= 1) {
          score += 35;
          reasons.push("Deadline is approaching within 24h");
        } else if (daysLeft <= 3) {
          score += 20;
          reasons.push("Due within 3 days");
        }
      }
    }
  }

  const priorityScores = { critical: 35, urgent: 30, high: 20, medium: 10, low: 5 };
  score += priorityScores[task.priority] || 10;
  if (task.priority === 'critical' || task.priority === 'urgent') {
    reasons.push(`${task.priority.toUpperCase()} priority task`);
  }

  const est = parseFloat(task.estimatedHours) || 4;
  if (est >= 8) {
    score += 15;
    reasons.push("Large estimated effort");
  }

  const ageDays = getTaskAgeDays(task.createdAt);
  if (ageDays >= 7) {
    score += 20;
    reasons.push(`Incomplete for ${ageDays} days`);
  } else if (ageDays >= 3) {
    score += 10;
  }

  if (blockedDownstreamCount > 0) {
    score += Math.min(25, blockedDownstreamCount * 10);
    reasons.push(`This task blocks ${blockedDownstreamCount} downstream task${blockedDownstreamCount > 1 ? 's' : ''}`);
  }

  if (catStats.count > 0 && catStats.avgErrorPct > 10) {
    score += 15;
    reasons.push(`Similar ${task.category || 'Backend'} tasks historically take ${catStats.avgErrorPct}% longer than estimated`);
  }

  score = Math.min(100, Math.max(0, score));

  let level = 'Low';
  if (score >= 81) level = 'Critical';
  else if (score >= 61) level = 'High';
  else if (score >= 31) level = 'Moderate';

  if (reasons.length === 0) {
    reasons.push("Standard workflow priority");
  }

  return { score, level, reasons };
}

function calculateRecommendationScore(task, riskScore, blockedDownstreamCount, isBlocked, estimatedHours) {
  if (isBlocked) return { score: 0, reasons: ["Blocked by dependent task"] };

  const reasons = [];
  let score = 0;

  let urgencyPts = 10;
  if (task.dueDate) {
    if (isOverdue(task.dueDate)) urgencyPts = 30;
    else {
      const daysLeft = getDaysRemaining(task.dueDate);
      if (daysLeft !== null && daysLeft <= 1) urgencyPts = 28;
      else if (daysLeft !== null && daysLeft <= 3) urgencyPts = 20;
    }
  }
  score += urgencyPts;
  if (urgencyPts >= 20) reasons.push("Deadline is approaching");

  const riskPts = (riskScore / 100) * 25;
  score += riskPts;

  const pScores = { critical: 20, urgent: 18, high: 14, medium: 10, low: 5 };
  const pPts = pScores[task.priority] || 10;
  score += pPts;
  if (pPts >= 14) reasons.push(`High workflow priority (${task.priority})`);

  const depPts = Math.min(15, blockedDownstreamCount * 5);
  score += depPts;
  if (blockedDownstreamCount > 0) {
    reasons.push(`This task blocks ${blockedDownstreamCount} downstream task${blockedDownstreamCount > 1 ? 's' : ''}`);
  }

  const effortPts = estimatedHours <= 4 ? 10 : 5;
  score += effortPts;

  score = Math.min(100, Math.round(score));
  return { score, reasons };
}

function detectWorkflowBottlenecks(activeTasks, columns) {
  const bottlenecks = [];
  const totalActive = activeTasks.length;
  if (totalActive === 0 || columns.length === 0) return bottlenecks;

  columns.forEach(col => {
    if (col.title.toLowerCase().includes('done') || col.title.toLowerCase().includes('completed')) return;

    const colTasks = activeTasks.filter(t => t.columnId === col.id);
    const count = colTasks.length;

    const ratio = count / totalActive;
    if (count >= 3 && ratio >= 0.4) {
      bottlenecks.push({
        columnId: col.id,
        columnTitle: col.title,
        reason: `${col.title} currently contains ${Math.round(ratio * 100)}% of all active workflow tasks.`
      });
    }

    if (col.wipLimit && count > col.wipLimit) {
      bottlenecks.push({
        columnId: col.id,
        columnTitle: col.title,
        reason: `${col.title} has exceeded its WIP limit (${count}/${col.wipLimit} capacity).`
      });
    }
  });

  return bottlenecks;
}

export function recordCompletedTask(task, actualHoursInput = null) {
  if (!task) return;

  const history = getTaskHistory();
  const est = parseFloat(task.estimatedHours) || 4;
  const actual = actualHoursInput !== null ? parseFloat(actualHoursInput) : est;

  const entry = {
    taskId: task.id,
    title: task.title,
    category: task.category || 'Backend',
    priority: task.priority || 'medium',
    estimatedHours: est,
    actualHours: actual,
    completedAt: new Date().toISOString()
  };

  history.push(entry);
  localStorage.setItem(HISTORICAL_STORAGE_KEY, JSON.stringify(history));
}

export function getTaskHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORICAL_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function computeCategoryEstimationStats(history) {
  const categoryMap = {};

  history.forEach(item => {
    const cat = item.category || 'Backend';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { totalEst: 0, totalAct: 0, count: 0 };
    }
    categoryMap[cat].totalEst += parseFloat(item.estimatedHours) || 4;
    categoryMap[cat].totalAct += parseFloat(item.actualHours) || 4;
    categoryMap[cat].count += 1;
  });

  const stats = {};
  Object.entries(categoryMap).forEach(([cat, data]) => {
    const ratio = data.totalEst > 0 ? data.totalAct / data.totalEst : 1.0;
    const avgErrorPct = Math.round((ratio - 1.0) * 100);
    stats[cat] = {
      ratio: parseFloat(ratio.toFixed(2)),
      count: data.count,
      avgErrorPct
    };
  });

  return stats;
}
