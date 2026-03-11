/* SPMS - minimal UI behavior (no backend integration) */

function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function setActiveNav() {
  const path = (location.pathname || '').toLowerCase();
  const links = $all('[data-spms-nav]');
  links.forEach(a => a.classList.remove('active'));
  const match =
    links.find(a => (a.getAttribute('href') || '').toLowerCase() === path) ||
    links.find(a => path.endsWith((a.getAttribute('href') || '').toLowerCase()));
  if (match) match.classList.add('active');
}

function setupSidebarToggle() {
  const sidebar = $('#spmsSidebar');
  const overlay = $('#spmsOverlay');
  const btn = $('#spmsSidebarToggle');
  if (!sidebar || !overlay || !btn) return;

  const close = () => {
    sidebar.classList.remove('show');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };
  const open = () => {
    sidebar.classList.add('show');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  };

  btn.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('show');
    isOpen ? close() : open();
  });
  overlay.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 992) close();
  });
}

function setupAvatarPreview() {
  const input = $('#profilePicture');
  const img = $('#profilePicturePreview');
  if (!input || !img) return;

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    img.src = url;
    img.classList.remove('opacity-50');
    img.onload = () => URL.revokeObjectURL(url);
  });
}

function setupStudentListFilters() {
  const table = $('#studentsTable');
  const search = $('#studentSearch');
  const year = $('#filterYear');
  const section = $('#filterSection');
  const count = $('#studentCount');
  if (!table || !search || !year || !section) return;

  const rows = $all('tbody tr', table);

  const normalize = (s) => (s || '').toString().toLowerCase().trim();

  const apply = () => {
    const q = normalize(search.value);
    const y = normalize(year.value);
    const sec = normalize(section.value);

    let shown = 0;
    rows.forEach(tr => {
      const name = normalize(tr.getAttribute('data-name'));
      const rYear = normalize(tr.getAttribute('data-year'));
      const rSection = normalize(tr.getAttribute('data-section'));
      const email = normalize(tr.getAttribute('data-email'));

      const hitQ = !q || name.includes(q) || email.includes(q);
      const hitY = !y || rYear === y;
      const hitS = !sec || rSection === sec;
      const show = hitQ && hitY && hitS;
      tr.classList.toggle('d-none', !show);
      if (show) shown++;
    });

    if (count) count.textContent = shown.toString();
  };

  ['input', 'change'].forEach(evt => {
    search.addEventListener(evt, apply);
    year.addEventListener(evt, apply);
    section.addEventListener(evt, apply);
  });

  apply();
}

function setupReportGenerator() {
  const form = $('#reportFilters');
  const table = $('#reportsTable');
  const badge = $('#reportCount');
  if (!form || !table) return;

  const rows = $all('tbody tr', table);
  const getVal = (id) => normalize(($('#' + id) || {}).value);
  const normalize = (s) => (s || '').toString().toLowerCase().trim();

  const apply = () => {
    const sport = getVal('reportSport');
    const skill = getVal('reportSkill');
    const gwa = getVal('reportGwa');

    let shown = 0;
    rows.forEach(tr => {
      const rSport = normalize(tr.getAttribute('data-sport'));
      const rSkills = normalize(tr.getAttribute('data-skills'));
      const rGwa = parseFloat(tr.getAttribute('data-gwa') || '0');

      const hitSport = !sport || rSport === sport;
      const hitSkill = !skill || rSkills.split(',').map(s => normalize(s)).includes(skill);
      const hitGwa = !gwa || (Number.isFinite(rGwa) && rGwa <= parseFloat(gwa));
      const show = hitSport && hitSkill && hitGwa;
      tr.classList.toggle('d-none', !show);
      if (show) shown++;
    });

    if (badge) badge.textContent = shown.toString();
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
  $('#reportReset')?.addEventListener('click', () => {
    $all('select, input', form).forEach(el => { el.value = ''; });
    apply();
  });

  $('#exportCsv')?.addEventListener('click', () => exportTableToCSV(table, 'spms-report.csv'));
  $('#exportPrint')?.addEventListener('click', () => window.print());

  apply();
}

function exportTableToCSV(table, filename) {
  const rows = $all('tr', table).filter(tr => !tr.classList.contains('d-none'));
  const csv = rows.map(tr => $all('th,td', tr).map(cell => {
    const txt = (cell.innerText || '').replace(/\s+/g, ' ').trim();
    const escaped = '"' + txt.replace(/"/g, '""') + '"';
    return escaped;
  }).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function setupCharts() {
  const ctx1 = $('#chartStudentsByYear');
  const ctx2 = $('#chartViolations');
  if (!window.Chart) return;

  if (ctx1) {
    const _studentsByYear = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: ['1st', '2nd', '3rd', '4th'],
        datasets: [{
          label: 'Students',
          data: [120, 98, 76, 54],
          backgroundColor: 'rgba(37, 99, 235, .55)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 1,
          borderRadius: 10
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(15,23,42,.06)' } },
          x: { grid: { display: false } }
        }
      }
    });
    void _studentsByYear;
  }

  if (ctx2) {
    const _violations = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['No Violations', 'With Violations'],
        datasets: [{
          data: [285, 42],
          backgroundColor: ['rgba(100,116,139,.22)', 'rgba(37,99,235,.65)'],
          borderColor: ['rgba(100,116,139,.26)', 'rgba(37,99,235,.95)'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        cutout: '70%',
        plugins: { legend: { position: 'bottom' } }
      }
    });
    void _violations;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  setupSidebarToggle();
  setupAvatarPreview();
  setupStudentListFilters();
  setupReportGenerator();
  setupCharts();
});

