const STORAGE_KEY='w2wIndoorScorerV3';
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));

function blankPlayers(prefix){return Array.from({length:6},(_,i)=>`${prefix} Player ${i+1}`)}
const defaultState={
  matchStarted:false, innings:1, inningsBalls:60, wideValue:2, noBallValue:2, wicketPenalty:5,
  teams:{A:{name:'Team A',players:blankPlayers('A')},B:{name:'Team B',players:blankPlayers('B')}}, batFirst:'A', battingKey:'A', bowlingKey:'B',
  runs:0,wickets:0,balls:0,pairBalls:0,pairRuns:0,pairPhysical:0,pairBonus:0,
  physical:0,bonus:0,batters:[{name:'A Player 1',runs:0,balls:0},{name:'A Player 2',runs:0,balls:0}],strikerIndex:0,
  bowlerStats:{},currentBowler:'B Player 1',history:[],currentOverEvents:[],lastEvent:'—',firstInningsTotal:null,target:null
};
let state=loadState();
function loadState(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY));return s?{...clone(defaultState),...s}:clone(defaultState)}catch{return clone(defaultState)}}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function oversFromBalls(b){return `${Math.floor(b/5)}.${b%5}`}
function switchStrike(){state.strikerIndex=state.strikerIndex===0?1:0}
function resetChoices(){state.physical=0;state.bonus=0}
function snapshot(){state.history.push(clone({...state,history:[]}));if(state.history.length>80)state.history.shift()}
function battingTeam(){return state.teams[state.battingKey]}
function bowlingTeam(){return state.teams[state.bowlingKey]}
function ensureBowler(name){if(!state.bowlerStats[name])state.bowlerStats[name]={balls:0,runs:0,wickets:0}}
function isFinalOver(){return state.balls>=state.inningsBalls-5}
function countedDelivery(type){return !(type==='wide'&&isFinalOver())}
function inningsDone(){return state.balls>=state.inningsBalls || (state.innings===2&&state.runs>=state.target)}

function render(){
  $('battingTeamLabel').textContent=battingTeam().name;$('bowlingTeamLabel').textContent=bowlingTeam().name;
  $('score').textContent=state.runs;$('wickets').textContent=state.wickets;$('ballsBowled').textContent=state.balls;$('ballsRemaining').textContent=Math.max(0,state.inningsBalls-state.balls);
  const overNo=Math.floor(state.balls/5)+1,ballNo=(state.balls%5)+1;
  $('overDisplay').textContent=inningsDone()?'INNINGS COMPLETE':`OVER ${overNo} · BALL ${ballNo} OF 5`;$('pairDisplay').textContent=`PAIR ${state.pairBalls} / 20`;
  if(state.innings===2){$('chaseLine').classList.remove('hidden');$('runsToWin').textContent=Math.max(0,state.target-state.runs);$('chaseBalls').textContent=Math.max(0,state.inningsBalls-state.balls)}else $('chaseLine').classList.add('hidden');
  const s=state.batters[state.strikerIndex],n=state.batters[state.strikerIndex===0?1:0];$('strikerName').textContent=s.name;$('strikerRuns').textContent=s.runs;$('strikerBalls').textContent=s.balls;$('nonStrikerName').textContent=n.name;$('nonStrikerRuns').textContent=n.runs;$('nonStrikerBalls').textContent=n.balls;
  $('physicalChoice').textContent=state.physical;$('bonusChoice').textContent=state.bonus;$('deliveryTotal').textContent=state.physical+state.bonus;$('recordSummary').textContent=`${state.physical+state.bonus} RUN${state.physical+state.bonus===1?'':'S'}`;
  $('wideSummary').textContent=`+${state.wideValue+state.physical+state.bonus}`;$('noBallSummary').textContent=`+${state.noBallValue+state.physical+state.bonus}`;$('wicketPenaltyLabel').textContent=`-${state.wicketPenalty}`;
  document.querySelectorAll('[data-physical]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.physical)===state.physical));document.querySelectorAll('[data-bonus]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.bonus)===state.bonus));
  renderBowlerDropdowns();ensureBowler(state.currentBowler);const bs=state.bowlerStats[state.currentBowler];$('bowlerFigures').textContent=`${oversFromBalls(bs.balls)} overs · ${bs.runs} runs · ${bs.wickets} wickets`;
  $('lastEvent').textContent=state.lastEvent||'—';$('thisOver').textContent=state.currentOverEvents.length?state.currentOverEvents.join('  '):'—';saveState();
}

function renderBowlerDropdowns(){const names=bowlingTeam().players.filter(Boolean);if(!names.includes(state.currentBowler))state.currentBowler=names[0]||'Bowler 1';[$('bowlerSelect'),$('notificationBowlerSelect')].forEach(sel=>{sel.innerHTML='';names.forEach(name=>{ensureBowler(name);const st=state.bowlerStats[name],o=document.createElement('option');o.value=name;o.textContent=`${name} — ${oversFromBalls(st.balls)} / ${st.runs} / ${st.wickets}`;sel.appendChild(o)});sel.value=state.currentBowler})}

function addRunsToCurrentBatter(runs,physical,countBall){const striker=state.batters[state.strikerIndex];striker.runs+=runs;if(countBall)striker.balls+=1;if(physical===2||physical===6)switchStrike()}
function addPairStats(total,physical,bonus,countBall){state.pairRuns+=total;state.pairPhysical+=physical;state.pairBonus+=bonus;if(countBall)state.pairBalls+=1}

function recordDelivery(type='normal'){
  if(!state.matchStarted||inningsDone())return;
  snapshot();ensureBowler(state.currentBowler);
  const countBall=countedDelivery(type);const base=type==='wide'?state.wideValue:type==='noball'?state.noBallValue:0;const total=base+state.physical+state.bonus;
  state.runs+=total;state.bowlerStats[state.currentBowler].runs+=total;if(countBall){state.balls+=1;state.bowlerStats[state.currentBowler].balls+=1}
  addRunsToCurrentBatter(state.physical+state.bonus,state.physical,countBall);addPairStats(total,state.physical,state.bonus,countBall);
  const tag=type==='wide'?`WD ${total}`:type==='noball'?`NB ${total}`:`${state.physical}+${state.bonus}=${total}`;state.lastEvent=tag;state.currentOverEvents.push(tag);
  finishDelivery(countBall);resetChoices();render();
}

function recordWicket(){
  if(!state.matchStarted||inningsDone())return;snapshot();ensureBowler(state.currentBowler);const countBall=true;
  state.runs-=state.wicketPenalty;state.wickets+=1;state.balls+=1;state.pairBalls+=1;state.pairRuns-=state.wicketPenalty;state.batters[state.strikerIndex].balls+=1;state.bowlerStats[state.currentBowler].balls+=1;state.bowlerStats[state.currentBowler].wickets+=1;state.lastEvent=`W -${state.wicketPenalty}`;state.currentOverEvents.push('W');finishDelivery(countBall);render();
}

function finishDelivery(countBall){
  if(inningsDone()){showInningsComplete();return}
  const pairEnded=countBall&&state.pairBalls>=20;const overEnded=countBall&&state.balls%5===0;
  if(overEnded)switchStrike();
  if(pairEnded){showPairComplete();return}
  if(overEnded){const previous=state.currentOverEvents.join('  ');state.currentOverEvents=[];render();notify('OVER COMPLETE','Change bowler',`5 deliveries completed. Strike has changed.${previous?`  Over: ${previous}`:''}`,{showBowler:true});}
}

function showPairComplete(){
  state.currentOverEvents=[];
  $('messageStats').innerHTML=`<div><b>${state.pairRuns}</b>TOTAL</div><div><b>${state.pairPhysical}</b>PHYSICAL</div><div><b>${state.pairBonus}</b>BONUS</div>`;$('messageStats').classList.remove('hidden');populatePairChooser();notify('PAIR + OVER COMPLETE',`${state.batters[0].name} & ${state.batters[1].name}`,'20 deliveries completed. Select the next batting pair and the next bowler.',{pairSetup:true,showBowler:true});
}

function showInningsComplete(){
  if(state.innings===1){state.firstInningsTotal=state.runs;state.target=state.runs+1;notify('INNINGS COMPLETE',`${battingTeam().name}: ${state.runs}/${state.wickets}`,`${bowlingTeam().name} need ${state.target} to win from ${state.inningsBalls} balls.`,{secondInnings:true})}
  else{let result;if(state.runs>=state.target)result=`${battingTeam().name} win`;else if(state.runs===state.firstInningsTotal)result='Match tied';else result=`${bowlingTeam().name} win`;notify('MATCH COMPLETE',result,`${battingTeam().name}: ${state.runs}/${state.wickets} · Target ${state.target}`,{matchComplete:true})}
}

function notify(kicker,title,text,opts={}){$('messageKicker').textContent=kicker;$('messageTitle').textContent=title;$('messageText').textContent=text;$('notificationBowlerSelect').style.display=opts.showBowler?'block':'none';$('pairChooser').classList.toggle('hidden',!opts.pairSetup);if(!opts.pairSetup)$('messageStats').classList.add('hidden');$('messageContinueBtn').dataset.mode=opts.pairSetup?'pair':opts.secondInnings?'second':opts.matchComplete?'complete':'continue';$('messageContinueBtn').textContent=opts.pairSetup?'START NEXT PAIR':opts.secondInnings?'START 2ND INNINGS':opts.matchComplete?'CLOSE':'CONTINUE';$('messageOverlay').classList.remove('hidden')}

function populatePairChooser(){const players=battingTeam().players.filter(Boolean);[$('nextBatter1'),$('nextBatter2')].forEach((sel,idx)=>{sel.innerHTML='';players.forEach((name,i)=>{const o=document.createElement('option');o.value=name;o.textContent=name;sel.appendChild(o)});sel.value=players[Math.min(idx,players.length-1)]||''})}

function startSecondInnings(){
  state.innings=2;[state.battingKey,state.bowlingKey]=[state.bowlingKey,state.battingKey];state.runs=0;state.wickets=0;state.balls=0;state.pairBalls=0;state.pairRuns=0;state.pairPhysical=0;state.pairBonus=0;state.currentOverEvents=[];state.lastEvent='—';state.bowlerStats={};const p=battingTeam().players.filter(Boolean);state.batters=[{name:p[0]||'Batter 1',runs:0,balls:0},{name:p[1]||'Batter 2',runs:0,balls:0}];state.strikerIndex=0;state.currentBowler=bowlingTeam().players.filter(Boolean)[0]||'Bowler 1';resetChoices();render();
}

function createPlayerInputs(container,prefix){container.innerHTML='';for(let i=0;i<6;i++){const inp=document.createElement('input');inp.placeholder=`Player ${i+1}`;inp.value=`${prefix} Player ${i+1}`;container.appendChild(inp)}}
function openSetup(){
  $('teamAInput').value=state.teams.A.name;$('teamBInput').value=state.teams.B.name;[...$('teamAPlayers').querySelectorAll('input')].forEach((x,i)=>x.value=state.teams.A.players[i]||'');[...$('teamBPlayers').querySelectorAll('input')].forEach((x,i)=>x.value=state.teams.B.players[i]||'');$('batFirstSelect').value=state.batFirst;$('inningsBallsInput').value=state.inningsBalls;$('wideValueInput').value=state.wideValue;$('noBallValueInput').value=state.noBallValue;$('wicketPenaltyInput').value=state.wicketPenalty;$('setupOverlay').classList.remove('hidden')
}
function startMatchFromSetup(){
  const Aplayers=[...$('teamAPlayers').querySelectorAll('input')].map(x=>x.value.trim()).filter(Boolean),Bplayers=[...$('teamBPlayers').querySelectorAll('input')].map(x=>x.value.trim()).filter(Boolean);state=clone(defaultState);state.matchStarted=true;state.teams.A={name:$('teamAInput').value.trim()||'Team A',players:Aplayers.length?Aplayers:blankPlayers('A')};state.teams.B={name:$('teamBInput').value.trim()||'Team B',players:Bplayers.length?Bplayers:blankPlayers('B')};state.batFirst=$('batFirstSelect').value;state.battingKey=state.batFirst;state.bowlingKey=state.batFirst==='A'?'B':'A';state.inningsBalls=Math.max(5,Number($('inningsBallsInput').value)||60);state.wideValue=Math.max(0,Number($('wideValueInput').value)||0);state.noBallValue=Math.max(0,Number($('noBallValueInput').value)||0);state.wicketPenalty=Math.max(0,Number($('wicketPenaltyInput').value)||0);const bp=battingTeam().players.filter(Boolean);state.batters=[{name:bp[0]||'Batter 1',runs:0,balls:0},{name:bp[1]||'Batter 2',runs:0,balls:0}];state.currentBowler=bowlingTeam().players.filter(Boolean)[0]||'Bowler 1';$('setupOverlay').classList.add('hidden');render()
}

createPlayerInputs($('teamAPlayers'),'A');createPlayerInputs($('teamBPlayers'),'B');
$('physicalGrid').addEventListener('click',e=>{const b=e.target.closest('[data-physical]');if(!b)return;state.physical=Number(b.dataset.physical);render()});$('bonusGrid').addEventListener('click',e=>{const b=e.target.closest('[data-bonus]');if(!b)return;state.bonus=Number(b.dataset.bonus);render()});
$('recordBtn').onclick=()=>recordDelivery('normal');$('wideBtn').onclick=()=>recordDelivery('wide');$('noBallBtn').onclick=()=>recordDelivery('noball');$('wicketBtn').onclick=recordWicket;$('bowlerSelect').onchange=e=>{state.currentBowler=e.target.value;render()};$('undoBtn').onclick=()=>{if(!state.history.length)return;const prev=state.history.pop(),history=state.history;state={...prev,history};render()};
$('setupBtn').onclick=openSetup;$('closeSetupBtn').onclick=()=>$('setupOverlay').classList.add('hidden');$('saveSetupBtn').onclick=startMatchFromSetup;$('notificationBowlerSelect').onchange=e=>{state.currentBowler=e.target.value;render()};
$('messageContinueBtn').onclick=()=>{const mode=$('messageContinueBtn').dataset.mode;if(mode==='pair'){state.currentBowler=$('notificationBowlerSelect').value;const b1=$('nextBatter1').value,b2=$('nextBatter2').value;state.batters=[{name:b1||'Batter 1',runs:0,balls:0},{name:b2||'Batter 2',runs:0,balls:0}];state.strikerIndex=0;state.pairBalls=0;state.pairRuns=0;state.pairPhysical=0;state.pairBonus=0}else if(mode==='second'){startSecondInnings()}else if($('notificationBowlerSelect').style.display!=='none'){state.currentBowler=$('notificationBowlerSelect').value} $('messageOverlay').classList.add('hidden');render()};

render();if(!state.matchStarted)setTimeout(openSetup,80);
