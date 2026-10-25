let allQuestions = [];
let activeQuestions = [];
let userAnswers = {};
let currentIdx = 0;
let timerInterval = null;
let secondsRemaining = 0;

// Explanation pagination state
let solCurrentPage = 1;
let solBatchSize = 10;

// DOM Elements
const configScreen = document.getElementById('config-screen');
const testScreen = document.getElementById('test-screen');
const resultScreen = document.getElementById('result-screen');

const testMode = document.getElementById('test-mode');
const yearGroup = document.getElementById('year-group');
const countGroup = document.getElementById('count-group');
const yearSelect = document.getElementById('year-select');
const questionCountInput = document.getElementById('question-count');

const timerDisplay = document.getElementById('timer-display');
const qCounter = document.getElementById('q-counter');
const qYearTag = document.getElementById('q-year-tag');
const qText = document.getElementById('q-text');
const optionsList = document.getElementById('options-list');
const paletteGrid = document.getElementById('palette-grid');

const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const clearBtn = document.getElementById('clear-btn');
const submitBtn = document.getElementById('submit-btn');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

const solBatchSelect = document.getElementById('batch-size');
const solPrevBtn = document.getElementById('sol-prev-btn');
const solNextBtn = document.getElementById('sol-next-btn');
const solPageInfo = document.getElementById('sol-page-info');
const solutionsContainer = document.getElementById('solutions-container');

// 1. Fetch Question Bank
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('data.json');
    allQuestions = await res.json();
    populateYears();
  } catch (err) {
    alert('Failed to load data.json. Ensure data.json exists in the same directory.');
  }
});

function populateYears() {
  const years = [...new Set(allQuestions.map(q => q.year))].sort((a, b) => b - a);
  yearSelect.innerHTML = years.map(y => `<option value="${y}">CSAT ${y}</option>`).join('');
}

// Mode toggle
testMode.addEventListener('change', () => {
  if (testMode.value === 'year') {
    yearGroup.classList.remove('hidden');
    countGroup.classList.add('hidden');
  } else {
    yearGroup.classList.add('hidden');
    countGroup.classList.remove('hidden');
  }
});

// 2. Start Test
startBtn.addEventListener('click', () => {
  userAnswers = {};
  currentIdx = 0;

  if (testMode.value === 'year') {
    const selectedYear = parseInt(yearSelect.value);
    activeQuestions = allQuestions.filter(q => q.year === selectedYear);
  } else {
    const count = Math.min(parseInt(questionCountInput.value) || 20, allQuestions.length);
    const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
    activeQuestions = shuffled.slice(0, count);
  }

  if (activeQuestions.length === 0) {
    alert('No questions available for the chosen selection.');
    return;
  }

  // UPSC CSAT standard: 80 questions = 120 mins (7200 sec), which is 90s per question
  secondsRemaining = activeQuestions.length === 80 ? 120 * 60 : Math.round(activeQuestions.length * 90);

  configScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');
  testScreen.classList.remove('hidden');

  renderPalette();
  loadQuestion(0);
  startTimer();
});

// 3. Question Display & Palette
function loadQuestion(idx) {
  currentIdx = idx;
  const q = activeQuestions[idx];

  qCounter.textContent = `Question ${idx + 1} of${activeQuestions.length}`;
  qYearTag.textContent = `UPSC CSAT ${q.year} — Question ${q.qno}`; qText.textContent = q.question;  optionsList.innerHTML = ''; const currentAnswer = userAnswers[idx];  const optKeys = ['a', 'b', 'c', 'd']; optKeys.forEach(key => { if (q.options && q.options[key]) { const optDiv = document.createElement('div'); optDiv.className = `option-item ${currentAnswer === key.toUpperCase() ? 'selected' : ''}`;
      optDiv.innerHTML = `<span class="option-label">(${key})</span> <span>${q.options[key]}</span>`; optDiv.addEventListener('click', () => { userAnswers[idx] = key.toUpperCase(); loadQuestion(idx); renderPalette(); }); optionsList.appendChild(optDiv); } });  prevBtn.disabled = idx === 0; nextBtn.disabled = idx === activeQuestions.length - 1; renderPalette(); }  function renderPalette() { paletteGrid.innerHTML = ''; activeQuestions.forEach((_, idx) => { const btn = document.createElement('button'); btn.className = 'palette-btn'; btn.textContent = idx + 1; if (userAnswers[idx]) btn.classList.add('answered'); if (idx === currentIdx) btn.classList.add('current');  btn.addEventListener('click', () => loadQuestion(idx)); paletteGrid.appendChild(btn); }); }  // Navigation Listeners prevBtn.addEventListener('click', () => { if (currentIdx > 0) loadQuestion(currentIdx - 1); }); nextBtn.addEventListener('click', () => { if (currentIdx < activeQuestions.length - 1) loadQuestion(currentIdx + 1); }); clearBtn.addEventListener('click', () => { delete userAnswers[currentIdx]; loadQuestion(currentIdx); renderPalette(); });  // 4. Timer Logic function startTimer() { clearInterval(timerInterval); updateTimerDisplay();  timerInterval = setInterval(() => { secondsRemaining--; updateTimerDisplay();  if (secondsRemaining <= 0) { clearInterval(timerInterval); alert('Time is up! Submitting test automatically.'); evaluateTest(); } }, 1000); }  function updateTimerDisplay() { const hrs = String(Math.floor(secondsRemaining / 3600)).padStart(2, '0'); const mins = String(Math.floor((secondsRemaining \% 3600) / 60)).padStart(2, '0'); const secs = String(secondsRemaining \% 60).padStart(2, '0'); timerDisplay.textContent = `${hrs}:${mins}:${secs}`;
}

// 5. Evaluation & Scoring
submitBtn.addEventListener('click', () => {
  const answeredCount = Object.keys(userAnswers).length;
  const confirmMsg = `You have answered ${answeredCount} of${activeQuestions.length} questions. Do you want to submit?`;
  if (confirm(confirmMsg)) {
    clearInterval(timerInterval);
    evaluateTest();
  }
});

function evaluateTest() {
  let correct = 0;
  let wrong = 0;
  const attempted = Object.keys(userAnswers).length;

  activeQuestions.forEach((q, idx) => {
    const selected = userAnswers[idx];
    if (selected) {
      if (selected === q.answer.trim().toUpperCase()) {
        correct++;
      } else {
        wrong++;
      }
    }
  });

  // CSAT Marks Formula
  const netMarks = (correct * 2.50) - (wrong * 0.8333);
  const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : 0;

  document.getElementById('net-score').textContent = netMarks.toFixed(2);
  document.getElementById('attempted-count').textContent = attempted;
  document.getElementById('correct-count').textContent = correct;
  document.getElementById('wrong-count').textContent = wrong;
  document.getElementById('accuracy-rate').textContent = `${accuracy}%`;

  const statusEl = document.getElementById('qualify-status');
  if (netMarks >= 66.67) {
    statusEl.textContent = 'Passed Qualifying Cutoff (≥ 66.67)';
    statusEl.style.color = 'var(--success)';
  } else {
    statusEl.textContent = 'Below Qualifying Cutoff (66.67)';
    statusEl.style.color = 'var(--danger)';
  }

  testScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');

  // Initialize explanation pagination
  solCurrentPage = 1;
  solBatchSize = parseInt(solBatchSelect.value);
  renderBatchSolutions();
}

// 6. Paginated Batch Loading for Solutions
solBatchSelect.addEventListener('change', (e) => {
  solBatchSize = parseInt(e.target.value);
  solCurrentPage = 1;
  renderBatchSolutions();
});

solPrevBtn.addEventListener('click', () => {
  if (solCurrentPage > 1) {
    solCurrentPage--;
    renderBatchSolutions();
  }
});

solNextBtn.addEventListener('click', () => {
  const totalPages = Math.ceil(activeQuestions.length / solBatchSize);
  if (solCurrentPage < totalPages) {
    solCurrentPage++;
    renderBatchSolutions();
  }
});

function renderBatchSolutions() {
  const totalPages = Math.ceil(activeQuestions.length / solBatchSize) || 1;
  solPageInfo.textContent = `Page ${solCurrentPage} of${totalPages}`;

  solPrevBtn.disabled = solCurrentPage === 1;
  solNextBtn.disabled = solCurrentPage === totalPages;

  const startIdx = (solCurrentPage - 1) * solBatchSize;
  const batch = activeQuestions.slice(startIdx, startIdx + solBatchSize);

  solutionsContainer.innerHTML = '';

  batch.forEach((q, offset) => {
    const globalIdx = startIdx + offset;
    const chosen = userAnswers[globalIdx];
    const isCorrect = chosen && chosen === q.answer.trim().toUpperCase();
    
    let statusClass = 'sol-status-unattempted';
    let statusBadge = '<span style="color:#64748b">Not Attempted</span>';

    if (chosen) {
      if (isCorrect) {
        statusClass = 'sol-status-correct';
        statusBadge = '<span style="color:#15803d">✓ Correct (+2.50)</span>';
      } else {
        statusClass = 'sol-status-wrong';
        statusBadge = `<span style="color:#b91c1c">✗ Incorrect (−0.83) — Marked (${chosen})</span>`; } }  const card = document.createElement('div'); card.className = `sol-card ${statusClass}`;
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
        <strong>Q${globalIdx + 1} (${q.year} Q${q.qno})</strong>
        <div>${statusBadge}</div>
      </div>
      <div style="white-space: pre-wrap; margin-bottom: 0.75rem;">${q.question}</div>
      <div style="font-size: 0.95rem; margin-bottom: 0.5rem;">
        <strong>Official Answer:</strong> (${q.answer})
      </div>
      <div class="sol-explanation">
        <strong>Explanation:</strong><br>
        ${q.explanation || 'No detailed explanation provided for this question.'}
      </div>
    `;
    solutionsContainer.appendChild(card);
  });

  window.scrollTo({ top: document.querySelector('.solutions-header').offsetTop - 20, behavior: 'smooth' });
}

restartBtn.addEventListener('click', () => {
  resultScreen.classList.add('hidden');
  configScreen.classList.remove('hidden');
});