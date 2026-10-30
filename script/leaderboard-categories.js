function restoreCategoryFilters() {
  const params = new URLSearchParams(window.location.search);
  const allowed = {
    category: ['overall', 'query', 'management'], dataset: ['full', 'lite', 'mini_interact'],
    interactionMode: ['all', 'a-interact', 'c-interact'], testMode: ['free', 'stress'],
    performance: ['reward', 'success-rate']
  };
  Object.entries(allowed).forEach(([key, values]) => {
    if (values.includes(params.get(key))) currentFilters[key] = params.get(key);
  });
  currentStage = currentFilters.performance === 'reward' ? 'Reward*'
    : modeConfigs[currentFilters.interactionMode].defaultSuccessStage;
}

function setupCategoryControls() {
  document.querySelectorAll('[data-category]').forEach(button => {
    button.addEventListener('click', () => {
      currentFilters.category = button.dataset.category;
      updateConfiguration();
      updateLeaderboard();
    });
  });
}

function getCategoryLabel() {
  return {overall: 'Overall', query: 'Query', management: 'Management'}[currentFilters.category];
}

function updateCategoryControls() {
  const counts = window.taskCategoryResults.counts[currentFilters.dataset];
  if (!counts) currentFilters.category = 'overall';
  const all = counts ? counts.query + counts.management : 300;
  document.querySelectorAll('[data-category]').forEach(button => {
    const category = button.dataset.category;
    const count = category === 'overall' ? all : counts && counts[category];
    button.disabled = category !== 'overall' && !counts;
    button.setAttribute('aria-pressed', String(category === currentFilters.category));
    button.querySelector('.category-count').textContent = count ? count : '';
  });
  const count = currentFilters.category === 'overall' ? all : counts[currentFilters.category];
  document.getElementById('category-meta').textContent = `${count} tasks · ${getCategoryLabel()}`;
  document.getElementById('category-description').hidden = !counts;
}

function renderInteractionTag(entry) {
  if (currentFilters.interactionMode !== 'all') return '';
  const label = entry.interactionMode === 'c-interact' ? 'c-Interact' : 'a-Interact';
  return `<span class="interaction-tag ${entry.interactionMode}">${label}</span>`;
}

function categoryScore(entry) {
  return entry.scores[stageForMode(entry.interactionMode, currentStage)];
}

function matchingCategoryEntries() {
  const entries = [...window.taskCategoryResults.entries, ...window.taskCategoryResults.paperBaselines];
  return entries.filter(entry => entry.dataset === currentFilters.dataset
    && entry.category === currentFilters.category
    && (entry.testModes ? entry.testModes.includes(currentFilters.testMode) : entry.testMode === currentFilters.testMode)
    && selectedModes().includes(entry.interactionMode)
    && (currentFilters.simulator === 'all' || entry.simulator.toLowerCase() === currentFilters.simulator.toLowerCase())
    && (!showVerifiedOnly || entry.verified === true)
    && Number.isFinite(categoryScore(entry)))
    .sort((a, b) => categoryScore(b) - categoryScore(a));
}

function renderCategoryLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  const entries = matchingCategoryEntries();
  if (!entries.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.className = 'empty-table-message';
    cell.textContent = 'No published results for this selection.';
    row.appendChild(cell);
    tbody.appendChild(row);
  }
  entries.forEach((entry, index) => {
    const tr = document.createElement('tr');
    tr.dataset.model = entry.model;
    if (isNewSubmission(entry)) tr.dataset.newSub = 'true';
    const institute = renderInstitute(entry);
    tr.innerHTML = `
      <td class="rank-cell">${getRankDisplay(index + 1)}</td>
      <td class="model-cell">${renderModelCell(entry)}${renderInteractionTag(entry)}</td>
      <td>${institute}</td><td>${renderSubmissionLink(entry)}</td>
      <td><span class="date-cell">${entry.date}</span></td>
      <td><span class="simulator-cell ${entry.simulator.startsWith('Claude') ? 'simulator-claude' : getSimulatorClass(entry.simulator)}">${entry.simulator}</span></td>
      <td title="Efficiency is not available for this task category.">N/A</td>
      <td><strong>${categoryScore(entry).toFixed(2)}</strong></td>`;
    tbody.appendChild(tr);
  });
}
