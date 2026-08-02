import"./style-DKTv8GeI.js";const G=["#3987e5","#d95926","#199e70","#c98500"],C={secondary:"#c3c2b7",muted:"#898781",grid:"#2c2c2a",baseline:"#4a4458"},g=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");function K(t,e,n,s,a=3){return s<=.5||n<=0?"":(a=Math.min(a,n/2,s),`M${t},${e+s} L${t},${e+a} Q${t},${e} ${t+a},${e} L${t+n-a},${e} Q${t+n},${e} ${t+n},${e+a} L${t+n},${e+s} Z`)}function Z(t){return t.length<2?"":`<div class="viz-legend">${t.map(e=>`<span class="viz-key"><i style="background:${e.color}"></i>${g(e.name)}</span>`).join("")}</div>`}function E(t){return Number.isInteger(t)?String(t):t.toFixed(1)}function z(t){const{title:e,categories:n,series:s}=t,a=520,l=t.height??210,c=t.yFmt??E,u=34,v=6,h=10,j=24,f=a-u-v,b=l-h-j,k=Math.max(1,...s.flatMap(p=>p.values)),P=p=>h+b*(1-p/k),y=f/Math.max(1,n.length),M=2,i=Math.min(10,y*.18),o=Math.max(2,(y-i*2-M*(s.length-1))/s.length);let d="";n.forEach((p,w)=>{s.forEach((R,B)=>{const D=R.values[w]??0,J=u+w*y+i+B*(o+M),F=P(D),W=`${g(R.name)} · ${g(p)}: ${c(D)}`;d+=`<path d="${K(J,F,o,h+b-F)}" fill="${R.color}" data-tip="${W}"></path>`,d+=`<rect x="${u+w*y+i+B*(o+M)-M/2}" y="${h}" width="${o+M}" height="${b}" fill="transparent" data-tip="${W}"></rect>`})});const m=[.5,1].map(p=>{const w=P(k*p);return`<line x1="${u}" y1="${w}" x2="${a-v}" y2="${w}" stroke="${C.grid}" stroke-width="1"></line>
        <text x="${u-5}" y="${w+3.5}" text-anchor="end" fill="${C.muted}" font-size="10">${c(k*p)}</text>`}).join(""),x=Math.ceil(n.length/12),H=n.map((p,w)=>w%x===0?`<text x="${u+w*y+y/2}" y="${l-8}" text-anchor="middle" fill="${C.muted}" font-size="10">${g(p)}</text>`:"").join("");return`
    <div class="viz-card">
      <div class="viz-title">${g(e)}</div>
      ${Z(s)}
      <svg viewBox="0 0 ${a} ${l}" role="img" aria-label="${g(e)}">
        ${m}
        <line x1="${u}" y1="${h+b}" x2="${a-v}" y2="${h+b}" stroke="${C.baseline}" stroke-width="1"></line>
        ${d}
        ${H}
      </svg>
    </div>`}function _(t){const e=t.rows.slice(0,t.maxRows??10),n=520,s=22,a=120,l=40,c=4,u=c+e.length*s+6,v=n-a-l,h=Math.max(1,...e.map(f=>f.value)),j=e.map((f,b)=>{const k=c+b*s+4,P=f.value/h*v,y=g(f.tip??`${f.label}: ${E(f.value)}`);return`
        <text x="${a-8}" y="${k+11}" text-anchor="end" fill="${C.secondary}" font-size="11">${g(f.label)}</text>
        <path d="${U(a,k,P,s-8)}" fill="${t.color}" data-tip="${y}"></path>
        <text x="${a+P+6}" y="${k+11}" fill="${C.muted}" font-size="10">${E(f.value)}</text>
        <rect x="0" y="${c+b*s}" width="${n}" height="${s}" fill="transparent" data-tip="${y}"></rect>`}).join("");return`
    <div class="viz-card">
      <div class="viz-title">${g(t.title)}</div>
      <svg viewBox="0 0 ${n} ${u}" role="img" aria-label="${g(t.title)}">
        <line x1="${a}" y1="${c}" x2="${a}" y2="${u-4}" stroke="${C.baseline}" stroke-width="1"></line>
        ${j}
      </svg>
    </div>`}function U(t,e,n,s,a=3){return n<=.5?"":(a=Math.min(a,s/2,n),`M${t},${e} L${t+n-a},${e} Q${t+n},${e} ${t+n},${e+a} L${t+n},${e+s-a} Q${t+n},${e+s} ${t+n-a},${e+s} L${t},${e+s} Z`)}function X(t,e,n,s){return`
    <div class="viz-tile">
      <div class="viz-tile-label">${s?`<i class="viz-dot" style="background:${s}"></i>`:""}${g(t)}</div>
      <div class="viz-tile-value">${g(e)}</div>
      <div class="viz-tile-sub">${g(n)}</div>
    </div>`}function Y(){if(document.getElementById("viz-tip"))return;const t=document.createElement("div");t.id="viz-tip",document.body.appendChild(t),document.addEventListener("mousemove",e=>{var s,a;const n=(a=(s=e.target)==null?void 0:s.closest)==null?void 0:a.call(s,"[data-tip]");if(n){t.textContent=n.getAttribute("data-tip"),t.style.display="block";const c=Math.min(e.clientX+12,window.innerWidth-t.offsetWidth-8);t.style.left=`${c}px`,t.style.top=`${e.clientY-t.offsetHeight-10}px`}else t.style.display="none"})}let r=null;const N={rue:"👻 Rue · Vengeance",sybil:"🔮 Sybil · Fortune",poppy:"🌙 Poppy · Sleep",tallow:"🕯️ Tallow · Sacrifice"},tt={energyPerTurn:"Energy per turn",handSize:"Hand size",switchCost:"Switch cost (energy)",dreamsMax:"Dreams cap (Poppy, 0 = uncapped)",grudgePerBenchHit:"Grudge per bench hit (Rue)",tallowBenchHeal:"Tallow bench heal / turn",betweenBattleHeal:"HP healed between battles (the Rest choice)",focusPerTurn:"Enemy Focus per camped turn (+dmg to next attack; switch resets)",dreamShatterPct:"% Dreams lost when Poppy is hit",rewardParticipants:"Card rewards per victory"},et=["attack","aoe","heal","buff","block","windup","hush"];function V(t){return String(t).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function nt(t,e){const n=t.split(".");let s=r;for(;n.length>1;)s=s[n.shift()];s[n[0]]=e,A()}function S(t,e){return`<input type="number" value="${e}" oninput="set('${t}', parseFloat(this.value) || 0)">`}function O(t,e,n){return`<input type="text" ${n?'class="wide-in"':""} value="${V(e)}" oninput="set('${t}', this.value)">`}function st(){return`<div class="ed-section"><h2>Globals</h2>
    <div class="ed-hint">Difficulty levers that apply everywhere. "HP healed between battles" is the big one — it prices the Rest choice.</div>
    <div class="ghost-block"><div class="inline-fields">${Object.entries(r.globals).map(([e,n])=>`<label>${tt[e]||e}${S("globals."+e,n)}</label>`).join("")}</div></div></div>`}function at(){var n;const t={};for(const[s,a]of Object.entries(r.cards))(t[n=a.owner]||(t[n]=[])).push(s);return`<div class="ed-section"><h2>Cards</h2>
    <div class="ed-hint">Edit the numbers, not just the text — the text only describes; the numbers are what the engine uses.</div>
    ${Object.entries(t).map(([s,a])=>{const l=a.map(c=>{const u=r.cards[c],v=Object.entries(u.v).map(([h,j])=>`<label>${h}${S(`cards.${c}.v.${h}`,j)}</label>`).join(" ");return`<tr>
        <td>${O(`cards.${c}.name`,u.name)}</td>
        <td>${S(`cards.${c}.cost`,u.cost)}</td>
        <td><div class="inline-fields">${v||'<span class="ed-hint">—</span>'}</div></td>
        <td>${O(`cards.${c}.text`,u.text,!0)}</td>
        <td>${u.burn?"🔥":""}</td>
      </tr>`}).join("");return`<div class="ghost-block"><h3>${N[s]}</h3>
      <table class="ed">
        <tr><th>Card</th><th>Cost</th><th>Numbers</th><th>Text ({key} placeholders auto-fill)</th><th></th></tr>
        ${l}
      </table></div>`}).join("")}</div>`}function it(){return`<div class="ed-section"><h2>Ghosts — decks & reward pools</h2>
    <div class="ed-hint">Starter deck = copies at run start. Pool weight = how often a card shows up as a post-battle reward.</div>
    <div class="two-col">${Object.keys(r.ghosts).map(e=>{const n=r.ghosts[e],a=Object.keys(r.cards).filter(l=>r.cards[l].owner===e&&!r.cards[l].upgradeOf).map(l=>`
      <tr><td>${r.cards[l].name}</td>
        <td>${S(`ghosts.${e}.deck.${l}`,n.deck[l]||0)}</td>
        <td>${S(`ghosts.${e}.pool.${l}`,n.pool[l]||0)}</td></tr>`).join("");return`<div class="ghost-block"><h3>${N[e]}</h3>
      <div class="inline-fields"><label>Max HP${S(`ghosts.${e}.hp`,n.hp)}</label></div>
      <table class="ed">
        <tr><th>Card</th><th>Copies in starter deck</th><th>Weight in reward pool (0 = never offered)</th></tr>
        ${a}
      </table></div>`}).join("")}</div></div>`}function rt(){return`<div class="ed-section"><h2>Enemies</h2>${r.ladder.map(e=>{const n=r.enemies[e],s=n.pattern.map((a,l)=>`
      <div class="step-row">
        <span class="idx">${l+1}.</span>
        ${O(`enemies.${e}.pattern.${l}.name`,a.name)}
        <select oninput="set('enemies.${e}.pattern.${l}.kind', this.value)">
          ${et.map(c=>`<option value="${c}" ${a.kind===c?"selected":""}>${c}</option>`).join("")}
        </select>
        <label>amount${S(`enemies.${e}.pattern.${l}.amount`,a.amount||0)}</label>
        <label>+str${S(`enemies.${e}.pattern.${l}.buff`,a.buff||0)}</label>
        <button class="mini-btn" onclick="rmStep('${e}', ${l})">✕</button>
      </div>`).join("");return`<div class="enemy-block"><h3>${n.sprite} ${n.name}${n.boss?" (BOSS)":""}</h3>
      <div class="inline-fields">
        <label>HP${S(`enemies.${e}.hp`,n.hp)}</label>
        <label>Name${O(`enemies.${e}.name`,n.name)}</label>
      </div>
      <div class="sub">Pattern (loops; "amount" is damage/heal/block, "+str" is a strength gain riding along on heals)</div>
      ${s}
      <button class="mini-btn" onclick="addStep('${e}')">+ add step</button>
    </div>`}).join("")}</div>`}function ot(t){r.enemies[t].pattern.push({kind:"attack",amount:5,name:"New Move"}),A(),L()}function lt(t,e){r.enemies[t].pattern.length<=1||(r.enemies[t].pattern.splice(e,1),A(),L())}const $={report:null,running:!1,error:"",cfg:{runs:1e3,seed:1}};function ct(t,e){$.cfg[t]=parseInt(e,10)||(t==="runs"?1e3:1)}async function dt(){if(!$.running){$.running=!0,$.error="",L();try{const t=await fetch("/api/sim/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runs:$.cfg.runs,seed:$.cfg.seed})}),e=await t.json();if(!t.ok||e.ok===!1)throw new Error(e.error||`HTTP ${t.status}`);$.report=e}catch(t){$.error=String((t==null?void 0:t.message)||t)}$.running=!1,L()}}async function ut(){try{const t=await fetch("/api/sim/latest");t.ok&&($.report=await t.json(),L())}catch{}}function mt(t){const e=Math.round((Date.now()/1e3-t)/60);return e<1?"just now":e<60?`${e} min ago`:e<1440?`${Math.round(e/60)} h ago`:`${Math.round(e/1440)} d ago`}function $t(t){if(!t.length)return 0;const e=[...t].sort((n,s)=>n-s);return e[Math.floor(e.length/2)]}function T(t,e){const n=t.meta.policies.indexOf(e);return G[Math.max(0,n)%G.length]}function Q(t,e){var a;const n=(a=r==null?void 0:r.cards)==null?void 0:a[t];if(!n)return`${t}: ${e}`;const s=String(n.text).replace(/\{(\w+)\}/g,(l,c)=>{var u;return((u=n.v)==null?void 0:u[c])??`{${c}}`});return[`${n.name} — ⚡${n.cost}${n.burn?" · 🔥 Burn":""}`,s,N[n.owner]??n.owner,`Picked ${e}×`].join(`
`)}function ht(){const t=$.report;if(!t)return'<div class="ed-hint">No sim results yet — hit Run Sim.</div>';const e=t.meta.policies.filter(i=>t.summary[i]),n=t.meta.ladder.length,s=e.map(i=>{const o=t.summary[i],d=t.runs.filter(m=>m.policy===i).map(m=>m.totalTurns);return X(i,`${(o.winRate*100).toFixed(1)}%`,`win rate · ${o.runs} runs · median ${$t(d)} turns`,T(t,i))}).join(""),a=Array.from({length:n+1},(i,o)=>o===n?`${o} (win)`:String(o)),l=z({title:"Stages cleared per run",categories:a,series:e.map(i=>({name:i,color:T(t,i),values:t.summary[i].stageReached}))}),c=e.flatMap(i=>Object.keys(t.summary[i].turnsHist).map(Number)),u=Math.max(10,...c),v=Math.max(5,Math.ceil(u/12/5)*5),h=Math.ceil((u+1)/v),j=Array.from({length:h},(i,o)=>`${o*v}–${(o+1)*v-1}`),f=z({title:"Total run length (turns)",categories:j,series:e.map(i=>{const o=new Array(h).fill(0);for(const[d,m]of Object.entries(t.summary[i].turnsHist))o[Math.min(h-1,Math.floor(Number(d)/v))]+=m;return{name:i,color:T(t,i),values:o}})}),b=t.meta.ladder.map((i,o)=>{var d,m;return`${o+1}. ${((m=(d=r==null?void 0:r.enemies)==null?void 0:d[i])==null?void 0:m.name)??i}`}),k=z({title:"Avg battle length per stage (turns)",categories:b,series:e.map(i=>({name:i,color:T(t,i),values:t.meta.ladder.map((o,d)=>t.summary[i].avgTurnsPerStage[d]??0)}))}),P=z({title:"Avg damage taken per stage",categories:b,series:e.map(i=>({name:i,color:T(t,i),values:t.meta.ladder.map((o,d)=>t.summary[i].avgDamageTakenPerStage[d]??0)}))}),y=e.map(i=>{const o=Object.entries(t.summary[i].cardPicks).map(([d,m])=>{var x,H;return{label:((H=(x=r==null?void 0:r.cards)==null?void 0:x[d])==null?void 0:H.name)??d,value:m,tip:Q(d,m)}}).sort((d,m)=>m.value-d.value);return o.length?_({title:`Top card picks — ${i}`,rows:o,color:T(t,i),maxRows:10}):""}).join(""),M=e.map(i=>{const o=t.summary[i];if(!o.upgradePicks)return"";const d=Object.entries(o.upgradePicks).map(([m,x])=>{var H,p;return{label:((p=(H=r==null?void 0:r.cards)==null?void 0:H[m])==null?void 0:p.name)??m,value:x,tip:Q(m,x)}}).sort((m,x)=>x.value-m.value);return d.length?_({title:`Rest upgrades — ${i} (chose heal ×${o.restMends})`,rows:d,color:T(t,i),maxRows:10}):""}).join("");return`
    <div class="viz-meta">Results from ${mt(t.meta.timestamp)} · ${t.meta.runsPerPolicy} runs/policy ·
      seed ${t.meta.seed} · balance ${t.meta.balanceHash.slice(0,8)}</div>
    <div class="viz-tiles">${s}</div>
    <div class="viz-grid">${l}${f}${k}${P}${y}${M}</div>`}function pt(){return`<div class="ed-section"><h2>Balance Sim</h2>
    <div class="ed-hint">Full-run simulations (drafting included) with random and greedy AIs.
      Save your tuning first — the sim reads balance.json from disk. First run may compile the simulator.</div>
    <div class="sim-controls">
      <label>Runs / policy <input type="number" value="${$.cfg.runs}" oninput="simSet('runs', this.value)" style="width:80px"></label>
      <label>Seed <input type="number" value="${$.cfg.seed}" oninput="simSet('seed', this.value)" style="width:80px"></label>
      <button class="primary" onclick="runSim()" ${$.running?"disabled":""}>${$.running?"Running…":"▶ Run Sim"}</button>
      ${$.error?`<span class="ed-status err">${V($.error)}</span>`:""}
    </div>
    ${ht()}
  </div>`}let I=!1;function A(){I=!0;const t=document.getElementById("ed-status");t&&(t.textContent="unsaved changes",t.className="ed-status err")}async function q(){const t=await fetch("/api/balance",{method:"POST",body:JSON.stringify(r,null,2)}),e=document.getElementById("ed-status");t.ok?(I=!1,e.textContent="saved ✓",e.className="ed-status"):(e.textContent="save failed",e.className="ed-status err")}async function gt(){confirm("Reset ALL tuning to the shipped defaults?")&&(r=await(await fetch("balance.defaults.json?nocache="+Date.now())).json(),await q(),L())}function L(){document.getElementById("editor").innerHTML=`
    <div class="ed-topbar">
      <h1>⚙️ GHOSTFIGHT TUNING</h1>
      <span class="ed-status" id="ed-status">${I?"unsaved changes":"loaded"}</span>
      <button class="primary" onclick="save()">Save</button>
      <button onclick="resetDefaults()">Reset to defaults</button>
      <button onclick="location.href='/'">▶ Play</button>
    </div>
    <div class="ed-hint">Changes apply to the next page-load of the game (a new run picks them up automatically). Playthrough logs land in <b>logs/*.jsonl</b> — point Claude at them for tuning analysis.</div>
    ${pt()}
    ${st()}
    ${rt()}
    ${it()}
    ${at()}
  `}Object.assign(window,{set:nt,save:q,resetDefaults:gt,addStep:ot,rmStep:lt,simSet:ct,runSim:dt});(async()=>(r=await(await fetch("/api/balance")).json(),L(),Y(),ut()))();
