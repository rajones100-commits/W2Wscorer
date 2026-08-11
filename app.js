const STORAGE_KEY='w2wIndoorScorerV5';
const ARCHIVE_KEY='w2wIndoorMatchArchiveV1';
const $=id=>document.getElementById(id);
const clone=x=>JSON.parse(JSON.stringify(x));
function blankPlayers(prefix){return Array.from({length:6},(_,i)=>`${prefix} Player ${i+1}`)}
const defaultState={
 matchStarted:false,matchId:null,matchDate:null,innings:1,inningsBalls:60,wideValue:2,noBallValue:2,wicketPenalty:5,
 teams:{A:{name:'Team A',players:blankPlayers('A')},B:{name:'Team B',players:blankPlayers('B')}},batFirst:'A',battingKey:'A',bowlingKey:'B',
 runs:0,wickets:0,balls:0,pairNumber:1,pairBalls:0,pairRuns:0,pairPhysical:0,pairBonus:0,physical:0,bonus:0,
 batters:[{name:'A Player 1',runs:0,balls:0,physical:0,bonus:0},{name:'A Player 2',runs:0,balls:0,physical:0,bonus:0}],strikerIndex:0,
 bowlerStats:{},currentBowler:'B Player 1',history:[],currentOverEvents:[],lastEvent:'—',firstInningsTotal:null,target:null,
 deliveries:[],pairSummaries:[],inningsSummaries:[],matchComplete:false,resultText:''
};
let state=loadState();
function loadState(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY));return s?{...clone(defaultState),...s}:clone(defaultState)}catch{return clone(defaultState)}}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function archiveMatch(){if(!state.matchComplete)return;let a=[];try{a=JSON.parse(localStorage.getItem(ARCHIVE_KEY))||[]}catch{};const clean=clone({...state,history:[]});const i=a.findIndex(m=>m.matchId===state.matchId);if(i>=0)a[i]=clean;else a.unshift(clean);localStorage.setItem(ARCHIVE_KEY,JSON.stringify(a.slice(0,200)))}
function oversFromBalls(b){return `${Math.floor(b/5)}.${b%5}`}
function switchStrike(){state.strikerIndex=state.strikerIndex===0?1:0}
function resetChoices(){state.physical=0;state.bonus=0}
function snapshot(){state.history.push(clone({...state,history:[]}));if(state.history.length>100)state.history.shift()}
function battingTeam(){return state.teams[state.battingKey]}
function bowlingTeam(){return state.teams[state.bowlingKey]}
function ensureBowler(name){if(!state.bowlerStats[name])state.bowlerStats[name]={balls:0,runs:0,wickets:0,wides:0,noballs:0}}
function isFinalOver(){return state.balls>=state.inningsBalls-5}
function countedDelivery(type){return !(type==='wide'&&isFinalOver())}
function inningsDone(){return state.balls>=state.inningsBalls}
function deliveryNumber(){return state.deliveries.filter(d=>d.innings===state.innings).length+1}
function countedBallNumber(){return state.balls+1}

function render(){
 $('battingTeamLabel').textContent=battingTeam().name;$('bowlingTeamLabel').textContent=bowlingTeam().name;
 $('score').textContent=state.runs;$('wickets').textContent=state.wickets;$('ballsBowled').textContent=state.balls;$('ballsRemaining').textContent=Math.max(0,state.inningsBalls-state.balls);
 const overNo=Math.floor(state.balls/5)+1,ballNo=(state.balls%5)+1;
 $('overDisplay').textContent=inningsDone()?'INNINGS COMPLETE':`OVER ${overNo} · BALL ${ballNo} OF 5`;$('pairDisplay').textContent=`PAIR ${state.pairNumber} · ${state.pairBalls} / 20`;
 if(state.innings===2){$('chaseLine').classList.remove('hidden');const needed=state.target-state.runs;$('runsToWin').textContent=needed>0?needed:`0 (LEAD ${Math.abs(needed)})`;$('chaseBalls').textContent=Math.max(0,state.inningsBalls-state.balls)}else $('chaseLine').classList.add('hidden');
 const s=state.batters[state.strikerIndex],n=state.batters[state.strikerIndex===0?1:0];$('strikerName').textContent=s.name;$('strikerRuns').textContent=s.runs;$('strikerBalls').textContent=s.balls;$('nonStrikerName').textContent=n.name;$('nonStrikerRuns').textContent=n.runs;$('nonStrikerBalls').textContent=n.balls;
 $('physicalChoice').textContent=state.physical;$('bonusChoice').textContent=state.bonus;$('deliveryTotal').textContent=state.physical+state.bonus;$('recordSummary').textContent=`${state.physical+state.bonus} RUN${state.physical+state.bonus===1?'':'S'}`;
 $('wideSummary').textContent=`+${state.wideValue+state.physical+state.bonus}`;$('noBallSummary').textContent=`+${state.noBallValue+state.physical+state.bonus}`;$('wicketPenaltyLabel').textContent=`-${state.wicketPenalty}`;
 document.querySelectorAll('[data-physical]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.physical)===state.physical));document.querySelectorAll('[data-bonus]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.bonus)===state.bonus));
 renderBowlerDropdowns();ensureBowler(state.currentBowler);const bs=state.bowlerStats[state.currentBowler];$('bowlerFigures').textContent=`${oversFromBalls(bs.balls)} overs · ${bs.runs} runs · ${bs.wickets} wickets`;
 $('lastEvent').textContent=state.lastEvent||'—';$('thisOver').textContent=state.currentOverEvents.length?state.currentOverEvents.join('  '):'—';saveState();
}
function renderBowlerDropdowns(){const names=bowlingTeam().players.filter(Boolean);if(!names.includes(state.currentBowler))state.currentBowler=names[0]||'Bowler 1';[$('bowlerSelect'),$('notificationBowlerSelect')].forEach(sel=>{sel.innerHTML='';names.forEach(name=>{ensureBowler(name);const st=state.bowlerStats[name],o=document.createElement('option');o.value=name;o.textContent=`${name} — ${oversFromBalls(st.balls)} / ${st.runs} / ${st.wickets}`;sel.appendChild(o)});sel.value=state.currentBowler})}
function addRunsToCurrentBatter(runs,physical,bonus,countBall){const striker=state.batters[state.strikerIndex];striker.runs+=runs;striker.physical=(striker.physical||0)+physical;striker.bonus=(striker.bonus||0)+bonus;if(countBall)striker.balls+=1;if(physical===2||physical===6)switchStrike()}
function addPairStats(total,physical,bonus,countBall){state.pairRuns+=total;state.pairPhysical+=physical;state.pairBonus+=bonus;if(countBall)state.pairBalls+=1}
function pushDelivery({type,total,physical,bonus,base,countBall,wicket=false}){
 state.deliveries.push({matchId:state.matchId,innings:state.innings,delivery:deliveryNumber(),countedBall:countBall?countedBallNumber():state.balls,over:Math.floor(state.balls/5)+1,ballInOver:(state.balls%5)+1,pair:state.pairNumber,battingTeam:battingTeam().name,bowlingTeam:bowlingTeam().name,striker:state.batters[state.strikerIndex].name,bowler:state.currentBowler,type,physical,bonus,extraRuns:base,total,wicket,wicketPenalty:wicket?state.wicketPenalty:0,counted:countBall,scoreBefore:state.runs,createdAt:new Date().toISOString()});
}
function recordDelivery(type='normal'){
 if(!state.matchStarted||inningsDone())return;snapshot();ensureBowler(state.currentBowler);
 const countBall=countedDelivery(type),base=type==='wide'?state.wideValue:type==='noball'?state.noBallValue:0,total=base+state.physical+state.bonus;
 pushDelivery({type,total,physical:state.physical,bonus:state.bonus,base,countBall});
 state.runs+=total;const bs=state.bowlerStats[state.currentBowler];bs.runs+=total;if(type==='wide')bs.wides+=base;if(type==='noball')bs.noballs+=base;if(countBall){state.balls+=1;bs.balls+=1}
 addRunsToCurrentBatter(state.physical+state.bonus,state.physical,state.bonus,countBall);addPairStats(total,state.physical,state.bonus,countBall);
 const tag=type==='wide'?`WD ${total}`:type==='noball'?`NB ${total}`:`${state.physical}+${state.bonus}=${total}`;state.lastEvent=tag;state.currentOverEvents.push(tag);finishDelivery(countBall);resetChoices();render();
}
function recordWicket(){
 if(!state.matchStarted||inningsDone())return;snapshot();ensureBowler(state.currentBowler);const countBall=true;
 pushDelivery({type:'wicket',total:-state.wicketPenalty,physical:0,bonus:0,base:0,countBall,wicket:true});
 state.runs-=state.wicketPenalty;state.wickets+=1;state.balls+=1;state.pairBalls+=1;state.pairRuns-=state.wicketPenalty;state.batters[state.strikerIndex].balls+=1;const bs=state.bowlerStats[state.currentBowler];bs.balls+=1;bs.wickets+=1;state.lastEvent=`W -${state.wicketPenalty}`;state.currentOverEvents.push('W');finishDelivery(true);render();
}
function savePairSummary(){state.pairSummaries.push({innings:state.innings,pair:state.pairNumber,batters:state.batters.map(b=>b.name),runs:state.pairRuns,physical:state.pairPhysical,bonus:state.pairBonus,balls:state.pairBalls,wickets:state.deliveries.filter(d=>d.innings===state.innings&&d.pair===state.pairNumber&&d.wicket).length})}
function finishDelivery(countBall){
 if(inningsDone()){if(state.pairBalls>0&&!state.pairSummaries.some(p=>p.innings===state.innings&&p.pair===state.pairNumber))savePairSummary();showInningsComplete();return}
 const pairEnded=countBall&&state.pairBalls>=20,overEnded=countBall&&state.balls%5===0;if(overEnded)switchStrike();if(pairEnded){savePairSummary();showPairComplete();return}
 if(overEnded){const previous=state.currentOverEvents.join('  ');state.currentOverEvents=[];render();notify('OVER COMPLETE','Change bowler',`5 deliveries completed. Strike has changed.${previous?` Over: ${previous}`:''}`,{showBowler:true})}
}
function showPairComplete(){state.currentOverEvents=[];$('messageStats').innerHTML=`<div><b>${state.pairRuns}</b>TOTAL</div><div><b>${state.pairPhysical}</b>PHYSICAL</div><div><b>${state.pairBonus}</b>BONUS</div>`;$('messageStats').classList.remove('hidden');populatePairChooser();notify('PAIR + OVER COMPLETE',`${state.batters[0].name} & ${state.batters[1].name}`,'20 deliveries completed. Select the next batting pair and the next bowler.',{pairSetup:true,showBowler:true})}
function inningsSummary(){return {innings:state.innings,team:battingTeam().name,runs:state.runs,wickets:state.wickets,balls:state.balls,target:state.innings===2?state.target:null,bowlerStats:clone(state.bowlerStats),pairs:clone(state.pairSummaries.filter(p=>p.innings===state.innings))}}
function showInningsComplete(){
 if(!state.inningsSummaries.some(x=>x.innings===state.innings))state.inningsSummaries.push(inningsSummary());
 if(state.innings===1){state.firstInningsTotal=state.runs;state.target=state.runs+1;notify('INNINGS COMPLETE',`${battingTeam().name}: ${state.runs}/${state.wickets}`,`${bowlingTeam().name} need ${state.target} from ${state.inningsBalls} balls.`,{secondInnings:true})}
 else{let result;if(state.runs>=state.target)result=`${battingTeam().name} win`;else if(state.runs===state.firstInningsTotal)result='Match tied';else result=`${bowlingTeam().name} win`;state.matchComplete=true;state.resultText=result;archiveMatch();notify('MATCH COMPLETE',result,`${battingTeam().name}: ${state.runs}/${state.wickets} · Target ${state.target}`,{matchComplete:true})}
}
function notify(kicker,title,text,opts={}){$('messageKicker').textContent=kicker;$('messageTitle').textContent=title;$('messageText').textContent=text;$('notificationBowlerSelect').style.display=opts.showBowler?'block':'none';$('pairChooser').classList.toggle('hidden',!opts.pairSetup);if(!opts.pairSetup)$('messageStats').classList.add('hidden');$('messageContinueBtn').dataset.mode=opts.pairSetup?'pair':opts.secondInnings?'second':opts.matchComplete?'complete':'continue';$('messageContinueBtn').textContent=opts.pairSetup?'START NEXT PAIR':opts.secondInnings?'START 2ND INNINGS':opts.matchComplete?'VIEW MATCH STATS':'CONTINUE';$('messageOverlay').classList.remove('hidden')}
function populatePairChooser(){const players=battingTeam().players.filter(Boolean);[$('nextBatter1'),$('nextBatter2')].forEach((sel,idx)=>{sel.innerHTML='';players.forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;sel.appendChild(o)});sel.value=players[Math.min(idx,players.length-1)]||''})}
function startSecondInnings(){state.innings=2;[state.battingKey,state.bowlingKey]=[state.bowlingKey,state.battingKey];state.runs=0;state.wickets=0;state.balls=0;state.pairNumber=1;state.pairBalls=0;state.pairRuns=0;state.pairPhysical=0;state.pairBonus=0;state.currentOverEvents=[];state.lastEvent='—';state.bowlerStats={};const p=battingTeam().players.filter(Boolean);state.batters=[{name:p[0]||'Batter 1',runs:0,balls:0,physical:0,bonus:0},{name:p[1]||'Batter 2',runs:0,balls:0,physical:0,bonus:0}];state.strikerIndex=0;state.currentBowler=bowlingTeam().players.filter(Boolean)[0]||'Bowler 1';resetChoices();render()}
function createPlayerInputs(container,prefix){container.innerHTML='';for(let i=0;i<6;i++){const inp=document.createElement('input');inp.placeholder=`Player ${i+1}`;inp.value=`${prefix} Player ${i+1}`;container.appendChild(inp)}}
function openSetup(){$('teamAInput').value=state.teams.A.name;$('teamBInput').value=state.teams.B.name;[...$('teamAPlayers').querySelectorAll('input')].forEach((x,i)=>x.value=state.teams.A.players[i]||'');[...$('teamBPlayers').querySelectorAll('input')].forEach((x,i)=>x.value=state.teams.B.players[i]||'');$('batFirstSelect').value=state.batFirst;$('inningsBallsInput').value=state.inningsBalls;$('wideValueInput').value=state.wideValue;$('noBallValueInput').value=state.noBallValue;$('wicketPenaltyInput').value=state.wicketPenalty;$('setupOverlay').classList.remove('hidden')}
function startMatchFromSetup(){const Aplayers=[...$('teamAPlayers').querySelectorAll('input')].map(x=>x.value.trim()).filter(Boolean),Bplayers=[...$('teamBPlayers').querySelectorAll('input')].map(x=>x.value.trim()).filter(Boolean);state=clone(defaultState);state.matchStarted=true;state.matchId=`W2W-${Date.now()}`;state.matchDate=new Date().toISOString();state.teams.A={name:$('teamAInput').value.trim()||'Team A',players:Aplayers.length?Aplayers:blankPlayers('A')};state.teams.B={name:$('teamBInput').value.trim()||'Team B',players:Bplayers.length?Bplayers:blankPlayers('B')};state.batFirst=$('batFirstSelect').value;state.battingKey=state.batFirst;state.bowlingKey=state.batFirst==='A'?'B':'A';state.inningsBalls=Math.max(5,Number($('inningsBallsInput').value)||60);state.wideValue=Math.max(0,Number($('wideValueInput').value)||0);state.noBallValue=Math.max(0,Number($('noBallValueInput').value)||0);state.wicketPenalty=Math.max(0,Number($('wicketPenaltyInput').value)||0);const bp=battingTeam().players.filter(Boolean);state.batters=[{name:bp[0]||'Batter 1',runs:0,balls:0,physical:0,bonus:0},{name:bp[1]||'Batter 2',runs:0,balls:0,physical:0,bonus:0}];state.currentBowler=bowlingTeam().players.filter(Boolean)[0]||'Bowler 1';$('setupOverlay').classList.add('hidden');render()}
function playerStats(){const out={};for(const d of state.deliveries){if(!out[d.striker])out[d.striker]={name:d.striker,team:d.battingTeam,runs:0,physical:0,bonus:0,balls:0};if(!d.wicket){out[d.striker].runs+=d.physical+d.bonus;out[d.striker].physical+=d.physical;out[d.striker].bonus+=d.bonus}if(d.counted)out[d.striker].balls++}return Object.values(out)}
function bowlingStatsAll(){const out={};for(const d of state.deliveries){if(!out[d.bowler])out[d.bowler]={name:d.bowler,team:d.bowlingTeam,balls:0,runs:0,wickets:0,wides:0,noballs:0};const s=out[d.bowler];if(!d.wicket)s.runs+=d.total;if(d.counted)s.balls++;if(d.wicket)s.wickets++;if(d.type==='wide')s.wides+=d.extraRuns;if(d.type==='noball')s.noballs+=d.extraRuns}return Object.values(out)}
function statsTable(rows,cols){return `<div class="stats-table"><div class="tr th">${cols.map(c=>`<span>${c[0]}</span>`).join('')}</div>${rows.map(r=>`<div class="tr">${cols.map(c=>`<span>${c[1](r)}</span>`).join('')}</div>`).join('')}</div>`}
function showStats(){const bat=playerStats(),bowl=bowlingStatsAll();$('statsTitle').textContent=`${state.teams.A.name} v ${state.teams.B.name}`;$('statsSummary').innerHTML=`<b>${state.resultText||'Match in progress'}</b><br>${state.firstInningsTotal!==null?`1st innings: ${state.firstInningsTotal} · `:''}${state.innings===2||state.matchComplete?`2nd innings: ${state.runs}`:''}<br>${state.deliveries.length} recorded deliveries`;
 $('battingStats').innerHTML=statsTable(bat,[['PLAYER',r=>r.name],['RUNS',r=>r.runs],['PHY',r=>r.physical],['BON',r=>r.bonus],['BALLS',r=>r.balls]]);
 $('bowlingStatsAll').innerHTML=statsTable(bowl,[['BOWLER',r=>r.name],['OVERS',r=>oversFromBalls(r.balls)],['RUNS',r=>r.runs],['WKTS',r=>r.wickets],['WD/NB',r=>`${r.wides}/${r.noballs}`]]);
 const pairs=state.pairSummaries;$('pairStats').innerHTML=statsTable(pairs,[['PAIR',r=>`${r.innings}.${r.pair}`],['BATTERS',r=>r.batters.join(' & ')],['RUNS',r=>r.runs],['PHY',r=>r.physical],['BON',r=>r.bonus]]);$('statsOverlay').classList.remove('hidden')}
function exportMatch(){const payload={version:1,exportedAt:new Date().toISOString(),match:clone({...state,history:[]}),derived:{batting:playerStats(),bowling:bowlingStatsAll(),pairs:state.pairSummaries}};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${(state.teams.A.name+'-v-'+state.teams.B.name).replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-${state.matchId||'match'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}

createPlayerInputs($('teamAPlayers'),'A');createPlayerInputs($('teamBPlayers'),'B');
$('physicalGrid').addEventListener('click',e=>{const b=e.target.closest('[data-physical]');if(!b)return;state.physical=Number(b.dataset.physical);render()});$('bonusGrid').addEventListener('click',e=>{const b=e.target.closest('[data-bonus]');if(!b)return;state.bonus=Number(b.dataset.bonus);render()});
$('recordBtn').onclick=()=>recordDelivery('normal');$('wideBtn').onclick=()=>recordDelivery('wide');$('noBallBtn').onclick=()=>recordDelivery('noball');$('wicketBtn').onclick=recordWicket;$('bowlerSelect').onchange=e=>{state.currentBowler=e.target.value;render()};$('undoBtn').onclick=()=>{if(!state.history.length)return;const prev=state.history.pop(),history=state.history;state={...prev,history};render()};
$('setupBtn').onclick=openSetup;$('closeSetupBtn').onclick=()=>$('setupOverlay').classList.add('hidden');$('saveSetupBtn').onclick=startMatchFromSetup;$('notificationBowlerSelect').onchange=e=>{state.currentBowler=e.target.value;render()};$('statsBtn').onclick=showStats;$('closeStatsBtn').onclick=()=>$('statsOverlay').classList.add('hidden');$('exportBtn').onclick=exportMatch;
$('messageContinueBtn').onclick=()=>{const mode=$('messageContinueBtn').dataset.mode;if(mode==='pair'){state.currentBowler=$('notificationBowlerSelect').value;const b1=$('nextBatter1').value,b2=$('nextBatter2').value;state.batters=[{name:b1||'Batter 1',runs:0,balls:0,physical:0,bonus:0},{name:b2||'Batter 2',runs:0,balls:0,physical:0,bonus:0}];state.strikerIndex=0;state.pairNumber+=1;state.pairBalls=0;state.pairRuns=0;state.pairPhysical=0;state.pairBonus=0}else if(mode==='second'){startSecondInnings()}else if(mode==='complete'){showStats()}else if($('notificationBowlerSelect').style.display!=='none'){state.currentBowler=$('notificationBowlerSelect').value}$('messageOverlay').classList.add('hidden');render()};
render();if(!state.matchStarted)setTimeout(openSetup,80);
