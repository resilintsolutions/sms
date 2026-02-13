<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Result Card & Transcript — Admin</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f1f5f9; color: #1e293b; line-height: 1.5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
        h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: #0f172a; }
        h2 { font-size: 1.15rem; font-weight: 600; margin-bottom: 0.75rem; color: #1e40af; }
        .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 1.25rem; margin-bottom: 1.25rem; }
        .card-header { font-weight: 600; font-size: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
        .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
        .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
        label { display: block; font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; margin-bottom: 0.25rem; }
        input, select, textarea { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; transition: border-color 0.2s; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #3b82f6; color: #fff; }
        .btn-primary:hover { background: #2563eb; }
        .btn-success { background: #10b981; color: #fff; }
        .btn-success:hover { background: #059669; }
        .btn-danger { background: #ef4444; color: #fff; }
        .btn-danger:hover { background: #dc2626; }
        .btn-sm { padding: 0.35rem 0.65rem; font-size: 0.8rem; }
        table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        th { background: #f8fafc; font-weight: 600; text-align: left; padding: 0.6rem 0.75rem; border-bottom: 2px solid #e2e8f0; }
        td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f1f5f9; }
        tr:hover td { background: #f8fafc; }
        .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }
        .badge-pass { background: #dcfce7; color: #166534; }
        .badge-fail { background: #fef2f2; color: #991b1b; }
        .badge-pending { background: #fef9c3; color: #854d0e; }
        .tabs { display: flex; gap: 0.25rem; border-bottom: 2px solid #e2e8f0; margin-bottom: 1.5rem; }
        .tab { padding: 0.75rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
        .tab.active { color: #3b82f6; border-bottom-color: #3b82f6; }
        .tab:hover { color: #1e40af; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .marks-grid input { width: 70px; text-align: center; padding: 0.4rem; }
        .marks-grid input.absent { background: #fef2f2; border-color: #fca5a5; }
        .alert { padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; }
        .alert-success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .flex { display: flex; }
        .flex-wrap { flex-wrap: wrap; }
        .gap-2 { gap: 0.5rem; }
        .gap-4 { gap: 1rem; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .text-sm { font-size: 0.85rem; }
        .text-xs { font-size: 0.75rem; }
        .text-gray { color: #94a3b8; }
        .font-bold { font-weight: 700; }
        .mt-4 { margin-top: 1rem; }
        .mb-4 { margin-bottom: 1rem; }
    </style>
</head>
<body>
<div class="container">
    <div class="flex justify-between items-center mb-4">
        <h1>📋 Result Card & Transcript Configuration</h1>
    </div>

    @if(session('success'))
        <div class="alert alert-success">{{ session('success') }}</div>
    @endif
    @if(session('error'))
        <div class="alert alert-error">{{ session('error') }}</div>
    @endif

    <!-- Tabs -->
    <div class="tabs">
        <div class="tab active" data-tab="components">🔧 Exam Components</div>
        <div class="tab" data-tab="rules">📐 Subject Rules</div>
        <div class="tab" data-tab="marks">✏️ Marks Entry</div>
        <div class="tab" data-tab="configs">⚙️ Result Config</div>
        <div class="tab" data-tab="generate">🚀 Generate Results</div>
        <div class="tab" data-tab="grade-scale">📊 Grade Scale</div>
    </div>

    <!-- TAB 1: Exam Components -->
    <div class="tab-content active" id="tab-components">
        <div class="card">
            <div class="card-header">🔧 Exam Components (Written, CT, Practical, etc.)</div>
            <form id="component-form" class="grid-3 mb-4">
                <div>
                    <label>Name (EN)</label>
                    <input type="text" name="name" placeholder="e.g. Written" required>
                </div>
                <div>
                    <label>Name (BN)</label>
                    <input type="text" name="name_bn" placeholder="e.g. লিখিত">
                </div>
                <div>
                    <label>Short Code</label>
                    <input type="text" name="short_code" placeholder="e.g. WR" maxlength="20">
                </div>
                <div>
                    <label>Sort Order</label>
                    <input type="number" name="sort_order" value="0" min="0">
                </div>
                <div style="align-self: end;">
                    <button type="submit" class="btn btn-primary">➕ Add Component</button>
                </div>
            </form>
            <table>
                <thead><tr><th>#</th><th>Name</th><th>Name (BN)</th><th>Code</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody id="components-list">
                    <tr><td colspan="7" class="text-gray text-sm" style="text-align:center;">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- TAB 2: Subject Rules -->
    <div class="tab-content" id="tab-rules">
        <div class="card">
            <div class="card-header">📐 Exam Subject Component Rules</div>
            <div class="grid-3 mb-4">
                <div>
                    <label>Exam Term</label>
                    <select id="rules-exam-term"><option value="">Select Exam...</option></select>
                </div>
                <div>
                    <label>Class</label>
                    <select id="rules-class"><option value="">Select Class...</option></select>
                </div>
                <div style="align-self: end;">
                    <button class="btn btn-primary" onclick="loadSubjectRules()">📥 Load Rules</button>
                    <button class="btn btn-success" onclick="autoGenerateRules()">⚡ Auto-Generate</button>
                </div>
            </div>
            <div id="subject-rules-container">
                <p class="text-gray text-sm" style="text-align:center;">Select an exam and class to view/edit rules</p>
            </div>
        </div>
    </div>

    <!-- TAB 3: Marks Entry -->
    <div class="tab-content" id="tab-marks">
        <div class="card">
            <div class="card-header">✏️ Component Marks Entry</div>
            <div class="grid-2 mb-4" style="grid-template-columns: repeat(4, 1fr);">
                <div>
                    <label>Exam Term</label>
                    <select id="marks-exam-term"><option value="">Select Exam...</option></select>
                </div>
                <div>
                    <label>Section</label>
                    <select id="marks-section"><option value="">Select Section...</option></select>
                </div>
                <div>
                    <label>Subject</label>
                    <select id="marks-subject"><option value="">Select Subject...</option></select>
                </div>
                <div>
                    <label>Component</label>
                    <select id="marks-component"><option value="">Select Component...</option></select>
                </div>
            </div>
            <button class="btn btn-primary mb-4" onclick="loadMarksGrid()">📥 Load Students</button>
            <div id="marks-grid-container">
                <p class="text-gray text-sm" style="text-align:center;">Select filters and click Load to enter marks</p>
            </div>
        </div>
    </div>

    <!-- TAB 4: Result Config -->
    <div class="tab-content" id="tab-configs">
        <div class="card">
            <div class="card-header">⚙️ Promotion & Fail Rules</div>
            <form id="config-form" class="grid-2 mb-4">
                <div>
                    <label>Config Name</label>
                    <input type="text" name="name" placeholder="e.g. Class 1-5 Rules" required>
                </div>
                <div>
                    <label>Fail Criteria</label>
                    <select name="fail_criteria">
                        <option value="any_subject_below_pass">Fail if any subject below pass marks</option>
                        <option value="gpa_below_threshold">Fail if GPA below threshold</option>
                        <option value="fail_count_exceeds">Fail if fail count exceeds N</option>
                        <option value="custom">Custom rules (JSON)</option>
                    </select>
                </div>
                <div>
                    <label>Pass Marks (%)</label>
                    <input type="number" name="pass_marks_percent" value="33" min="0" max="100" step="0.01">
                </div>
                <div>
                    <label>Min GPA</label>
                    <input type="number" name="min_gpa" step="0.01" min="0" max="5" placeholder="Optional">
                </div>
                <div>
                    <label>Max Fail Subjects</label>
                    <input type="number" name="max_fail_subjects" value="0" min="0">
                </div>
                <div>
                    <label>Use Component Marks</label>
                    <select name="use_component_marks">
                        <option value="0">No (Legacy marks table)</option>
                        <option value="1">Yes (Component marks)</option>
                    </select>
                </div>
                <div style="align-self: end;">
                    <button type="submit" class="btn btn-primary">💾 Save Config</button>
                </div>
            </form>
            <table>
                <thead><tr><th>Name</th><th>Criteria</th><th>Pass %</th><th>Min GPA</th><th>Max Fails</th><th>Components</th><th>Active</th><th>Actions</th></tr></thead>
                <tbody id="configs-list">
                    <tr><td colspan="8" class="text-gray text-sm" style="text-align:center;">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- TAB 5: Generate Results -->
    <div class="tab-content" id="tab-generate">
        <div class="card">
            <div class="card-header">🚀 Generate & Publish Results</div>
            <div class="grid-3 mb-4">
                <div>
                    <label>Exam Term</label>
                    <select id="gen-exam-term"><option value="">Select Exam...</option></select>
                </div>
                <div>
                    <label>Class (Optional)</label>
                    <select id="gen-class"><option value="">All Classes</option></select>
                </div>
                <div style="align-self: end;">
                    <button class="btn btn-success" onclick="generateResults()">⚡ Generate Results</button>
                </div>
            </div>
            <hr style="border-color: #e2e8f0; margin: 1.5rem 0;">
            <h2>📊 Annual/Grand Final Aggregation</h2>
            <div class="grid-3 mb-4">
                <div>
                    <label>Academic Session</label>
                    <select id="gen-session"><option value="">Select Session...</option></select>
                </div>
                <div>
                    <label>Class (Optional)</label>
                    <select id="gen-annual-class"><option value="">All Classes</option></select>
                </div>
                <div style="align-self: end;">
                    <button class="btn btn-primary" onclick="generateAnnualResults()">🏆 Generate Annual</button>
                </div>
            </div>
            <div id="gen-result" class="mt-4"></div>
        </div>
    </div>

    <!-- TAB 6: Grade Scale -->
    <div class="tab-content" id="tab-grade-scale">
        <div class="card">
            <div class="card-header">📊 Grade Scale (Reference)</div>
            <table>
                <thead><tr><th>Grade</th><th>GPA</th><th>Min Marks</th><th>Max Marks</th></tr></thead>
                <tbody id="grade-scale-list">
                    <tr><td colspan="4" class="text-gray text-sm" style="text-align:center;">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    </div>
</div>

<script>
const API_BASE = '/api/v1';
let authToken = ''; // Set via login or pass from session

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
});

async function apiCall(method, url, data = null) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    };
    if (authToken) opts.headers['Authorization'] = 'Bearer ' + authToken;
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(API_BASE + url, opts);
    return res.json();
}

// ─── Components ───
async function loadComponents() {
    const res = await apiCall('GET', '/result-cards/components');
    const tbody = document.getElementById('components-list');
    if (!res.success || !res.data.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No components yet</td></tr>';
        return;
    }
    tbody.innerHTML = res.data.map((c, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${c.name}</strong></td>
            <td>${c.name_bn || '—'}</td>
            <td><code>${c.short_code || '—'}</code></td>
            <td>${c.sort_order}</td>
            <td>${c.is_active ? '<span class="badge badge-pass">Active</span>' : '<span class="badge badge-fail">Inactive</span>'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteComponent(${c.id})">🗑</button></td>
        </tr>
    `).join('');
}

document.getElementById('component-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    const res = await apiCall('POST', '/result-cards/components', data);
    if (res.success) { e.target.reset(); loadComponents(); }
    else alert(JSON.stringify(res));
});

async function deleteComponent(id) {
    if (!confirm('Delete this component?')) return;
    await apiCall('DELETE', '/result-cards/components/' + id);
    loadComponents();
}

// ─── Subject Rules ───
async function loadSubjectRules() {
    const examId = document.getElementById('rules-exam-term').value;
    const classId = document.getElementById('rules-class').value;
    if (!examId || !classId) return alert('Select both exam and class');

    const res = await apiCall('GET', `/result-cards/subject-rules?exam_term_id=${examId}&class_id=${classId}`);
    const container = document.getElementById('subject-rules-container');

    if (!res.success || !res.data.length) {
        container.innerHTML = '<p style="text-align:center;" class="text-gray">No rules configured. Use Auto-Generate or add manually.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Subject</th><th>Component</th><th>Max Marks</th><th>Weight</th><th>Optional</th><th>Actions</th></tr></thead><tbody>';
    res.data.forEach(subj => {
        subj.components.forEach(comp => {
            html += `<tr>
                <td><strong>${subj.subject.name}</strong></td>
                <td>${comp.component.name}</td>
                <td>${comp.max_marks}</td>
                <td>${comp.weight}</td>
                <td>${comp.is_optional ? 'Yes' : 'No'}</td>
                <td><button class="btn btn-danger btn-sm" onclick="deleteSubjectRule(${comp.id})">🗑</button></td>
            </tr>`;
        });
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

async function autoGenerateRules() {
    const examId = document.getElementById('rules-exam-term').value;
    const classId = document.getElementById('rules-class').value;
    if (!examId || !classId) return alert('Select both exam and class');

    const res = await apiCall('POST', '/result-cards/subject-rules/auto-generate', { exam_term_id: examId, class_id: classId });
    alert(res.message || JSON.stringify(res));
    loadSubjectRules();
}

async function deleteSubjectRule(id) {
    if (!confirm('Delete?')) return;
    await apiCall('DELETE', '/result-cards/subject-rules/' + id);
    loadSubjectRules();
}

// ─── Marks Grid ───
async function loadMarksGrid() {
    const examId = document.getElementById('marks-exam-term').value;
    const sectionId = document.getElementById('marks-section').value;
    const subjectId = document.getElementById('marks-subject').value;
    const componentId = document.getElementById('marks-component').value;
    if (!examId || !sectionId || !subjectId || !componentId) return alert('Select all fields');

    const res = await apiCall('GET', `/result-cards/component-marks?exam_term_id=${examId}&section_id=${sectionId}&subject_id=${subjectId}&component_id=${componentId}`);
    const container = document.getElementById('marks-grid-container');

    if (!res.success || !res.data.length) {
        container.innerHTML = '<p style="text-align:center;" class="text-gray">No students found</p>';
        return;
    }

    let html = `<form id="marks-save-form">
        <table class="marks-grid">
            <thead><tr><th>Roll</th><th>Student</th><th>ID</th><th>Marks (max: ${res.rule?.max_marks || 100})</th><th>Absent</th></tr></thead>
            <tbody>`;
    res.data.forEach(s => {
        html += `<tr>
            <td>${s.roll_no || '—'}</td>
            <td><strong>${s.student.name}</strong></td>
            <td class="text-xs text-gray">${s.student.student_id}</td>
            <td><input type="number" name="marks_${s.student_enrollment_id}" value="${s.marks_obtained ?? ''}" min="0" max="${s.max_marks}" step="0.01" data-eid="${s.student_enrollment_id}" data-max="${s.max_marks}"></td>
            <td><input type="checkbox" name="absent_${s.student_enrollment_id}" ${s.absent_code ? 'checked' : ''} data-eid="${s.student_enrollment_id}"></td>
        </tr>`;
    });
    html += `</tbody></table>
        <div class="mt-4">
            <button type="submit" class="btn btn-success">💾 Save Marks</button>
        </div>
    </form>`;
    container.innerHTML = html;

    document.getElementById('marks-save-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const marks = res.data.map(s => ({
            student_enrollment_id: s.student_enrollment_id,
            marks_obtained: parseFloat(document.querySelector(`input[name="marks_${s.student_enrollment_id}"]`).value) || null,
            max_marks: s.max_marks,
            absent_code: document.querySelector(`input[name="absent_${s.student_enrollment_id}"]`).checked ? 'AB' : null,
        }));
        const saveRes = await apiCall('POST', '/result-cards/component-marks', {
            exam_term_id: examId,
            subject_id: subjectId,
            component_id: componentId,
            marks,
        });
        alert(saveRes.message || JSON.stringify(saveRes));
    });
}

// ─── Generate Results ───
async function generateResults() {
    const examId = document.getElementById('gen-exam-term').value;
    if (!examId) return alert('Select an exam term');
    const classId = document.getElementById('gen-class').value || null;

    const container = document.getElementById('gen-result');
    container.innerHTML = '<p>⏳ Generating...</p>';

    const res = await apiCall('POST', '/result-cards/generate', { exam_term_id: examId, class_id: classId });
    container.innerHTML = `<div class="alert ${res.success ? 'alert-success' : 'alert-error'}">${res.message || JSON.stringify(res)} — ${res.count || 0} students processed</div>`;
}

async function generateAnnualResults() {
    const sessionId = document.getElementById('gen-session').value;
    if (!sessionId) return alert('Select a session');
    const classId = document.getElementById('gen-annual-class').value || null;

    const container = document.getElementById('gen-result');
    container.innerHTML = '<p>⏳ Generating annual results...</p>';

    const res = await apiCall('POST', '/result-cards/generate-annual', { academic_session_id: sessionId, class_id: classId });
    container.innerHTML = `<div class="alert ${res.success ? 'alert-success' : 'alert-error'}">${res.message || JSON.stringify(res)} — ${res.count || 0} students processed</div>`;
}

// ─── Config ───
async function loadConfigs() {
    const res = await apiCall('GET', '/result-cards/result-configs');
    const tbody = document.getElementById('configs-list');
    if (!res.success || !res.data.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No configs yet</td></tr>';
        return;
    }
    tbody.innerHTML = res.data.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.fail_criteria.replace(/_/g, ' ')}</td>
            <td>${c.pass_marks_percent}%</td>
            <td>${c.min_gpa ?? '—'}</td>
            <td>${c.max_fail_subjects}</td>
            <td>${c.use_component_marks ? '✅' : '❌'}</td>
            <td>${c.is_active ? '<span class="badge badge-pass">Active</span>' : '<span class="badge badge-fail">Off</span>'}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteConfig(${c.id})">🗑</button></td>
        </tr>
    `).join('');
}

document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.use_component_marks = data.use_component_marks === '1';
    const res = await apiCall('POST', '/result-cards/result-configs', data);
    if (res.success) { e.target.reset(); loadConfigs(); }
    else alert(JSON.stringify(res));
});

async function deleteConfig(id) {
    if (!confirm('Delete this config?')) return;
    await apiCall('DELETE', '/result-cards/result-configs/' + id);
    loadConfigs();
}

// ─── Grade Scale ───
async function loadGradeScale() {
    // Uses existing grade rules endpoint or direct query
    const res = await apiCall('GET', '/result-cards/components'); // placeholder, should use grade-rules endpoint
    // For now show a static example
    const tbody = document.getElementById('grade-scale-list');
    tbody.innerHTML = `
        <tr><td><strong>A+</strong></td><td>5.00</td><td>80</td><td>100</td></tr>
        <tr><td><strong>A</strong></td><td>4.00</td><td>70</td><td>79</td></tr>
        <tr><td><strong>A-</strong></td><td>3.50</td><td>60</td><td>69</td></tr>
        <tr><td><strong>B</strong></td><td>3.00</td><td>50</td><td>59</td></tr>
        <tr><td><strong>C</strong></td><td>2.00</td><td>40</td><td>49</td></tr>
        <tr><td><strong>D</strong></td><td>1.00</td><td>33</td><td>39</td></tr>
        <tr><td><strong>F</strong></td><td>0.00</td><td>0</td><td>32</td></tr>
    `;
}

// ─── Init ───
document.addEventListener('DOMContentLoaded', () => {
    loadComponents();
    loadConfigs();
    loadGradeScale();
});
</script>
</body>
</html>
