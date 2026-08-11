(function(){
  const cfg=window.W2W_DB_CONFIG||{};
  const base=(cfg.supabaseUrl||'').replace(/\/$/,'');
  const key=cfg.supabaseAnonKey||'';
  const configured=()=>Boolean(base&&key);
  async function req(path,options={}){
    if(!configured())throw new Error('Online database is not configured');
    const res=await fetch(`${base}/rest/v1/${path}`,{
      ...options,
      headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal',...(options.headers||{})}
    });
    if(!res.ok)throw new Error((await res.text())||`Database error ${res.status}`);
    return res;
  }
  function cleanMatch(state){
    const sums=state.inningsSummaries||[];
    const i1=sums.find(x=>x.innings===1),i2=sums.find(x=>x.innings===2);
    return {
      id:state.matchId,played_at:state.matchDate,team_a:state.teams.A.name,team_b:state.teams.B.name,
      bat_first:state.batFirst,innings_balls:state.inningsBalls,wide_value:state.wideValue,no_ball_value:state.noBallValue,
      wicket_penalty:state.wicketPenalty,status:state.matchComplete?'complete':'in_progress',first_innings_total:state.firstInningsTotal,
      team_a_total:i1?.team===state.teams.A.name?i1.runs:i2?.team===state.teams.A.name?i2?.runs:null,
      team_b_total:i1?.team===state.teams.B.name?i1.runs:i2?.team===state.teams.B.name?i2?.runs:null,
      result_text:state.resultText||null,match_json:{teams:state.teams,pairSummaries:state.pairSummaries,inningsSummaries:state.inningsSummaries}
    };
  }
  async function syncMatch(state){
    await req('matches?on_conflict=id',{method:'POST',body:JSON.stringify(cleanMatch(state))});
    await req(`deliveries?match_id=eq.${encodeURIComponent(state.matchId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    if(state.deliveries.length){
      const rows=state.deliveries.map(d=>({
        match_id:d.matchId,innings:d.innings,delivery_no:d.delivery,counted_ball:d.countedBall,over_no:d.over,ball_in_over:d.ballInOver,
        pair_no:d.pair,batting_team:d.battingTeam,bowling_team:d.bowlingTeam,striker:d.striker,bowler:d.bowler,event_type:d.type,
        physical_runs:d.physical,bonus_runs:d.bonus,extra_runs:d.extraRuns,total_runs:d.total,wicket:d.wicket,wicket_penalty:d.wicketPenalty,
        counted:d.counted,score_before:d.scoreBefore,created_at:d.createdAt
      }));
      await req('deliveries',{method:'POST',body:JSON.stringify(rows)});
    }
    const appearances=[];
    for(const keyName of ['A','B'])for(const player of state.teams[keyName].players.filter(Boolean))appearances.push({match_id:state.matchId,team_name:state.teams[keyName].name,player_name:player});
    await req(`match_players?match_id=eq.${encodeURIComponent(state.matchId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
    if(appearances.length)await req('match_players',{method:'POST',body:JSON.stringify(appearances)});
    return true;
  }
  async function getCompletedMatches(){
    const res=await req('matches?status=eq.complete&select=*&order=played_at.desc',{method:'GET',headers:{Prefer:'return=representation'}});
    return res.json();
  }
  async function getDeliveries(){
    const res=await req('deliveries?select=*&order=created_at.asc',{method:'GET',headers:{Prefer:'return=representation'}});
    return res.json();
  }
  window.W2W_DB={configured,syncMatch,getCompletedMatches,getDeliveries};
})();
