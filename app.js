// State variables
let allQuestions = [];
let activeQuestions = [];
let userAnswers = {};
let currentIdx = 0;
let timerInterval = null;
let secondsRemaining = 0;
let reviewIdx = null;

// UI Elements
const statusScreen = document.getElementById('status-screen');
const statusMessage = document.getElementById('status-message');
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

// Review Elements
const reviewPaletteGrid = document.getElementById('review-palette-grid');
const singleExplanationViewer = document.getElementById('single-explanation-viewer');

// 1. Fetch data.json on startup
async function loadData() {
  try {
    const res = await fetch('data.json');
    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      showError('Data not found');
      return;
    }
    allQuestions = data;
    initYearDropdown();
  } catch (err) {
    showError('Data not found');
  }
}

function showError(msg) {
  statusScreen.classList.remove('hidden');
  statusMessage.textContent = msg;
  configScreen.classList.add('hidden');
  testScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');
}

function initYearDropdown() {
  const yearsSet = new Set();
  for (let i = 0; i < allQuestions.length; i++) {
    if (allQuestions[i].year) {
      yearsSet.add(allQuestions[i].year);
    }
  }
  const years = Array.from(yearsSet).sort((a, b) => b - a);

  if (years.length === 0) {
    showError('Data not found');
    return;
  }

  yearSelect.innerHTML = '';
  years.forEach(yr => {
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = 'CSAT ' + yr;
    yearSelect.appendChild(opt);
  });

  statusScreen.classList.add('hidden');
  configScreen.classList.remove('hidden');
}

// 2. Mode Toggle
testMode.addEventListener('change', () => {
  if (testMode.value === 'year') {
    yearGroup.classList.remove('hidden');
    countGroup.classList.add('hidden');
  } else {
    yearGroup.classList.add('hidden');
    countGroup.classList.remove('hidden');
  }
});

// 3. Start Test
startBtn.addEventListener('click', () => {
  userAnswers = {};
  currentIdx = 0;
  reviewIdx = null;

  if (testMode.value === 'year') {
    const chosenYear = parseInt(yearSelect.value, 10);
    activeQuestions = allQuestions.filter(q => q.year === chosenYear);
  } else {
    const reqCount = parseInt(questionCountInput.value, 10) || 20;
    const count = Math.min(Math.max(reqCount, 1), allQuestions.length);
    const shuffled = allQuestions.slice().sort(() => 0.5 - Math.random());
    activeQuestions = shuffled.slice(0, count);
  }

  if (activeQuestions.length === 0) {
    alert('No questions available to attempt.');
    return;
  }

  secondsRemaining = (activeQuestions.length === 80) ? 7200 : Math.round(activeQuestions.length * 90);

  configScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');
  testScreen.classList.remove('hidden');

  renderPalette();
  loadQuestion(0);
  startTimer();
});

// 4. Live Question Display & Live Palette
function loadQuestion(idx) {
  currentIdx = idx;
  const q = activeQuestions[idx];

  qCounter.textContent = 'Question ' + (idx + 1) + ' of ' + activeQuestions.length;
  qYearTag.textContent = 'UPSC CSAT ' + q.year + ' — Q.' + q.qno;
  qText.textContent = q.question;

  optionsList.innerHTML = '';
  const currentAnswer = userAnswers[idx];
  const keys = ['a', 'b', 'c', 'd'];

  keys.forEach(k => {
    if (q.options && q.options[k]) {
      const row = document.createElement('div');
      row.className = 'option-item';
      if (currentAnswer === k.toUpperCase()) {
        row.classList.add('selected');
      }

      const label = document.createElement('span');
      label.className = 'option-label';
      label.textContent = '(' + k + ')';

      const text = document.createElement('span');
      text.textContent = q.options[k];

      row.appendChild(label);
      row.appendChild(text);

      row.addEventListener('click', () => {
        userAnswers[idx] = k.toUpperCase();
        loadQuestion(idx);
        renderPalette();
      });

      optionsList.appendChild(row);
    }
  });

  prevBtn.disabled = (idx === 0);
  nextBtn.disabled = (idx === activeQuestions.length - 1);
  renderPalette();
}

function renderPalette() {
  paletteGrid.innerHTML = '';
  activeQuestions.forEach((_, idx) => {
    const btn = document.createElement('button');
    btn.className = 'palette-btn';
    btn.textContent = idx + 1;
    if (userAnswers[idx]) {
      btn.classList.add('answered');
    }
    if (idx === currentIdx) {
      btn.classList.add('current');
    }
    btn.addEventListener('click', () => {
      loadQuestion(idx);
    });
    paletteGrid.appendChild(btn);
  });
}

prevBtn.addEventListener('click', () => {
  if (currentIdx > 0) loadQuestion(currentIdx - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentIdx < activeQuestions.length - 1) loadQuestion(currentIdx + 1);
});

clearBtn.addEventListener('click', () => {
  delete userAnswers[currentIdx];
  loadQuestion(currentIdx);
  renderPalette();
});

// 5. Timer
function startTimer() {
  clearInterval(timerInterval);
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    secondsRemaining--;
    updateTimerDisplay();

    if (secondsRemaining <= 0) {
      clearInterval(timerInterval);
      alert('Time is up! Submitting your test.');
      evaluateTest();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const h = String(Math.floor(secondsRemaining / 3600)).padStart(2, '0');
  const m = String(Math.floor((secondsRemaining % 3600) / 60)).padStart(2, '0');
  const s = String(secondsRemaining % 60).padStart(2, '0');
  timerDisplay.textContent = h + ':' + m + ':' + s;
}

// 6. Test Evaluation
submitBtn.addEventListener('click', () => {
  const answered = Object.keys(userAnswers).length;
  if (confirm('You have answered ' + answered + ' of ' + activeQuestions.length + ' questions. Submit test?')) {
    clearInterval(timerInterval);
    evaluateTest();
  }
});

function evaluateTest() {
  let correct = 0;
  let wrong = 0;
  const attempted = Object.keys(userAnswers).length;

  activeQuestions.forEach((q, idx) => {
    const userChoice = userAnswers[idx];
    if (userChoice) {
      if (userChoice === q.answer.trim().toUpperCase()) {
        correct++;
      } else {
        wrong++;
      }
    }
  });

  const netMarks = (correct * 2.50) - (wrong * 0.8333);
  const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : '0';

  document.getElementById('net-score').textContent = netMarks.toFixed(2);
  document.getElementById('attempted-count').textContent = attempted;
  document.getElementById('correct-count').textContent = correct;
  document.getElementById('wrong-count').textContent = wrong;
  document.getElementById('accuracy-rate').textContent = accuracy + '%';

  const qualifyEl = document.getElementById('qualify-status');
  if (netMarks >= 66.67) {
    qualifyEl.textContent = 'Passed Qualifying Cutoff (≥ 66.67)';
    qualifyEl.style.color = 'var(--success)';
  } else {
    qualifyEl.textContent = 'Below Qualifying Cutoff (66.67)';
    qualifyEl.style.color = 'var(--danger)';
  }

  testScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');

  renderReviewPalette();
  // Automatically open the first question's explanation initially
  showSingleExplanation(0);
}

// 7. Interactive Review Palette & Explanation Display
function renderReviewPalette() {
  reviewPaletteGrid.innerHTML = '';
  activeQuestions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.className = 'rev-btn';
    btn.textContent = idx + 1;

    const chosen = userAnswers[idx];
    if (chosen) {
      if (chosen === q.answer.trim().toUpperCase()) {
        btn.classList.add('rev-correct');
      } else {
        btn.classList.add('rev-wrong');
      }
    } else {
      btn.classList.add('rev-unattempted');
    }

    if (idx === reviewIdx) {
      btn.classList.add('active');
    }

    btn.addEventListener('click', () => {
      showSingleExplanation(idx);
    });

    reviewPaletteGrid.appendChild(btn);
  });
}

function showSingleExplanation(idx) {
  reviewIdx = idx;
  const q = activeQuestions[idx];
  const chosen = userAnswers[idx];
  const isCorrect = chosen && (chosen === q.answer.trim().toUpperCase());

  // Highlight the currently selected review question button
  const allRevBtns = reviewPaletteGrid.querySelectorAll('.rev-btn');
  allRevBtns.forEach((b, bIdx) => {
    if (bIdx === idx) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  singleExplanationViewer.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'sol-card';

  let badgeClass = 'text-muted';
  let badgeText = 'Not Attempted';

  if (chosen) {
    if (isCorrect) {
      card.classList.add('sol-status-correct');
      badgeClass = 'text-success';
      badgeText = 'Correct (+2.50)';
    } else {
      card.classList.add('sol-status-wrong');
      badgeClass = 'text-danger';
      badgeText = 'Incorrect (−0.83) — Marked (' + chosen + ')';
    }
  } else {
    card.classList.add('sol-status-unattempted');
  }

  const headDiv = document.createElement('div');
  headDiv.className = 'sol-card-header';

  const titleSpan = document.createElement('strong');
  titleSpan.textContent = 'Question ' + (idx + 1) + ' of ' + activeQuestions.length + ' (' + q.year + ' CSAT Q.' + q.qno + ')';

  const statusSpan = document.createElement('span');
  statusSpan.className = badgeClass;
  statusSpan.textContent = badgeText;

  headDiv.appendChild(titleSpan);
  headDiv.appendChild(statusSpan);

  const qBody = document.createElement('pre');
  qBody.className = 'sol-qtext';
  qBody.textContent = q.question;

  // Options recap
  const optList = document.createElement('div');
  optList.className = 'sol-options-recap';
  const optKeys = ['a', 'b', 'c', 'd'];
  optKeys.forEach(k => {
    if (q.options && q.options[k]) {
      const optRow = document.createElement('div');
      optRow.className = 'sol-opt-row';
      if (k.toUpperCase() === q.answer.trim().toUpperCase()) {
        optRow.classList.add('opt-correct-target');
      }
      if (chosen === k.toUpperCase() && !isCorrect) {
        optRow.classList.add('opt-wrong-target');
      }
      optRow.innerHTML = '<strong>(' + k + ')</strong> ' + q.options[k];
      optList.appendChild(optRow);
    }
  });

  const ansDiv = document.createElement('div');
  ansDiv.className = 'sol-ans';
  ansDiv.innerHTML = '<strong>Official Answer:</strong> (' + q.answer + ')';

  const expDiv = document.createElement('div');
  expDiv.className = 'sol-explanation';
  const expTitle = document.createElement('strong');
  expTitle.textContent = 'Explanation:';
  const expText = document.createElement('div');
  expText.textContent = q.explanation || 'No detailed explanation provided.';
  expDiv.appendChild(expTitle);
  expDiv.appendChild(expText);

  card.appendChild(headDiv);
  card.appendChild(qBody);
  card.appendChild(optList);
  card.appendChild(ansDiv);
  card.appendChild(expDiv);

  singleExplanationViewer.appendChild(card);
}

restartBtn.addEventListener('click', () => {
  resultScreen.classList.add('hidden');
  configScreen.classList.remove('hidden');
});

// Run loadData on startup
loadData();
