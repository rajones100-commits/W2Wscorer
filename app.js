const STORAGE_KEY = 'w2wIndoorScorerV2';
const $ = id => document.getElementById(id);

const defaultState = {
  battingTeam:'Team A', bowlingTeam:'Team B', inningsBalls:60, wideValue:2, wicketPenalty:5,
  runs:0, wickets:0, balls:0, pairBalls:0, physical:0, bonus:0,
  batters:[{name:'Batter 1',runs:0,balls:0},{name:'Batter 2',runs:0,balls:0}], strikerIndex:0,
  bowlers:['Bowler 1','Bowler 2','Bowler 3','Bowler 4','Bowler 5','Bowler 6'],
  bowlerStats:{}, currentBowler:'Bowler 1', history:[], currentOverEvents:[]
};
let state = loadState();

function clone(x){ return JSON.parse(JSON.stringify(x)); }
function loadState(){
  try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)); return saved ? {...clone(defaultState),...saved} : clone(defaultState); }
  catch { return clone(defaultState); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
function ensureBowler(name){ if(!state.bowlerStats[name]) state.bowlerStats[name]={balls:0,runs:0,wickets:0}; }
function oversFromBalls(b){ return `${Math.floor(b/5)}.${b%5}`; }
function snapshot(){ state.history.push(clone({...state,history:[]})); if(state.history.length>50) state.history.shift(); }
function switchStrike(){ state.strikerIndex = state.strikerIndex===0?1:0; }
function resetChoices(){ state.physical=0; state.bonus=0; }

function render(){
  $('battingTeamLabel').textContent=state.battingTeam;
  $('bowlingTeamLabel').textContent=state.bowlingTeam;
  $('score').textContent=state.runs;
  $('wickets').textContent=state.wickets;
  $('ballsBowled').textContent=state.balls;
  $('ballsRemaining').textContent=Math.max(0,state.inningsBalls-state.balls);
  const ballInOver=(state.balls%5)+1, overNo=Math.floor(state.balls/5)+1;
  $('overDisplay').textContent=state.balls>=state.inningsBalls?'INNINGS COMPLETE':`OVER ${overNo} · BALL ${ballInOver} OF 5`;
  $('pairDisplay').textContent=`PAIR: ${state.pairBalls} / 20 BALLS`;

  const s=state.batters[state.strikerIndex], n=state.batters[state.strikerIndex===0?1:0];
  $('strikerName').textContent=s.name; $('strikerRuns').textContent=s.runs; $('strikerBalls').textContent=s.balls;
  $('nonStrikerName').textContent=n.name; $('nonStrikerRuns').textContent=n.runs; $('nonStrikerBalls').textContent=n.balls;

  $('physicalChoice').textContent=state.physical; $('bonusChoice').textContent=state.bonus;
  $('deliveryTotal').textContent=state.physical+state.bonus;
  $('recordSummary').textContent=`${state.physical+state.bonus} RUN${state.physical+state.bonus===1?'':'S'}`;
  document.querySelectorAll('[data-physical]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.physical)===state.physical));
  document.querySelectorAll('[data-bonus]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.bonus)===state.bonus));

  renderBowlerDropdowns();
  ensureBowler(state.currentBowler);
  const bs=state.bowlerStats[state.currentBowler];
  $('bowlerFigures').textContent=`${oversFromBalls(bs.balls)} overs · ${bs.runs} runs · ${bs.wickets} wickets`;
  $('wideValueLabel').textContent=state.wideValue;
  $('lastEvent').textContent=state.lastEvent || '—';
  $('thisOver').textContent=state.currentOverEvents.length?state.currentOverEvents.join('  '):'—';
  saveState();
}

function renderBowlerDropdowns(){
  const names=state.bowlers.filter(Boolean);
  if(!names.includes(state.currentBowler)) state.currentBowler=names[0]||'Bowler 1';
  [$('bowlerSelect'),$('notificationBowlerSelect')].forEach(sel=>{
    const old=sel.value; sel.innerHTML='';
    names.forEach(name=>{ ensureBowler(name); const st=state.bowlerStats[name]; const o=document.createElement('option'); o.value=name; o.textContent=`${name} — ${oversFromBalls(st.balls)} / ${st.runs} / ${st.wickets}`; sel.appendChild(o); });
    sel.value=state.currentBowler || old;
  });
}

function recordLegalBall({runs,physical=0,label}){
  if(state.balls>=state.inningsBalls) return notify('INNINGS COMPLETE','Scoring stopped','The innings ball limit has been reached.',false);
  snapshot(); ensureBowler(state.currentBowler);
  const striker=state.batters[state.strikerIndex];
  striker.runs += runs; striker.balls += 1;
  state.runs += runs; state.balls += 1; state.pairBalls += 1;
  const bs=state.bowlerStats[state.currentBowler]; bs.balls+=1; bs.runs+=runs;
  state.lastEvent=label; state.currentOverEvents.push(label);

  // Physical values represent completed running: 2/6 = odd crossings, 4/8 = even crossings.
  if(physical===2 || physical===6) switchStrike();

  const pairEnded = state.pairBalls>=20;
  const overEnded = state.balls%5===0;
  if(overEnded){ switchStrike(); }
  resetChoices();
  render();

  if(pairEnded){
    notify('PAIR COMPLETE',`${state.batters[0].name} & ${state.batters[1].name}`,'20 legal deliveries completed. Enter the next batting pair before continuing.',false,true);
  } else if(overEnded){
    state.currentOverEvents=[]; render();
    notify('OVER COMPLETE','Change bowler','5 legal deliveries completed. Batters have changed strike.',true,false);
  } else if(state.balls>=state.inningsBalls){
    notify('INNINGS COMPLETE',`${state.runs}/${state.wickets}`,'The innings ball limit has been reached.',false,false);
  }
}

function recordWide(){
  snapshot(); ensureBowler(state.currentBowler);
  state.runs+=state.wideValue; state.bowlerStats[state.currentBowler].runs+=state.wideValue;
  state.lastEvent=`WD+${state.wideValue}`; state.currentOverEvents.push(`WD+${state.wideValue}`); render();
}

function recordWicket(){
  if(state.balls>=state.inningsBalls) return;
  snapshot(); ensureBowler(state.currentBowler);
  const penalty=state.wicketPenalty;
  state.runs-=penalty; state.wickets+=1; state.balls+=1; state.pairBalls+=1;
  const striker=state.batters[state.strikerIndex]; striker.balls+=1;
  const bs=state.bowlerStats[state.currentBowler]; bs.balls+=1; bs.wickets+=1;
  state.lastEvent=`W (-${penalty})`; state.currentOverEvents.push('W');
  const pairEnded=state.pairBalls>=20, overEnded=state.balls%5===0;
  if(overEnded) switchStrike(); render();
  if(pairEnded) notify('PAIR COMPLETE',`${state.batters[0].name} & ${state.batters[1].name}`,'20 legal deliveries completed. Enter the next batting pair before continuing.',false,true);
  else if(overEnded){ state.currentOverEvents=[]; render(); notify('OVER COMPLETE','Change bowler','5 legal deliveries completed. Batters have changed strike.',true,false); }
}

function notify(kicker,title,text,showBowler=false,pairSetup=false){
  $('messageKicker').textContent=kicker; $('messageTitle').textContent=title; $('messageText').textContent=text;
  $('notificationBowlerSelect').style.display=showBowler?'block':'none';
  $('messageContinueBtn').textContent=pairSetup?'ENTER NEXT PAIR':'CONTINUE';
  $('messageContinueBtn').dataset.pairSetup=pairSetup?'1':'0';
  $('messageOverlay').classList.remove('hidden');
}

function openSetup(){
  $('battingTeamInput').value=state.battingTeam; $('bowlingTeamInput').value=state.bowlingTeam;
  $('batter1Input').value=state.batters[0].name; $('batter2Input').value=state.batters[1].name;
  [...$('bowlerInputs').querySelectorAll('input')].forEach((inp,i)=>inp.value=state.bowlers[i]||'');
  $('inningsBallsInput').value=state.inningsBalls; $('wideValueInput').value=state.wideValue; $('wicketPenaltyInput').value=state.wicketPenalty;
  $('setupOverlay').classList.remove('hidden');
}
function saveSetup(resetPair=false){
  state.battingTeam=$('battingTeamInput').value.trim()||'Team A'; state.bowlingTeam=$('bowlingTeamInput').value.trim()||'Team B';
  const b1=$('batter1Input').value.trim()||'Batter 1', b2=$('batter2Input').value.trim()||'Batter 2';
  if(resetPair || b1!==state.batters[0].name || b2!==state.batters[1].name){ state.batters=[{name:b1,runs:0,balls:0},{name:b2,runs:0,balls:0}]; state.strikerIndex=0; state.pairBalls=0; }
  state.bowlers=[...$('bowlerInputs').querySelectorAll('input')].map(x=>x.value.trim()).filter(Boolean);
  if(!state.bowlers.length) state.bowlers=['Bowler 1'];
  state.inningsBalls=Math.max(5,Number($('inningsBallsInput').value)||60); state.wideValue=Math.max(0,Number($('wideValueInput').value)||0); state.wicketPenalty=Math.max(0,Number($('wicketPenaltyInput').value)||0);
  if(!state.bowlers.includes(state.currentBowler)) state.currentBowler=state.bowlers[0];
  $('setupOverlay').classList.add('hidden'); render();
}

$('physicalGrid').addEventListener('click',e=>{ const b=e.target.closest('[data-physical]'); if(!b)return; state.physical=Number(b.dataset.physical); render(); });
$('bonusGrid').addEventListener('click',e=>{ const b=e.target.closest('[data-bonus]'); if(!b)return; state.bonus=Number(b.dataset.bonus); render(); });
$('recordBtn').onclick=()=>recordLegalBall({runs:state.physical+state.bonus,physical:state.physical,label:`${state.physical}+${state.bonus}=${state.physical+state.bonus}`});
$('wideBtn').onclick=recordWide; $('wicketBtn').onclick=recordWicket;
$('bowlerSelect').onchange=e=>{state.currentBowler=e.target.value;render();};
$('undoBtn').onclick=()=>{ if(!state.history.length)return; const prev=state.history.pop(); const history=state.history; state={...prev,history}; render(); };
$('setupBtn').onclick=openSetup; $('closeSetupBtn').onclick=()=>$('setupOverlay').classList.add('hidden'); $('saveSetupBtn').onclick=()=>saveSetup(false);
$('notificationBowlerSelect').onchange=e=>{state.currentBowler=e.target.value;render();};
$('messageContinueBtn').onclick=()=>{
  const pairSetup=$('messageContinueBtn').dataset.pairSetup==='1';
  if($('notificationBowlerSelect').style.display!=='none') state.currentBowler=$('notificationBowlerSelect').value;
  $('messageOverlay').classList.add('hidden');
  if(pairSetup){ openSetup(); $('batter1Input').value=''; $('batter2Input').value=''; $('batter1Input').focus(); }
  render();
};

render();
