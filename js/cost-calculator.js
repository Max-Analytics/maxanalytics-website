/* Volunteer-hours / cost-savings worksheet embedded on the process page.
   Self-initializing; guards on the worksheet root so it is inert elsewhere. */
(function() {
  'use strict';

  var root = document.getElementById('cost-calculator');
  if (!root) return;

  var modeButtons  = root.querySelectorAll('.mode-toggle__btn');
  var simpleInputs = document.getElementById('simple-inputs');
  var refinedInputs = document.getElementById('refined-inputs');
  var currentMode = 'simple';

  modeButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var mode = btn.dataset.mode;
      if (mode === currentMode) return;
      currentMode = mode;

      modeButtons.forEach(function(b) {
        b.classList.toggle('active', b.dataset.mode === mode);
        b.setAttribute('aria-selected', b.dataset.mode === mode);
      });

      if (mode === 'simple') {
        simpleInputs.classList.remove('hidden');
        refinedInputs.classList.remove('visible');
      } else {
        simpleInputs.classList.add('hidden');
        refinedInputs.classList.add('visible');
        if (ageGroupRows.length === 0) addAgeGroupRow();
      }

      var sessionsSimple = document.getElementById('sessions-simple');
      var sessionsRefined = document.getElementById('sessions-refined');
      if (mode === 'refined') {
        sessionsRefined.value = sessionsSimple.value;
      } else {
        sessionsSimple.value = sessionsRefined.value;
      }

      calculate();
    });
  });

  var FIXED_TASKS = [
    ['Building the evaluation session schedule',  [6, 10],  [0.5, 1.5]],
    ['Post-evaluation director review sessions',  [4, 8],   [0.5, 1.5]],
    ['Goalie evaluation coordination',            [3, 6],   [0.5, 1.5]]
  ];

  var VARIABLE_TASKS = [
    { name: 'Communicating ice times to players/parents', yoursRate: [12, 18], perSession: false, maxFixed: [1, 2] },
    { name: 'Assigning players to each ice time',         yoursRate: [4, 6],   perSession: true,  maxFixed: [1, 2] },
    { name: 'Manual score entry',                         yoursRate: [3, 5],   perSession: true,  maxRate: [0, 0] },
    { name: 'Forming teams within each tier',             yoursRate: [4, 7],   perSession: false, maxRate: [0.5, 1.5] },
    { name: 'Post-placement parent appeals & communications', yoursRate: [4, 8], perSession: false, maxRate: [1, 2] }
  ];

  var resultsTbody = document.getElementById('results-tbody');
  var calloutYours = document.getElementById('callout-yours');
  var calloutSaved = document.getElementById('callout-saved-inline');
  var calloutDays  = document.getElementById('callout-days');

  function getInputs() {
    var players, sessions;
    if (currentMode === 'simple') {
      players  = parseInt(document.getElementById('total-players').value)  || 0;
      sessions = parseInt(document.getElementById('sessions-simple').value) || 0;
    } else {
      players  = ageGroupRows.reduce(function(sum, r) { return sum + r.players; }, 0);
      sessions = parseInt(document.getElementById('sessions-refined').value) || 0;
    }
    return { players: players, sessions: sessions };
  }

  function calcRange(rates, players, sessions, perSession) {
    return rates.map(function(rate) {
      return perSession
        ? (rate * players * sessions) / 60
        : (rate * players) / 60;
    });
  }

  function fmt(lo, hi) {
    var rlo = Math.round(lo);
    var rhi = Math.round(hi);
    return rlo === rhi ? rlo + ' hrs' : rlo + '–' + rhi + ' hrs';
  }

  // Build a results <tr> with DOM nodes (textContent) so no markup string is ever
  // assembled from data — keeps the table XSS-safe even though inputs are numeric.
  function appendRow(cells, opts) {
    opts = opts || {};
    var tr = document.createElement('tr');
    if (opts.rowClass) tr.className = opts.rowClass;
    cells.forEach(function(cell, i) {
      var td = document.createElement('td');
      if (opts.colspan && i === 0) td.colSpan = opts.colspan;
      if (cell.cls) td.className = cell.cls;
      td.textContent = cell.text;
      tr.appendChild(td);
    });
    resultsTbody.appendChild(tr);
  }

  function calculate() {
    var inputs = getInputs();
    var players = inputs.players, sessions = inputs.sessions;
    var hasData = players > 0 && sessions > 0;

    resultsTbody.replaceChildren();
    var totalYoursLo = 0, totalYoursHi = 0;
    var totalMaxLo = 0, totalMaxHi = 0;

    appendRow([{ text: 'Fixed Costs', cls: 'task-type-label' }], { colspan: 4 });
    FIXED_TASKS.forEach(function(task) {
      var name = task[0], ylo = task[1][0], yhi = task[1][1], mlo = task[2][0], mhi = task[2][1];
      totalYoursLo += ylo; totalYoursHi += yhi;
      totalMaxLo += mlo; totalMaxHi += mhi;
      addTaskRow(name, ylo, yhi, mlo, mhi, hasData, true);
    });

    appendRow([{ text: 'Variable Costs', cls: 'task-type-label' }], { colspan: 4 });
    VARIABLE_TASKS.forEach(function(task) {
      var yRange = hasData ? calcRange(task.yoursRate, players, sessions, task.perSession) : [0, 0];
      var mRange = task.maxFixed
        ? task.maxFixed
        : (hasData ? calcRange(task.maxRate, players, sessions, task.perSession) : [0, 0]);
      var ylo = yRange[0], yhi = yRange[1], mlo = mRange[0], mhi = mRange[1];
      totalYoursLo += ylo; totalYoursHi += yhi;
      totalMaxLo += mlo; totalMaxHi += mhi;
      addTaskRow(task.name, ylo, yhi, mlo, mhi, hasData, false);
    });

    var savedLo = totalYoursLo - totalMaxHi;
    var savedHi = totalYoursHi - totalMaxLo;
    appendRow([
      { text: 'Total' },
      { text: hasData ? fmt(totalYoursLo, totalYoursHi) : '—', cls: 'col-yours' },
      { text: hasData ? fmt(totalMaxLo, totalMaxHi)     : '—', cls: 'col-max' },
      { text: hasData ? fmt(savedLo, savedHi)           : '—', cls: 'col-saved' }
    ], { rowClass: 'row-total' });

    if (hasData) {
      calloutYours.textContent = fmt(totalYoursLo, totalYoursHi);
      calloutSaved.textContent = fmt(savedLo, savedHi);
      calloutDays.textContent  = Math.round(savedLo / 8) + '–' + Math.round(savedHi / 8) + ' days';
    } else {
      calloutYours.textContent = '— hrs';
      calloutSaved.textContent = '—';
      calloutDays.textContent  = '— days';
    }
  }

  function addTaskRow(name, ylo, yhi, mlo, mhi, hasData, isFixed) {
    if (!hasData && !isFixed) {
      appendRow([
        { text: name },
        { text: '—', cls: 'col-yours' },
        { text: '—', cls: 'col-max' },
        { text: '—', cls: 'col-saved' }
      ]);
      return;
    }
    var savedLo = ylo - mhi;
    var savedHi = yhi - mlo;
    appendRow([
      { text: name },
      { text: fmt(ylo, yhi), cls: 'col-yours' },
      { text: fmt(mlo, mhi), cls: 'col-max' },
      { text: fmt(savedLo, savedHi), cls: 'col-saved' }
    ]);
  }

  var AGE_GROUPS = ['U9','U10','U11','U12','U13','U14','U15','U16','U17','U18'];
  var ageGroupRows = [];
  var rowIdCounter = 0;

  var ageGroupTbody = document.getElementById('age-group-tbody');
  var btnAddRow = document.getElementById('btn-add-row');

  function getSelectedAgeGroups() {
    return ageGroupRows.map(function(r) { return r.ageGroup; }).filter(Boolean);
  }

  function updateDropdowns() {
    var selected = getSelectedAgeGroups();
    ageGroupRows.forEach(function(row) {
      var selectEl = document.getElementById('ag-select-' + row.id);
      if (!selectEl) return;
      Array.from(selectEl.options).forEach(function(opt) {
        if (opt.value === '') return;
        opt.disabled = selected.includes(opt.value) && opt.value !== row.ageGroup;
      });
    });
    updateRemoveButtons();
  }

  function updateRemoveButtons() {
    var btns = ageGroupTbody.querySelectorAll('.btn-remove-row');
    btns.forEach(function(btn) { btn.disabled = ageGroupRows.length <= 1; });
  }

  function addAgeGroupRow() {
    var id = rowIdCounter++;
    var rowData = { id: id, ageGroup: '', players: 0 };
    ageGroupRows.push(rowData);

    var tr = document.createElement('tr');
    tr.id = 'ag-row-' + id;

    var selected = getSelectedAgeGroups();
    var tdSelect = document.createElement('td');
    var select = document.createElement('select');
    select.id = 'ag-select-' + id;
    select.setAttribute('aria-label', 'Age group');
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select…';
    select.appendChild(placeholder);
    AGE_GROUPS.forEach(function(ag) {
      var opt = document.createElement('option');
      opt.value = ag;
      opt.textContent = ag;
      opt.disabled = selected.includes(ag);
      select.appendChild(opt);
    });
    tdSelect.appendChild(select);

    var tdInput = document.createElement('td');
    var input = document.createElement('input');
    input.type = 'number';
    input.id = 'ag-players-' + id;
    input.min = '1';
    input.placeholder = '0';
    input.setAttribute('aria-label', 'Number of players');
    tdInput.appendChild(input);

    var tdRemove = document.createElement('td');
    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-row';
    removeBtn.dataset.id = id;
    removeBtn.setAttribute('aria-label', 'Remove row');
    removeBtn.innerHTML = '&times;';
    tdRemove.appendChild(removeBtn);

    tr.appendChild(tdSelect);
    tr.appendChild(tdInput);
    tr.appendChild(tdRemove);
    ageGroupTbody.appendChild(tr);

    select.addEventListener('change', function() {
      rowData.ageGroup = this.value;
      updateDropdowns();
      calculate();
    });

    input.addEventListener('input', function() {
      rowData.players = parseInt(this.value) || 0;
      calculate();
    });

    removeBtn.addEventListener('click', function() {
      removeAgeGroupRow(id);
    });

    updateDropdowns();
    calculate();
  }

  function removeAgeGroupRow(id) {
    if (ageGroupRows.length <= 1) return;
    ageGroupRows = ageGroupRows.filter(function(r) { return r.id !== id; });
    var tr = document.getElementById('ag-row-' + id);
    if (tr) tr.remove();
    updateDropdowns();
    calculate();
  }

  btnAddRow.addEventListener('click', addAgeGroupRow);

  var worksheetControls = root.querySelector('.worksheet-controls');
  worksheetControls.addEventListener('input',  function() { calculate(); });
  worksheetControls.addEventListener('change', function() { calculate(); });

  addAgeGroupRow();
  calculate();

  if (window.location.hash === '#cost-calculator') {
    requestAnimationFrame(function() {
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
})();
