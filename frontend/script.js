/**
 * ==============================================================================
 * Smart Study Planner — Frontend Application Logic
 * Vanilla JavaScript (ES6+), Fetch API, Chart.js, Lucide Icons
 * Integrates with Spring Boot 3 backend REST API at http://localhost:8080/api
 * ==============================================================================
 */

// --- Global Configuration & State ---
const CONFIG = {
  get apiBase() {
    return localStorage.getItem('ssp_api_url') || 'http://localhost:8080/api';
  },
  set apiBase(url) {
    localStorage.setItem('ssp_api_url', url.trim());
  },
  get demoMode() {
    return localStorage.getItem('ssp_demo_mode') === 'true';
  },
  set demoMode(enabled) {
    localStorage.setItem('ssp_demo_mode', enabled ? 'true' : 'false');
  },
  get studentName() {
    const val = localStorage.getItem('ssp_student_name');
    if (!val || val === 'Alex Chen') return '';
    return val;
  },
  set studentName(val) {
    if (val && val.trim() && val.trim() !== 'Alex Chen') {
      localStorage.setItem('ssp_student_name', val.trim());
    } else {
      localStorage.removeItem('ssp_student_name');
    }
  },
  get studentRole() {
    const val = localStorage.getItem('ssp_student_role');
    if (!val || val === 'CS Student') return '';
    return val;
  },
  set studentRole(val) {
    if (val && val.trim() && val.trim() !== 'CS Student') {
      localStorage.setItem('ssp_student_role', val.trim());
    } else {
      localStorage.removeItem('ssp_student_role');
    }
  }
};

const STATE = {
  currentView: 'overview',
  backendOnline: false,
  subjects: [],
  tasks: [],
  dashboardSummary: null,
  currentWeekStartDate: getMondayOfWeek(new Date()),
  taskFilters: {
    status: '',
    subjectId: '',
    priority: '',
    date: '',
    search: ''
  },
  deleteTarget: null, // { type: 'subject'|'task', id: number, name: string }
  charts: {
    weeklyActivity: null,
    subjectAnalytics: null
  }
};

// --- In-Memory Demo Data Store (Clean by default, only populated if user creates items in demo mode) ---
const DEMO_STORE = {
  subjects: [],
  tasks: [],
  nextId: 1
};

// ==============================================================================
// 1. HTTP API Engine & Communication Layer
// ==============================================================================

/**
 * Robust fetch wrapper handling JSON responses, HTTP error codes, and connectivity tracking.
 */
async function apiCall(endpoint, options = {}) {
  const url = `${CONFIG.apiBase}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    let data = null;

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    if (response.ok) {
      setBackendStatus(true);
      return { ok: true, status: response.status, data };
    } else {
      // Backend returned an error response (400, 404, 409, 500)
      setBackendStatus(true);
      return {
        ok: false,
        status: response.status,
        error: (data && data.message) ? data.message : `Request failed with status ${response.status}`,
        validationErrors: (data && data.validationErrors) ? data.validationErrors : null,
        data
      };
    }
  } catch (networkError) {
    console.warn(`[Smart Study Planner] Connection failed to ${url}:`, networkError.message);
    setBackendStatus(false);

    // Only fallback to mock data if user explicitly enabled demoMode
    if (CONFIG.demoMode) {
      return handleDemoApi(endpoint, options);
    }

    return {
      ok: false,
      status: 0,
      error: 'Cannot reach backend server. Please verify Spring Boot is running on port 8080.',
      data: null
    };
  }
}

function setBackendStatus(isOnline) {
  STATE.backendOnline = isOnline;
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const banner = document.getElementById('connection-banner');

  if (isOnline) {
    // Real backend is online - exit demo mode
    CONFIG.demoMode = false;
    statusDot.className = 'status-dot online';
    statusText.textContent = 'Backend Online (SQLite)';
    banner.classList.remove('visible');
  } else {
    statusDot.className = 'status-dot offline';
    statusText.textContent = CONFIG.demoMode ? 'Demo Mode (Offline Mock)' : 'Backend Offline';
    if (!CONFIG.demoMode) {
      banner.classList.add('visible');
    } else {
      banner.classList.remove('visible');
    }
  }
}

// --- Demo Mode Mock Fallback Engine ---
function handleDemoApi(endpoint, options) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : null;

  // GET /subjects
  if (endpoint.startsWith('/subjects') && method === 'GET') {
    return { ok: true, status: 200, data: [...DEMO_STORE.subjects] };
  }

  // POST /subjects
  if (endpoint === '/subjects' && method === 'POST') {
    if (DEMO_STORE.subjects.some(s => s.name.toLowerCase() === body.name.trim().toLowerCase())) {
      return { ok: false, status: 409, error: `Subject with name '${body.name}' already exists` };
    }
    const newSubject = {
      id: ++DEMO_STORE.nextId,
      name: body.name.trim(),
      description: body.description || '',
      targetWeeklyHours: Number(body.targetWeeklyHours) || 0,
      createdAt: new Date().toISOString()
    };
    DEMO_STORE.subjects.push(newSubject);
    return { ok: true, status: 201, data: newSubject };
  }

  // DELETE /subjects/{id}
  if (endpoint.startsWith('/subjects/') && method === 'DELETE') {
    const id = Number(endpoint.split('/')[2]);
    const hasTasks = DEMO_STORE.tasks.some(t => t.subjectId === id);
    if (hasTasks) {
      return {
        ok: false,
        status: 400,
        error: `Cannot delete subject with ID ${id} because tasks are still associated with it. Please reassign or delete these tasks first.`
      };
    }
    DEMO_STORE.subjects = DEMO_STORE.subjects.filter(s => s.id !== id);
    return { ok: true, status: 204, data: null };
  }

  // GET /tasks
  if (endpoint.startsWith('/tasks') && method === 'GET') {
    if (endpoint.includes('/today')) {
      const todayIso = formatDateIso(new Date());
      const todayTasks = DEMO_STORE.tasks.filter(t => t.scheduledDate === todayIso);
      return { ok: true, status: 200, data: todayTasks };
    }
    return { ok: true, status: 200, data: [...DEMO_STORE.tasks] };
  }

  // POST /tasks
  if (endpoint === '/tasks' && method === 'POST') {
    const subject = DEMO_STORE.subjects.find(s => s.id === Number(body.subjectId));
    const newTask = {
      id: ++DEMO_STORE.nextId,
      title: body.title.trim(),
      description: body.description || '',
      subjectId: Number(body.subjectId),
      subjectName: subject ? subject.name : 'Subject',
      scheduledDate: body.scheduledDate,
      startTime: body.startTime,
      endTime: calculateEndTime(body.startTime, body.durationMinutes),
      durationMinutes: Number(body.durationMinutes),
      priority: body.priority || 'MEDIUM',
      status: body.status || 'PENDING',
      completedAt: null
    };
    DEMO_STORE.tasks.push(newTask);
    return { ok: true, status: 201, data: newTask };
  }

  // PATCH /tasks/{id}/complete
  if (endpoint.includes('/complete') && method === 'PATCH') {
    const id = Number(endpoint.split('/')[2]);
    const task = DEMO_STORE.tasks.find(t => t.id === id);
    if (task) {
      task.status = 'COMPLETED';
      task.completedAt = new Date().toISOString();
      return { ok: true, status: 200, data: task };
    }
  }

  // PATCH /tasks/{id}/reopen
  if (endpoint.includes('/reopen') && method === 'PATCH') {
    const id = Number(endpoint.split('/')[2]);
    const task = DEMO_STORE.tasks.find(t => t.id === id);
    if (task) {
      task.status = 'PENDING';
      task.completedAt = null;
      return { ok: true, status: 200, data: task };
    }
  }

  // DELETE /tasks/{id}
  if (endpoint.startsWith('/tasks/') && method === 'DELETE') {
    const id = Number(endpoint.split('/')[2]);
    DEMO_STORE.tasks = DEMO_STORE.tasks.filter(t => t.id !== id);
    return { ok: true, status: 204, data: null };
  }

  // POST /schedule/validate
  if (endpoint === '/schedule/validate' && method === 'POST') {
    return { ok: true, status: 200, data: { valid: true, conflicts: [], message: "Time slot available" } };
  }

  // GET /dashboard/summary
  if (endpoint === '/dashboard/summary') {
    const totalTasks = DEMO_STORE.tasks.length;
    const completedTasks = DEMO_STORE.tasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = DEMO_STORE.tasks.filter(t => t.status === 'PENDING').length;
    const totalMins = DEMO_STORE.tasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    const compMins = DEMO_STORE.tasks.filter(t => t.status === 'COMPLETED').reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    const pct = totalTasks === 0 ? 0 : Math.round((completedTasks * 1000) / totalTasks) / 10;

    return {
      ok: true,
      status: 200,
      data: {
        totalSubjects: DEMO_STORE.subjects.length,
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks: 0,
        overdueTasks: 0,
        totalScheduledMinutes: totalMins,
        completedStudyMinutes: compMins,
        overallCompletionPercentage: pct
      }
    };
  }

  // GET /dashboard/subjects
  if (endpoint === '/dashboard/subjects') {
    const result = DEMO_STORE.subjects.map(s => {
      const subTasks = DEMO_STORE.tasks.filter(t => t.subjectId === s.id);
      const total = subTasks.length;
      const comp = subTasks.filter(t => t.status === 'COMPLETED').length;
      return {
        subjectId: s.id,
        subjectName: s.name,
        targetWeeklyHours: s.targetWeeklyHours,
        totalTasks: total,
        completedTasks: comp,
        completionPercentage: total === 0 ? 0 : Math.round((comp * 1000) / total) / 10,
        totalScheduledMinutes: subTasks.reduce((a, t) => a + (t.durationMinutes || 0), 0),
        completedMinutes: subTasks.filter(t => t.status === 'COMPLETED').reduce((a, t) => a + (t.durationMinutes || 0), 0)
      };
    });
    return { ok: true, status: 200, data: result };
  }

  return { ok: true, status: 200, data: {} };
}

// ==============================================================================
// 2. Data Fetching & Sync Layer
// ==============================================================================

async function loadAllData() {
  await Promise.all([
    fetchSubjects(),
    fetchTasks(),
    fetchDashboardSummary()
  ]);

  renderCurrentView();
  updateNotificationsBadge();
}

async function fetchSubjects() {
  const res = await apiCall('/subjects');
  if (res.ok && Array.isArray(res.data)) {
    STATE.subjects = res.data;
    populateSubjectDropdowns();
    document.getElementById('nav-subjects-count').textContent = STATE.subjects.length;
  }
}

async function fetchTasks() {
  let queryParams = [];
  if (STATE.taskFilters.subjectId) queryParams.push(`subjectId=${STATE.taskFilters.subjectId}`);
  if (STATE.taskFilters.date) queryParams.push(`date=${STATE.taskFilters.date}`);
  if (STATE.taskFilters.status && STATE.taskFilters.status !== 'OVERDUE') {
    queryParams.push(`status=${STATE.taskFilters.status}`);
  }
  if (STATE.taskFilters.priority) queryParams.push(`priority=${STATE.taskFilters.priority}`);

  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  const res = await apiCall(`/tasks${queryString}`);

  if (res.ok && Array.isArray(res.data)) {
    STATE.tasks = res.data;
    const pendingCount = STATE.tasks.filter(t => t.status === 'PENDING').length;
    document.getElementById('nav-pending-count').textContent = pendingCount;
  }
}

async function fetchDashboardSummary() {
  const res = await apiCall('/dashboard/summary');
  if (res.ok && res.data) {
    STATE.dashboardSummary = res.data;
    updateOverviewStats(res.data);
  }
}

// ==============================================================================
// 3. UI Rendering & Views
// ==============================================================================

function renderCurrentView() {
  switch (STATE.currentView) {
    case 'overview':
      renderOverviewView();
      break;
    case 'subjects':
      renderSubjectsView();
      break;
    case 'schedule':
      renderScheduleView();
      break;
    case 'tasks':
      renderTasksView();
      break;
    case 'analytics':
      renderAnalyticsView();
      break;
    case 'settings':
      renderSettingsView();
      break;
  }
  lucide.createIcons();
}

// --- Overview View ---
function renderOverviewView() {
  updateGreeting();

  // 1. Today's Tasks
  const todayIso = formatDateIso(new Date());
  const todayTasks = STATE.tasks.filter(t => t.scheduledDate === todayIso);
  const todayContainer = document.getElementById('today-tasks-container');

  if (todayTasks.length === 0) {
    todayContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="sun"></i></div>
        <h4>No Study Sessions Today</h4>
        <p>You have no scheduled tasks for today. Click below to add a new study goal.</p>
        <button class="btn btn-sm btn-primary" onclick="openAddTaskModal('${todayIso}')">
          <i data-lucide="plus"></i> Plan a Session
        </button>
      </div>
    `;
  } else {
    todayContainer.innerHTML = todayTasks.map(t => createTaskItemHtml(t, true)).join('');
  }

  // 2. Upcoming Pending Tasks
  const upcomingContainer = document.getElementById('upcoming-tasks-container');
  const upcomingTasks = STATE.tasks
    .filter(t => t.status !== 'COMPLETED')
    .slice(0, 4);

  if (upcomingTasks.length === 0) {
    upcomingContainer.innerHTML = `
      <div class="empty-state" style="padding: 24px;">
        <p>No upcoming tasks. You are all caught up!</p>
      </div>
    `;
  } else {
    upcomingContainer.innerHTML = upcomingTasks.map(t => createTaskItemHtml(t, false)).join('');
  }

  // 3. Update Progress Ring
  if (STATE.dashboardSummary) {
    const pct = STATE.dashboardSummary.overallCompletionPercentage || 0;
    updateProgressRing(pct);

    const totalHours = ((STATE.dashboardSummary.totalScheduledMinutes || 0) / 60).toFixed(1);
    const completedHours = ((STATE.dashboardSummary.completedStudyMinutes || 0) / 60).toFixed(1);
    document.getElementById('ring-total-time').textContent = `${totalHours} hrs`;
    document.getElementById('ring-completed-time').textContent = `${completedHours} hrs`;
  }

  // 4. Render Weekly Chart
  renderWeeklyActivityChart();
}

function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17) {
    greeting = "Good evening";
  }

  const name = CONFIG.studentName;
  if (name) {
    const firstName = name.trim().split(/\s+/)[0];
    document.getElementById('greeting-text').textContent = `${greeting}, ${firstName}! Ready to achieve your study goals?`;
  } else {
    document.getElementById('greeting-text').textContent = `${greeting}! Ready to achieve your study goals?`;
  }

  const todayIso = formatDateIso(new Date());
  const todayTasks = STATE.tasks.filter(t => t.scheduledDate === todayIso);
  const completedToday = todayTasks.filter(t => t.status === 'COMPLETED').length;

  if (todayTasks.length === 0) {
    document.getElementById('greeting-subtext').textContent = 
      "You have no study sessions scheduled for today. Start by adding your subjects and study goals!";
  } else {
    document.getElementById('greeting-subtext').textContent = 
      `You have ${todayTasks.length} session(s) scheduled for today (${completedToday} completed). Stay focused!`;
  }
}

function updateOverviewStats(summary) {
  document.getElementById('stat-total-subjects').textContent = summary.totalSubjects || 0;
  document.getElementById('stat-total-tasks').textContent = summary.totalTasks || 0;
  document.getElementById('stat-total-minutes').textContent = `${summary.totalScheduledMinutes || 0} scheduled mins`;
  document.getElementById('stat-completed-tasks').textContent = summary.completedTasks || 0;
  document.getElementById('stat-completed-minutes').textContent = `${summary.completedStudyMinutes || 0} completed mins`;
  document.getElementById('stat-pending-tasks').textContent = summary.pendingTasks || 0;
  document.getElementById('stat-overdue-tasks').textContent = `${summary.overdueTasks || 0} overdue`;
  document.getElementById('stat-completion-percent').textContent = `${summary.overallCompletionPercentage || 0}%`;
}

function updateProgressRing(percent) {
  const circle = document.getElementById('overview-progress-circle');
  const valueDisplay = document.getElementById('overview-progress-value');
  const circumference = 2 * Math.PI * 60; // 377px

  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = offset;
  valueDisplay.textContent = `${percent}%`;
}

// --- Subjects View ---
async function renderSubjectsView() {
  const container = document.getElementById('subjects-grid-container');

  if (STATE.subjects.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 48px 24px; text-align: center;">
        <div class="empty-state-icon" style="margin: 0 auto 16px; width: 64px; height: 64px; border-radius: 50%; background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center;">
          <i data-lucide="book-open" style="width: 32px; height: 32px;"></i>
        </div>
        <h4 style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No Subjects Added Yet</h4>
        <p style="color: var(--text-muted); max-width: 440px; margin: 0 auto 20px;">
          Your study planner is clean and ready. Add your courses or subjects to organize study sessions, assignments, and goals.
        </p>
        <button class="btn btn-primary" onclick="openAddSubjectModal()">
          <i data-lucide="plus"></i> Add Your First Subject
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Fetch subject-wise metrics if possible
  const metricsRes = await apiCall('/dashboard/subjects');
  const metricsMap = {};
  if (metricsRes.ok && Array.isArray(metricsRes.data)) {
    metricsRes.data.forEach(m => { metricsMap[m.subjectId] = m; });
  }

  container.innerHTML = STATE.subjects.map(s => {
    const metric = metricsMap[s.id] || {
      totalTasks: 0,
      completedTasks: 0,
      completionPercentage: 0,
      totalScheduledMinutes: 0
    };

    const scheduledHours = (metric.totalScheduledMinutes / 60).toFixed(1);
    const targetHours = (s.targetWeeklyHours || 0).toFixed(1);

    return `
      <div class="subject-card" data-subject-id="${s.id}">
        <div>
          <div class="subject-card-header">
            <div>
              <h3 class="subject-card-title">${escapeHtml(s.name)}</h3>
              <span class="badge badge-subject">${targetHours} hrs/week goal</span>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-icon-only btn-sm" onclick="openEditSubjectModal(${s.id})" title="Edit Subject">
                <i data-lucide="edit-2"></i>
              </button>
              <button class="btn btn-icon-only btn-sm" onclick="confirmDeleteSubject(${s.id}, '${escapeHtml(s.name)}')" title="Delete Subject">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>

          <p class="subject-card-desc">${s.description ? escapeHtml(s.description) : 'No description provided.'}</p>
        </div>

        <div>
          <div class="subject-metrics-row">
            <span>Tasks: <strong>${metric.completedTasks}/${metric.totalTasks}</strong></span>
            <span>Scheduled: <strong>${scheduledHours} hrs</strong></span>
          </div>

          <div class="progress-bar-bg" style="margin-bottom: 6px;">
            <div class="progress-bar-fill" style="width: ${metric.completionPercentage}%;"></div>
          </div>
          <div style="text-align: right; font-size: 11px; color: var(--text-muted);">
            ${metric.completionPercentage}% complete
          </div>

          <div class="subject-card-footer">
            <button class="btn btn-sm btn-secondary" onclick="filterBySubjectAndNavigate(${s.id})">
              <i data-lucide="list"></i> View Tasks
            </button>
            <button class="btn btn-sm btn-primary" onclick="openAddTaskModal(null, ${s.id})">
              <i data-lucide="plus"></i> Add Session
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

// --- Tasks View ---
function renderTasksView() {
  const container = document.getElementById('all-tasks-container');

  let filtered = [...STATE.tasks];

  // 1. Status Filter
  if (STATE.taskFilters.status === 'OVERDUE') {
    const today = formatDateIso(new Date());
    const nowTime = formatTimeNow();
    filtered = filtered.filter(t => t.status !== 'COMPLETED' && (t.scheduledDate < today || (t.scheduledDate === today && t.startTime < nowTime)));
  } else if (STATE.taskFilters.status) {
    filtered = filtered.filter(t => t.status === STATE.taskFilters.status);
  }

  // 2. Subject Filter
  if (STATE.taskFilters.subjectId) {
    filtered = filtered.filter(t => t.subjectId === Number(STATE.taskFilters.subjectId));
  }

  // 3. Priority Filter
  if (STATE.taskFilters.priority) {
    filtered = filtered.filter(t => t.priority === STATE.taskFilters.priority);
  }

  // 4. Date Filter
  if (STATE.taskFilters.date) {
    filtered = filtered.filter(t => t.scheduledDate === STATE.taskFilters.date);
  }

  // 5. Global Search Filter
  if (STATE.taskFilters.search) {
    const q = STATE.taskFilters.search.toLowerCase();
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.subjectName && t.subjectName.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i data-lucide="filter-x"></i></div>
        <h4>No Matching Tasks Found</h4>
        <p>No tasks matched your active filter criteria. Try adjusting or clearing your filters.</p>
        <button class="btn btn-sm btn-secondary" onclick="resetTaskFilters()">
          Clear All Filters
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(t => createTaskItemHtml(t, true, true)).join('');
}

// --- Study Schedule (Timetable) View ---
async function renderScheduleView() {
  const timetableGrid = document.getElementById('timetable-grid');
  const rangeDisplay = document.getElementById('schedule-range-display');

  const startDate = STATE.currentWeekStartDate;
  const startDay = new Date(startDate);
  const endDay = addDays(startDay, 6);

  rangeDisplay.textContent = `${formatDateShort(startDay)} — ${formatDateShort(endDay)}`;

  // Fetch week schedule from backend
  const weekIso = formatDateIso(startDay);
  const res = await apiCall(`/schedule/week?startDate=${weekIso}`);

  let daySchedules = [];
  if (res.ok && res.data && res.data.days) {
    daySchedules = res.data.days;
  } else {
    // Local fallback generation
    for (let i = 0; i < 7; i++) {
      const d = formatDateIso(addDays(startDay, i));
      const dayTasks = STATE.tasks.filter(t => t.scheduledDate === d);
      daySchedules.push({ date: d, tasks: dayTasks });
    }
  }

  // Generate 7 day headers + 1 blank time header
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayIso = formatDateIso(new Date());

  let headerHtml = `<div class="timetable-cell header-cell">Time</div>`;
  for (let i = 0; i < 7; i++) {
    const curDate = addDays(startDay, i);
    const iso = formatDateIso(curDate);
    const isToday = iso === todayIso;
    headerHtml += `
      <div class="timetable-cell header-cell ${isToday ? 'today-header' : ''}">
        <div>${daysOfWeek[i]}</div>
        <div style="font-size: 11px; font-weight: normal; color: var(--text-muted);">${curDate.getDate()} ${formatMonthShort(curDate)}</div>
      </div>
    `;
  }

  // Generate time slots from 08:00 to 21:00
  let rowsHtml = '';
  for (let hour = 8; hour <= 21; hour++) {
    const timeLabel = `${hour.toString().padStart(2, '0')}:00`;
    rowsHtml += `<div class="timetable-cell time-label">${timeLabel}</div>`;

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const curDate = formatDateIso(addDays(startDay, dayIdx));
      const dayData = daySchedules.find(ds => ds.date === curDate);
      const slotTasks = (dayData && dayData.tasks) 
        ? dayData.tasks.filter(t => {
            const taskHour = parseInt(t.startTime.split(':')[0], 10);
            return taskHour === hour;
          })
        : [];

      let cellContent = '';
      if (slotTasks.length > 0) {
        cellContent = slotTasks.map(t => `
          <div class="schedule-task-chip ${t.status === 'COMPLETED' ? 'completed' : ''}" 
               onclick="event.stopPropagation(); openEditTaskModal(${t.id})" 
               title="${escapeHtml(t.title)} (${t.startTime} - ${t.endTime || ''})">
            <div class="chip-title">${escapeHtml(t.title)}</div>
            <div class="chip-time">${t.startTime.substring(0, 5)} (${t.durationMinutes}m)</div>
          </div>
        `).join('');
      }

      rowsHtml += `
        <div class="timetable-cell slot-cell" 
             onclick="openAddTaskModal('${curDate}', null, '${timeLabel}')"
             title="Click to schedule a session on ${curDate} at ${timeLabel}">
          ${cellContent}
        </div>
      `;
    }
  }

  timetableGrid.innerHTML = headerHtml + rowsHtml;
}

// --- Analytics View ---
async function renderAnalyticsView() {
  const metricsRes = await apiCall('/dashboard/subjects');
  const subjectsMetrics = (metricsRes.ok && Array.isArray(metricsRes.data)) ? metricsRes.data : [];

  const goalsContainer = document.getElementById('subject-goals-container');
  if (subjectsMetrics.length === 0) {
    goalsContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center;">No subject data yet.</p>`;
  } else {
    goalsContainer.innerHTML = subjectsMetrics.map(sm => {
      const scheduledHours = (sm.totalScheduledMinutes / 60).toFixed(1);
      const targetHours = (sm.targetWeeklyHours || 0).toFixed(1);
      const goalPct = (sm.targetWeeklyHours && sm.targetWeeklyHours > 0)
        ? Math.min(100, Math.round(((sm.totalScheduledMinutes / 60) / sm.targetWeeklyHours) * 100))
        : 0;

      return `
        <div style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
            <strong>${escapeHtml(sm.subjectName)}</strong>
            <span style="color: var(--text-muted);">${scheduledHours} / ${targetHours} hrs (${goalPct}%)</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${goalPct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderSubjectAnalyticsChart(subjectsMetrics);
}

// --- Settings View ---
function renderSettingsView() {
  document.getElementById('setting-api-url').value = CONFIG.apiBase;
  document.getElementById('setting-demo-toggle').checked = CONFIG.demoMode;
  document.getElementById('setting-student-name').value = CONFIG.studentName;
  document.getElementById('setting-student-role').value = CONFIG.studentRole;
}

// ==============================================================================
// 4. Chart.js Visualizations
// ==============================================================================

async function renderWeeklyActivityChart() {
  const canvas = document.getElementById('weeklyActivityChart');
  if (!canvas) return;

  const mondayIso = formatDateIso(STATE.currentWeekStartDate);
  const weekRes = await apiCall(`/dashboard/weekly?startDate=${mondayIso}`);

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let scheduledData = [0, 0, 0, 0, 0, 0, 0];
  let completedData = [0, 0, 0, 0, 0, 0, 0];

  if (weekRes.ok && weekRes.data && weekRes.data.dailyBreakdown) {
    weekRes.data.dailyBreakdown.forEach((day, index) => {
      if (index < 7) {
        scheduledData[index] = day.totalScheduledMinutes || 0;
        completedData[index] = day.completedMinutes || 0;
      }
    });
  } else {
    // Calculate from state tasks
    for (let i = 0; i < 7; i++) {
      const d = formatDateIso(addDays(new Date(STATE.currentWeekStartDate), i));
      const dayTasks = STATE.tasks.filter(t => t.scheduledDate === d);
      scheduledData[i] = dayTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
      completedData[i] = dayTasks.filter(t => t.status === 'COMPLETED').reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    }
  }

  if (STATE.charts.weeklyActivity) {
    STATE.charts.weeklyActivity.destroy();
  }

  const ctx = canvas.getContext('2d');
  STATE.charts.weeklyActivity = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Completed Minutes',
          data: completedData,
          backgroundColor: '#22C55E',
          borderRadius: 6,
          barPercentage: 0.6
        },
        {
          label: 'Scheduled Minutes',
          data: scheduledData,
          backgroundColor: '#93C5FD',
          borderRadius: 6,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'Inter', size: 12 }, boxWidth: 12, usePointStyle: true }
        },
        tooltip: {
          callbacks: {
            label: context => ` ${context.dataset.label}: ${context.raw} mins (${(context.raw / 60).toFixed(1)} hrs)`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Study Time (Minutes)', font: { family: 'Inter', size: 11 } },
          grid: { color: '#F1F5F9' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function renderSubjectAnalyticsChart(subjectMetrics) {
  const canvas = document.getElementById('subjectAnalyticsChart');
  if (!canvas) return;

  const labels = subjectMetrics.map(s => s.subjectName);
  const completionData = subjectMetrics.map(s => s.completionPercentage);

  if (STATE.charts.subjectAnalytics) {
    STATE.charts.subjectAnalytics.destroy();
  }

  const ctx = canvas.getContext('2d');
  STATE.charts.subjectAnalytics = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['No Subjects'],
      datasets: [{
        label: 'Completion %',
        data: completionData.length > 0 ? completionData : [0],
        backgroundColor: '#3B82F6',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.raw}% Completed`
          }
        }
      },
      scales: {
        x: {
          min: 0,
          max: 100,
          title: { display: true, text: 'Task Completion %' },
          grid: { color: '#F1F5F9' }
        },
        y: {
          grid: { display: false }
        }
      }
    }
  });
}

// ==============================================================================
// 5. Task and Subject HTML Item Builders
// ==============================================================================

function createTaskItemHtml(task, showCompleteBtn = true, showFullDate = false) {
  const isCompleted = task.status === 'COMPLETED';
  const priorityClass = `badge-priority-${(task.priority || 'medium').toLowerCase()}`;
  const statusClass = `badge-status-${(task.status || 'pending').toLowerCase().replace('_', '-')}`;

  return `
    <div class="task-item ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}">
      ${showCompleteBtn ? `
        <button class="task-check-btn" 
                onclick="toggleTaskComplete(${task.id}, ${isCompleted})"
                title="${isCompleted ? 'Click to reopen' : 'Click to complete'}">
          ${isCompleted ? '<i data-lucide="check" style="width:14px;height:14px;"></i>' : ''}
        </button>
      ` : ''}

      <div class="task-details">
        <div class="task-meta-top">
          <span class="task-title" title="${escapeHtml(task.title)}">${escapeHtml(task.title)}</span>
          <span class="badge badge-subject">${escapeHtml(task.subjectName || 'Subject')}</span>
          <span class="badge ${priorityClass}">${task.priority}</span>
          <span class="badge ${statusClass}">${task.status.replace('_', ' ')}</span>
        </div>
        <div class="task-meta-bottom">
          ${showFullDate ? `<span class="task-date"><i data-lucide="calendar"></i> ${task.scheduledDate}</span>` : ''}
          <span class="task-time"><i data-lucide="clock"></i> ${task.startTime ? task.startTime.substring(0, 5) : '00:00'} - ${task.endTime ? task.endTime.substring(0, 5) : ''}</span>
          <span class="task-duration">(${task.durationMinutes} mins)</span>
          ${task.description ? `<span style="color:var(--text-light); text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:200px;">• ${escapeHtml(task.description)}</span>` : ''}
        </div>
      </div>

      <div class="task-actions">
        <button class="btn btn-icon-only btn-sm" onclick="openEditTaskModal(${task.id})" title="Edit Task">
          <i data-lucide="edit-2"></i>
        </button>
        <button class="btn btn-icon-only btn-sm" onclick="confirmDeleteTask(${task.id}, '${escapeHtml(task.title)}')" title="Delete Task">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
  `;
}

// ==============================================================================
// 6. User Actions: Complete, Reopen, Delete, Forms
// ==============================================================================

async function toggleTaskComplete(taskId, currentCompleted) {
  const endpoint = currentCompleted ? `/tasks/${taskId}/reopen` : `/tasks/${taskId}/complete`;
  const res = await apiCall(endpoint, { method: 'PATCH' });

  if (res.ok) {
    showToast(currentCompleted ? 'Task reopened' : 'Task marked complete! Great work!', 'success');
    await loadAllData();
  } else {
    showToast(res.error || 'Failed to update task status', 'danger');
  }
}

// --- Student Profile Setup & Modal ---
function updateProfileDisplay() {
  const name = CONFIG.studentName;
  const role = CONFIG.studentRole;

  const nameDisplay = document.getElementById('user-name-display');
  const roleDisplay = document.getElementById('user-role-display');
  const avatarDisplay = document.getElementById('user-avatar');

  if (name) {
    nameDisplay.textContent = name;
    roleDisplay.textContent = role || 'Student';
    const initials = name.trim().split(/\s+/).map(n => n[0].toUpperCase()).slice(0, 2).join('');
    avatarDisplay.textContent = initials || name[0].toUpperCase();
  } else {
    nameDisplay.textContent = 'Set Your Name';
    roleDisplay.textContent = 'Click to personalize';
    avatarDisplay.textContent = '?';
  }
}

function openProfileModal(isInitial = false) {
  const nameInput = document.getElementById('setup-name-input');
  const roleInput = document.getElementById('setup-role-input');
  const title = document.getElementById('profile-modal-title');
  const subtitle = document.getElementById('profile-modal-subtitle');
  const errorMsg = document.getElementById('setup-name-error');

  nameInput.value = CONFIG.studentName || '';
  roleInput.value = CONFIG.studentRole || '';
  if (errorMsg) errorMsg.classList.remove('visible');

  if (isInitial || !CONFIG.studentName) {
    title.textContent = 'Welcome to Smart Study Planner';
    subtitle.textContent = "Please enter your name to personalize your study dashboard";
  } else {
    title.textContent = 'Edit Student Profile';
    subtitle.textContent = 'Update your name and program of study';
  }

  openModal('profile-modal');
  setTimeout(() => nameInput.focus(), 150);
}

function handleProfileSetupSubmit(e) {
  e.preventDefault();
  const nameInput = document.getElementById('setup-name-input');
  const roleInput = document.getElementById('setup-role-input');
  const errorMsg = document.getElementById('setup-name-error');
  const name = nameInput.value.trim();
  const role = roleInput.value.trim();

  if (!name) {
    if (errorMsg) errorMsg.classList.add('visible');
    nameInput.focus();
    return;
  }
  if (errorMsg) errorMsg.classList.remove('visible');

  CONFIG.studentName = name;
  CONFIG.studentRole = role || 'Student';

  updateProfileDisplay();
  updateGreeting();

  const settingName = document.getElementById('setting-student-name');
  if (settingName) settingName.value = name;
  const settingRole = document.getElementById('setting-student-role');
  if (settingRole) settingRole.value = CONFIG.studentRole;

  closeModal('profile-modal');
  showToast(`Welcome, ${name}! Your study dashboard is personalized.`, 'success');

  if (STATE.subjects.length === 0) {
    setTimeout(() => {
      showToast('Next step: Click "+ Add Subject" to organize your courses!', 'info', 4500);
    }, 1200);
  }
}

// --- Subject CRUD ---
function openAddSubjectModal() {
  document.getElementById('subject-modal-title').textContent = 'Add New Subject';
  document.getElementById('subject-id-input').value = '';
  document.getElementById('subject-name-input').value = '';
  document.getElementById('subject-desc-input').value = '';
  document.getElementById('subject-hours-input').value = '6.0';
  document.getElementById('subject-name-error').classList.remove('visible');

  openModal('subject-modal');
  document.getElementById('subject-name-input').focus();
}

function openEditSubjectModal(subjectId) {
  const subject = STATE.subjects.find(s => s.id === subjectId);
  if (!subject) return;

  document.getElementById('subject-modal-title').textContent = 'Edit Subject';
  document.getElementById('subject-id-input').value = subject.id;
  document.getElementById('subject-name-input').value = subject.name;
  document.getElementById('subject-desc-input').value = subject.description || '';
  document.getElementById('subject-hours-input').value = subject.targetWeeklyHours || '0.0';
  document.getElementById('subject-name-error').classList.remove('visible');

  openModal('subject-modal');
}

async function handleSubjectFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('subject-id-input').value;
  const name = document.getElementById('subject-name-input').value.trim();
  const desc = document.getElementById('subject-desc-input').value.trim();
  const hours = parseFloat(document.getElementById('subject-hours-input').value) || 0;

  if (!name) {
    document.getElementById('subject-name-error').classList.add('visible');
    return;
  }

  const submitBtn = document.getElementById('btn-submit-subject');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  const payload = { name, description: desc, targetWeeklyHours: hours };
  const endpoint = id ? `/subjects/${id}` : '/subjects';
  const method = id ? 'PUT' : 'POST';

  const res = await apiCall(endpoint, { method, body: JSON.stringify(payload) });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save Subject';

  if (res.ok) {
    closeModal('subject-modal');
    showToast(id ? 'Subject updated successfully' : 'Subject created successfully', 'success');
    await loadAllData();
  } else {
    showToast(res.error || 'Failed to save subject', 'danger');
  }
}

function confirmDeleteSubject(id, name) {
  STATE.deleteTarget = { type: 'subject', id, name };
  document.getElementById('confirm-modal-title').textContent = 'Delete Subject';
  document.getElementById('confirm-modal-message').textContent = 
    `Are you sure you want to delete "${name}"? Deletion is only permitted when no tasks are linked to this subject.`;
  openModal('confirm-modal');
}

// --- Task CRUD ---
function openAddTaskModal(defaultDate = null, defaultSubjectId = null, defaultTime = '10:00') {
  document.getElementById('task-modal-title').textContent = 'Create Study Task';
  document.getElementById('task-id-input').value = '';
  document.getElementById('task-title-input').value = '';
  document.getElementById('task-desc-input').value = '';
  document.getElementById('task-date-input').value = defaultDate || formatDateIso(new Date());
  document.getElementById('task-time-input').value = defaultTime || '10:00';
  document.getElementById('task-duration-input').value = '60';
  document.getElementById('task-priority-select').value = 'MEDIUM';
  document.getElementById('task-status-group').style.display = 'none';

  hideConflictAlert();

  if (defaultSubjectId) {
    document.getElementById('task-subject-select').value = defaultSubjectId;
  } else if (STATE.subjects.length > 0) {
    document.getElementById('task-subject-select').value = STATE.subjects[0].id;
  }

  openModal('task-modal');
  document.getElementById('task-title-input').focus();
}

function openEditTaskModal(taskId) {
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('task-modal-title').textContent = 'Edit Study Task';
  document.getElementById('task-id-input').value = task.id;
  document.getElementById('task-title-input').value = task.title;
  document.getElementById('task-desc-input').value = task.description || '';
  document.getElementById('task-subject-select').value = task.subjectId;
  document.getElementById('task-date-input').value = task.scheduledDate;
  document.getElementById('task-time-input').value = task.startTime ? task.startTime.substring(0, 5) : '10:00';
  document.getElementById('task-duration-input').value = task.durationMinutes;
  document.getElementById('task-priority-select').value = task.priority || 'MEDIUM';

  const statusGroup = document.getElementById('task-status-group');
  statusGroup.style.display = 'block';
  document.getElementById('task-status-select').value = task.status || 'PENDING';

  hideConflictAlert();
  openModal('task-modal');
}

async function handleTaskFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('task-id-input').value;
  const title = document.getElementById('task-title-input').value.trim();
  const desc = document.getElementById('task-desc-input').value.trim();
  const subjectId = Number(document.getElementById('task-subject-select').value);
  const scheduledDate = document.getElementById('task-date-input').value;
  let startTime = document.getElementById('task-time-input').value;
  const durationMinutes = parseInt(document.getElementById('task-duration-input').value, 10);
  const priority = document.getElementById('task-priority-select').value;
  const status = id ? document.getElementById('task-status-select').value : 'PENDING';

  if (!title || !subjectId || !scheduledDate || !startTime || durationMinutes <= 0) {
    showToast('Please fill in all required fields with valid values', 'warning');
    return;
  }

  // Ensure startTime has seconds format HH:mm:ss for backend LocalTime parsing
  if (startTime.length === 5) {
    startTime += ':00';
  }

  const submitBtn = document.getElementById('btn-submit-task');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  const payload = {
    title,
    description: desc,
    subjectId,
    scheduledDate,
    startTime,
    durationMinutes,
    priority,
    status
  };

  const endpoint = id ? `/tasks/${id}` : '/tasks';
  const method = id ? 'PUT' : 'POST';

  const res = await apiCall(endpoint, { method, body: JSON.stringify(payload) });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save Task';

  if (res.ok) {
    closeModal('task-modal');
    showToast(id ? 'Task updated successfully' : 'Study task scheduled successfully', 'success');
    await loadAllData();
  } else {
    if (res.status === 409) {
      showConflictAlert(res.error);
      showToast(res.error, 'warning');
    } else {
      showToast(res.error || 'Failed to save task', 'danger');
    }
  }
}

async function checkSlotConflict() {
  const date = document.getElementById('task-date-input').value;
  let time = document.getElementById('task-time-input').value;
  const duration = parseInt(document.getElementById('task-duration-input').value, 10);
  const excludeId = document.getElementById('task-id-input').value || null;

  if (!date || !time || !duration) {
    showToast('Please select date, time and duration first', 'warning');
    return;
  }

  if (time.length === 5) time += ':00';

  const res = await apiCall('/schedule/validate', {
    method: 'POST',
    body: JSON.stringify({
      scheduledDate: date,
      startTime: time,
      durationMinutes: duration,
      excludeTaskId: excludeId ? Number(excludeId) : null
    })
  });

  if (res.ok && res.data) {
    if (res.data.valid) {
      hideConflictAlert();
      showToast('This time slot is completely free! No conflicts.', 'success');
    } else {
      showConflictAlert(res.data.message);
      showToast(res.data.message, 'warning');
    }
  }
}

function showConflictAlert(msg) {
  const alertBox = document.getElementById('task-conflict-alert');
  const msgEl = document.getElementById('task-conflict-msg');
  msgEl.textContent = msg;
  alertBox.classList.add('visible');
}

function hideConflictAlert() {
  const alertBox = document.getElementById('task-conflict-alert');
  alertBox.classList.remove('visible');
}

function confirmDeleteTask(id, title) {
  STATE.deleteTarget = { type: 'task', id, name: title };
  document.getElementById('confirm-modal-title').textContent = 'Delete Study Task';
  document.getElementById('confirm-modal-message').textContent = 
    `Are you sure you want to delete "${title}"?`;
  openModal('confirm-modal');
}

async function executeConfirmDelete() {
  if (!STATE.deleteTarget) return;

  const { type, id, name } = STATE.deleteTarget;
  const endpoint = type === 'subject' ? `/subjects/${id}` : `/tasks/${id}`;

  const res = await apiCall(endpoint, { method: 'DELETE' });

  closeModal('confirm-modal');

  if (res.ok) {
    showToast(`${type === 'subject' ? 'Subject' : 'Task'} "${name}" deleted`, 'info');
    await loadAllData();
  } else {
    showToast(res.error || `Failed to delete ${type}`, 'danger');
  }

  STATE.deleteTarget = null;
}

// ==============================================================================
// 7. Navigation, Filters, and Search Listeners
// ==============================================================================

function setupNavigation() {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const viewName = item.getAttribute('data-view');
      navigateToView(viewName);
    });
  });

  // Mobile menu toggle
  document.getElementById('menu-toggle-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Close sidebar on outside click on mobile
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('menu-toggle-btn');
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    }
  });

  // Notification popover toggle
  const notifBtn = document.getElementById('notification-btn');
  const popover = document.getElementById('notification-popover');
  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    popover.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && !notifBtn.contains(e.target)) {
      popover.classList.remove('active');
    }
  });

  // Keyboard shortcut '/' to focus global search
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      document.getElementById('global-search-input').focus();
    }
    if (e.key === 'Escape') {
      closeAllModals();
      popover.classList.remove('active');
    }
  });

  // Global search input
  const searchInput = document.getElementById('global-search-input');
  searchInput.addEventListener('input', (e) => {
    STATE.taskFilters.search = e.target.value;
    if (STATE.currentView !== 'tasks') {
      navigateToView('tasks');
    } else {
      renderTasksView();
    }
  });
}

function navigateToView(viewName) {
  STATE.currentView = viewName;

  document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-view') === viewName);
  });

  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update header text
  const headings = {
    overview: ['Overview', 'Track your daily study activity and progress'],
    subjects: ['My Subjects', 'Manage course information and study hour goals'],
    schedule: ['Study Schedule', 'Interactive weekly timetable and conflict checker'],
    tasks: ['Tasks & Assignments', 'Filter and organize upcoming study sessions'],
    analytics: ['Progress & Analytics', 'In-depth performance statistics and breakdowns'],
    settings: ['Settings', 'Customize API URL, demo mode, and student profile']
  };

  const [title, sub] = headings[viewName] || ['Smart Study Planner', ''];
  document.getElementById('page-heading').textContent = title;
  document.getElementById('page-subheading').textContent = sub;

  // Close mobile sidebar if open
  document.getElementById('sidebar').classList.remove('open');

  renderCurrentView();
}

function filterBySubjectAndNavigate(subjectId) {
  STATE.taskFilters.subjectId = subjectId;
  document.getElementById('filter-task-subject').value = subjectId;
  navigateToView('tasks');
}

function resetTaskFilters() {
  STATE.taskFilters = { status: '', subjectId: '', priority: '', date: '', search: '' };
  document.getElementById('filter-task-subject').value = '';
  document.getElementById('filter-task-priority').value = '';
  document.getElementById('filter-task-date').value = '';
  document.getElementById('global-search-input').value = '';
  document.querySelectorAll('#task-status-tabs .filter-tab').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-status') === '');
  });
  renderTasksView();
}

// ==============================================================================
// 8. Notifications, Date, and Dropdowns
// ==============================================================================

function updateNotificationsBadge() {
  const today = formatDateIso(new Date());
  const nowTime = formatTimeNow();

  const overdueTasks = STATE.tasks.filter(t => 
    t.status !== 'COMPLETED' && (t.scheduledDate < today || (t.scheduledDate === today && t.startTime < nowTime))
  );

  const badge = document.getElementById('notification-badge');
  const popoverBadge = document.getElementById('popover-badge');
  const notifList = document.getElementById('notification-list');

  if (overdueTasks.length > 0) {
    badge.textContent = overdueTasks.length;
    badge.style.display = 'flex';
    popoverBadge.textContent = `${overdueTasks.length} Overdue`;

    notifList.innerHTML = overdueTasks.map(t => `
      <div class="notification-item">
        <i data-lucide="alert-circle" style="color: var(--danger); width: 18px; height: 18px; flex-shrink: 0;"></i>
        <div>
          <div style="font-weight: 600; font-size: 13px;">${escapeHtml(t.title)}</div>
          <div style="font-size: 11px; color: var(--danger);">Scheduled for ${t.scheduledDate} at ${t.startTime.substring(0, 5)}</div>
        </div>
      </div>
    `).join('');
  } else {
    badge.style.display = 'none';
    popoverBadge.textContent = '0 Attention';
    notifList.innerHTML = `
      <div class="empty-state" style="padding: 24px 16px;">
        <p>All caught up! No overdue tasks.</p>
      </div>
    `;
  }
}

function populateSubjectDropdowns() {
  const optionsHtml = STATE.subjects.map(s => 
    `<option value="${s.id}">${escapeHtml(s.name)}</option>`
  ).join('');

  const taskSubjectSelect = document.getElementById('task-subject-select');
  if (taskSubjectSelect) {
    taskSubjectSelect.innerHTML = `<option value="">Select a subject...</option>` + optionsHtml;
  }

  const filterSubjectSelect = document.getElementById('filter-task-subject');
  if (filterSubjectSelect) {
    filterSubjectSelect.innerHTML = `<option value="">All Subjects</option>` + optionsHtml;
    if (STATE.taskFilters.subjectId) {
      filterSubjectSelect.value = STATE.taskFilters.subjectId;
    }
  }
}

// ==============================================================================
// 9. Modal & Toast Management
// ==============================================================================

function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) {
    el.classList.add('active');
    lucide.createIcons();
  }
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconName = type === 'success' ? 'check-circle' : (type === 'danger' ? 'alert-triangle' : (type === 'warning' ? 'alert-circle' : 'info'));
  toast.innerHTML = `
    <i data-lucide="${iconName}" style="flex-shrink: 0;"></i>
    <span style="flex: 1;">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ==============================================================================
// 10. Utility Functions
// ==============================================================================

function getMondayOfWeek(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateIso(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMonthShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short' });
}

function formatTimeNow() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}:00`;
}

function calculateEndTime(startTimeStr, durationMins) {
  if (!startTimeStr) return '';
  const parts = startTimeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const totalMins = h * 60 + m + Number(durationMins);
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ==============================================================================
// 11. Application Initialization & DOM Event Binding
// ==============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Format today's date in header pill
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  document.getElementById('current-date-text').textContent = dateFormatted;

  // 2. Setup Navigation & Layout Handlers
  setupNavigation();

  // 3. User profile display & profile modal listeners
  updateProfileDisplay();

  document.getElementById('profile-badge-btn').addEventListener('click', () => openProfileModal(false));
  document.getElementById('btn-close-profile-modal').addEventListener('click', () => closeModal('profile-modal'));
  document.getElementById('profile-setup-form').addEventListener('submit', handleProfileSetupSubmit);

  // 4. Modal Event Listeners
  document.getElementById('btn-close-subject-modal').addEventListener('click', () => closeModal('subject-modal'));
  document.getElementById('btn-cancel-subject').addEventListener('click', () => closeModal('subject-modal'));
  document.getElementById('subject-form').addEventListener('submit', handleSubjectFormSubmit);

  document.getElementById('btn-close-task-modal').addEventListener('click', () => closeModal('task-modal'));
  document.getElementById('btn-cancel-task').addEventListener('click', () => closeModal('task-modal'));
  document.getElementById('task-form').addEventListener('submit', handleTaskFormSubmit);
  document.getElementById('btn-check-conflict').addEventListener('click', checkSlotConflict);

  document.getElementById('btn-close-confirm-modal').addEventListener('click', () => closeModal('confirm-modal'));
  document.getElementById('btn-cancel-confirm').addEventListener('click', () => closeModal('confirm-modal'));
  document.getElementById('btn-execute-confirm').addEventListener('click', executeConfirmDelete);

  // 5. Quick action buttons
  document.getElementById('btn-quick-add-task').addEventListener('click', () => openAddTaskModal());
  document.getElementById('btn-quick-add-subject').addEventListener('click', openAddSubjectModal);
  document.getElementById('btn-quick-view-schedule').addEventListener('click', () => navigateToView('schedule'));
  document.getElementById('btn-open-add-subject').addEventListener('click', openAddSubjectModal);
  document.getElementById('btn-open-add-task').addEventListener('click', () => openAddTaskModal());
  document.getElementById('btn-schedule-new-task').addEventListener('click', () => openAddTaskModal());
  document.getElementById('btn-today-new-task').addEventListener('click', () => openAddTaskModal(formatDateIso(new Date())));
  document.getElementById('btn-see-all-tasks').addEventListener('click', (e) => {
    e.preventDefault();
    navigateToView('tasks');
  });

  // 6. Timetable week navigation
  document.getElementById('btn-prev-week').addEventListener('click', () => {
    STATE.currentWeekStartDate = addDays(STATE.currentWeekStartDate, -7);
    renderScheduleView();
  });
  document.getElementById('btn-current-week').addEventListener('click', () => {
    STATE.currentWeekStartDate = getMondayOfWeek(new Date());
    renderScheduleView();
  });
  document.getElementById('btn-next-week').addEventListener('click', () => {
    STATE.currentWeekStartDate = addDays(STATE.currentWeekStartDate, 7);
    renderScheduleView();
  });

  // 7. Task filters
  document.querySelectorAll('#task-status-tabs .filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#task-status-tabs .filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      STATE.taskFilters.status = tab.getAttribute('data-status');
      renderTasksView();
    });
  });

  document.getElementById('filter-task-subject').addEventListener('change', (e) => {
    STATE.taskFilters.subjectId = e.target.value;
    renderTasksView();
  });

  document.getElementById('filter-task-priority').addEventListener('change', (e) => {
    STATE.taskFilters.priority = e.target.value;
    renderTasksView();
  });

  document.getElementById('filter-task-date').addEventListener('change', (e) => {
    STATE.taskFilters.date = e.target.value;
    renderTasksView();
  });

  document.getElementById('btn-clear-task-filters').addEventListener('click', resetTaskFilters);

  // 8. Offline Banner buttons
  document.getElementById('btn-banner-retry').addEventListener('click', () => {
    CONFIG.demoMode = false;
    showToast(`Connecting to real backend at ${CONFIG.apiBase}...`, 'info');
    loadAllData();
  });

  document.getElementById('btn-enable-demo').addEventListener('click', () => {
    CONFIG.demoMode = true;
    showToast('Offline demo mode enabled with mock data. Start Spring Boot on port 8080 to use real SQLite data.', 'warning');
    loadAllData();
  });

  document.getElementById('btn-refresh-data').addEventListener('click', () => {
    CONFIG.demoMode = false;
    showToast('Refreshing data from SQLite database...', 'info');
    loadAllData();
  });

  document.getElementById('backend-status-indicator').addEventListener('click', () => {
    CONFIG.demoMode = false;
    showToast('Testing live backend connection...', 'info');
    loadAllData();
  });

  // 9. Settings Buttons
  document.getElementById('btn-test-connection').addEventListener('click', async () => {
    const testUrl = document.getElementById('setting-api-url').value.trim();
    showToast(`Testing connection to ${testUrl}...`, 'info');
    try {
      const res = await fetch(`${testUrl}/dashboard/summary`);
      if (res.ok) {
        showToast('Connection successful! Backend REST API is online.', 'success');
      } else {
        showToast(`Backend responded with HTTP status ${res.status}`, 'warning');
      }
    } catch (err) {
      showToast('Could not reach backend URL. Is Spring Boot running?', 'danger');
    }
  });

  document.getElementById('btn-save-settings').addEventListener('click', () => {
    CONFIG.apiBase = document.getElementById('setting-api-url').value;
    CONFIG.demoMode = document.getElementById('setting-demo-toggle').checked;
    CONFIG.studentName = document.getElementById('setting-student-name').value;
    CONFIG.studentRole = document.getElementById('setting-student-role').value;

    updateProfileDisplay();
    updateGreeting();

    showToast('Settings saved successfully', 'success');
    loadAllData();
  });

  document.getElementById('btn-reset-settings').addEventListener('click', () => {
    CONFIG.apiBase = 'http://localhost:8080/api';
    CONFIG.demoMode = false;
    CONFIG.studentName = '';
    CONFIG.studentRole = '';
    updateProfileDisplay();
    updateGreeting();
    renderSettingsView();
    showToast('Settings reset. You can set your name anytime.', 'info');
    loadAllData();
  });

  // 10. Initial Data Load & Profile Check
  await loadAllData();

  // If user hasn't set their name yet, automatically prompt them with the welcome modal!
  if (!CONFIG.studentName) {
    setTimeout(() => {
      openProfileModal(true);
    }, 350);
  }
});
