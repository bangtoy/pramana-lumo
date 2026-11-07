(() => {
  const deck = window.DECK_MANIFEST || [];
  const frame = document.getElementById('frame');
  const tools = document.createElement('nav'); tools.id='overviewTools'; tools.setAttribute('aria-label','Presentation options');
  tools.innerHTML='<a href="?ov=gallery">3D Gallery</a><a href="?ov=grid">Grid</a><a href="presenter-notes.html" target="_blank">6-minute script ↗</a><a href="Pramana-Lumo.pdf" target="_blank">PDF ↗</a>';
  document.body.appendChild(tools);
  const controls=document.createElement('div'); controls.id='presenterControls';
  controls.innerHTML='<button id="pitchClock" type="button" aria-label="Start or pause the 6-minute timer" title="T: start / pause · R: reset">06:00</button><button id="notesToggle" type="button" aria-expanded="false" aria-controls="notesPanel" title="N: speaker notes">Notes</button><button id="fullScreenToggle" type="button" title="F: fullscreen">Fullscreen</button>';
  document.body.appendChild(controls);
  const notes=document.createElement('aside'); notes.id='notesPanel'; notes.hidden=true; notes.setAttribute('aria-label','Speaker notes'); document.body.appendChild(notes);
  const help=document.createElement('div'); help.id='keyboardHelp'; help.textContent='← → slides · Esc gallery · N notes · F fullscreen · T timer'; document.body.appendChild(help);
  const clock=document.getElementById('pitchClock');
  let elapsed=0, runningSince=null;
  const readElapsed=()=>elapsed+(runningSince===null?0:performance.now()-runningSince);
  function displayTime(){const remaining=Math.max(0,Math.ceil(360-readElapsed()/1000));clock.textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');clock.classList.toggle('expired',remaining===0);clock.setAttribute('aria-label',(runningSince===null?'Start':'Pause')+' timer, remaining '+clock.textContent);}
  function timer(){if(runningSince===null)runningSince=performance.now();else{elapsed+=performance.now()-runningSince;runningSince=null;}displayTime();}
  function resetTimer(){elapsed=0;runningSince=null;displayTime();}
  function currentIndex(){const idx=parseInt(location.hash.slice(1),10)-1;return Number.isFinite(idx)&&idx>=0&&idx<deck.length?idx:0;}
  function updateNotes(){const idx=currentIndex(),s=deck[idx];if(!s)return;notes.replaceChildren();const meta=document.createElement('div');meta.className='meta';meta.textContent=s.appendix?'Appendix · outside the 6 minutes':s.seconds+' seconds · '+s.criteria.join(' / ');const title=document.createElement('h2');title.textContent=s.label;const text=document.createElement('p');text.textContent=s.notes;const all=document.createElement('a');all.href='presenter-notes.html';all.target='_blank';all.rel='noopener';all.textContent='Open full script ↗';notes.append(meta,title,text,all);}
  function toggleNotes(){notes.hidden=!notes.hidden;document.getElementById('notesToggle').setAttribute('aria-expanded',String(!notes.hidden));updateNotes();}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(error){console.info('Fullscreen is unavailable in this window.');}}
  clock.addEventListener('click',timer);
  document.getElementById('notesToggle').addEventListener('click',toggleNotes);
  document.getElementById('fullScreenToggle').addEventListener('click',fullscreen);
  document.getElementById('startBtn').addEventListener('click',()=>{if(readElapsed()===0){runningSince=performance.now();displayTime();}});
  const actions={next:()=>window.pramanaDeck.next(),prev:()=>window.pramanaDeck.prev(),first:()=>window.pramanaDeck.show(0),last:()=>window.pramanaDeck.show(deck.length-1),overview:()=>{window.pramanaDeck.overview();notes.hidden=true;document.getElementById('notesToggle').setAttribute('aria-expanded','false');},notes:toggleNotes,fullscreen,timer};
  window.addEventListener('message',event=>{if(event.source!==frame.contentWindow||event.data?.source!=='pramana-slide')return;const action=actions[event.data.action];if(action){action();updateNotes();}});
  document.addEventListener('keydown',event=>{if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;const key=event.key.toLowerCase();if(document.body.dataset.mode!=='present')return;const fn={n:toggleNotes,f:fullscreen,t:timer,r:resetTimer}[key];if(fn){event.preventDefault();fn();}});
  document.addEventListener('pramana:slide',updateNotes);
  window.addEventListener('hashchange',updateNotes);
  setInterval(displayTime,250);updateNotes();
})();
