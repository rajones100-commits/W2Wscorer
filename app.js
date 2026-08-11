const initialState = {
  runs: 0,
  wickets: 0,
  legalBalls: 0,
  strikerRuns: 0,
  strikerBalls: 0,
  inningsBalls: 60,
  history: []
};

let state = structuredClone(initialState);

const els = {
  score: document.querySelector('#score'),
  ballsRemaining: document.querySelector('#ballsRemaining'),
  ballsBowled: document.querySelector('#ballsBowled'),
  strikerRuns: document.querySelector('#strikerRuns'),
  strikerBalls: document.querySelector('#strikerBalls'),
  lastEvent: document.querySelector('#lastEvent'),
  wideValue: document.querySelector('#wideValue'),
  noBallValue: document.querySelector('#noBallValue'),
  wideLabel: document.querySelector('#wideLabel'),
  noBallLabel: document.querySelector('#noBallLabel'),
  wideBtn: document.querySelector('#wideBtn'),
  noBallBtn: document.querySelector('#noBallBtn'),
  wicketBtn: document.querySelector('#wicketBtn'),
  undoBtn: document.querySelector('#undoBtn'),
  resetBtn: document.querySelector('#resetBtn')
};

function snapshot() {
  state.history.push({
    runs: state.runs,
    wickets: state.wickets,
    legalBalls: state.legalBalls,
    strikerRuns: state.strikerRuns,
    strikerBalls: state.strikerBalls,
    lastEvent: els.lastEvent.textContent
  });
}

function render() {
  const remaining = Math.max(0, state.inningsBalls - state.legalBalls);
  els.score.textContent = `${state.runs}/${state.wickets}`;
  els.ballsRemaining.textContent = `${remaining} BALL${remaining === 1 ? '' : 'S'} REMAINING`;
  els.ballsBowled.textContent = `${state.legalBalls} BALL${state.legalBalls === 1 ? '' : 'S'} BOWLED`;
  els.strikerRuns.textContent = state.strikerRuns;
  els.strikerBalls.textContent = state.strikerBalls;
  localStorage.setItem('w2w-scorer-state', JSON.stringify(state));
}

function addLegalBall(runs) {
  if (state.legalBalls >= state.inningsBalls) return;
  snapshot();
  state.runs += runs;
  state.legalBalls += 1;
  state.strikerRuns += runs;
  state.strikerBalls += 1;
  els.lastEvent.textContent = runs === 0 ? 'Dot ball' : `${runs} run${runs === 1 ? '' : 's'}`;
  render();
}

function addExtra(type, value) {
  snapshot();
  state.runs += value;
  els.lastEvent.textContent = `${type} +${value}`;
  render();
}

function wicket() {
  if (state.legalBalls >= state.inningsBalls) return;
  snapshot();
  state.runs -= 5;
  state.wickets += 1;
  state.legalBalls += 1;
  state.strikerBalls += 1;
  els.lastEvent.textContent = 'Wicket -5';
  render();
}

function undo() {
  const prev = state.history.pop();
  if (!prev) return;
  state.runs = prev.runs;
  state.wickets = prev.wickets;
  state.legalBalls = prev.legalBalls;
  state.strikerRuns = prev.strikerRuns;
  state.strikerBalls = prev.strikerBalls;
  els.lastEvent.textContent = prev.lastEvent || '—';
  render();
}

document.querySelectorAll('[data-run]').forEach(btn => {
  btn.addEventListener('click', () => addLegalBall(Number(btn.dataset.run)));
});
els.wideBtn.addEventListener('click', () => addExtra('Wide', Number(els.wideValue.value)));
els.noBallBtn.addEventListener('click', () => addExtra('No ball', Number(els.noBallValue.value)));
els.wicketBtn.addEventListener('click', wicket);
els.undoBtn.addEventListener('click', undo);
els.resetBtn.addEventListener('click', () => {
  if (!confirm('Reset this innings?')) return;
  state = structuredClone(initialState);
  els.lastEvent.textContent = '—';
  render();
});
els.wideValue.addEventListener('change', () => els.wideLabel.textContent = `+${els.wideValue.value}`);
els.noBallValue.addEventListener('change', () => els.noBallLabel.textContent = `+${els.noBallValue.value}`);

const saved = localStorage.getItem('w2w-scorer-state');
if (saved) {
  try { state = { ...state, ...JSON.parse(saved), history: [] }; } catch {}
}
render();
