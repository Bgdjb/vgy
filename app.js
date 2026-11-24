'use strict';
const $=(s,e=document)=>e.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const today=()=>new Date().toLocaleDateString('en-CA'),uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const shuf=a=>a.map(x=>[Math.random(),x]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
const IDB={db:null,open(){return new Promise((r,j)=>{const q=indexedDB.open('memo3',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{this.db=q.result;r()};q.onerror=()=>j(q.error)})},
get(k){return new Promise(r=>{const q=this.db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result);q.onerror=()=>r()})},
set(k,v){return new Promise(r=>{const t=this.db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=r;t.onerror=r})}};
const DEF=()=>({v:3,words:{},mistakes:[],tasks:[],sessions:[],lessons:[],custom:[],notes:[],hist:[],set:{theme:'dark',focus:25,short:5,long:15,every:4},chat:[]});
let S,D=[],tab='home',sub={},TM={mode:'focus',left:25*60,end:0,run:false,count:0,task:''};
const save=()=>IDB.set('state',S);
const all=()=>D.concat(S.custom),byId=id=>all().find(e=>e.id===id);
const AR=/[\u0600-\u06FF]/;
function find(q){q=q.trim().toLowerCase();if(!q)return[];const r=[];for(const e of all()){const en=e.en.toLowerCase();let s=0;
if(en===q)s=3;else if(en.startsWith(q))s=2;else if(AR.test(q)&&e.ar.some(a=>a.includes(q)))s=2;else if(!AR.test(q)&&q.length>2&&en.includes(q))s=1;if(s)r.push([s,e])}
return r.sort((a,b)=>b[0]-a[0]).slice(0,30).map(x=>x[1])}
/* ===== SRS ===== */
const IV=[0,1,2,4,8,16,32];
function grade(id,ok){const w=S.words[id];if(!w)return;if(ok){w.ok++;w.box=Math.min(w.box+1,6)}else{w.bad++;w.box=0}
w.due=w.box?Date.now()+IV[w.box]*864e5:Date.now()+6e5;w.last=today()}
const due=()=>Object.keys(S.words).filter(id=>S.words[id].due<=Date.now()&&byId(id));
function learn(id,lesson){if(!S.words[id])S.words[id]={box:0,due:Date.now(),ok:0,bad:0,fav:false,lesson:lesson||null,added:today()};else if(lesson)S.words[id].lesson=lesson}
function addMistake(w,q,given,correct,why){S.mistakes.push({id:uid('m'),wordId:w,q,given,correct,why,date:today(),rev:false})}
/* ===== UI helpers ===== */
const card=e=>{const w=S.words[e.id];return`<div class=card><div class=row><b class=en>${esc(e.en)}</b><span class=tag>${esc(e.pos||'')}</span></div><div>${esc(e.ar.join('، '))}</div>
${e.ex?`<p class=ex dir=ltr>${esc(e.ex)}<br><small dir=rtl>${esc(e.exAr||'')}</small></p>`:''}
${e.syn?.length?`<small>مرادفات: ${esc(e.syn.join(', '))} </small>`:''}${e.ant?.length?`<small>أضداد: ${esc(e.ant.join(', '))}</small>`:''}
<div class=row><button class=s data-act=fav data-id="${e.id}">${w?.fav?'⭐':'☆'} مفضلة</button><button class=s data-act=learn data-id="${e.id}">${w?'✔ في المراجعة':'➕ ذاكرها'}</button><button class=s data-act=speak data-id="${e.id}">🔊</button></div></div>`};
const TABS=[['home','🏠','الرئيسية'],['chat','💬','المساعد'],['dict','📖','القاموس'],['study','🧠','مراجعة'],['plan','⏱️','المذاكرة'],['more','☰','المزيد']];
const go=t=>{tab=t;render()};
/* ===== views ===== */
const V={
home(){const n=due().length,tk=S.tasks.filter(t=>!t.done).sort((a,b)=>b.prio-a.prio||a.min-b.min)[0],fm=focusToday();
return`<div class=card><h3>أهلًا بيك 👋</h3><p class=m>${tk?'مهمتك الحالية: <b>'+esc(tk.title)+'</b>':'مفيش مهمة لسه. ضيف مهمة صغيرة وابدأ.'}</p>
<div class=row><button class=g data-act=fm>ابدأ تركيز</button><button class="s g" data-go=plan>خطة اليوم</button></div></div>
<div class=card><b>مراجعات مستحقة: ${n}</b><p class=m>${n?'خد جولة قصيرة، بالراحة.':'مفيش مراجعات دلوقتي، كفاية كده 👌'}</p><div class=row><button class=g data-go=study>راجع</button><button class="s g" data-go=chat>اسأل المساعد</button></div></div>
<div class=card>تركيز النهارده: <b>${fm}</b> دقيقة · كلمات في المراجعة: <b>${Object.keys(S.words).length}</b></div>`},
chat(){return`<div id=cl>${S.chat.slice(-12).map(m=>`<div class="msg ${m.r}">${m.t}</div>`).join('')||'<div class="msg b">اسأل عن كلمة، أو اكتب «الفرق بين big و large»، أو «اختبرني»، أو «اعمللي خطة».<br><small>مساعد محلي بيعتمد على القاموس، مش ذكاء اصطناعي خارجي.</small></div>'}</div>
<div class=row><input class=g id=ci placeholder="اكتب سؤالك..."><button data-act=ask>إرسال</button></div>`},
dict(){const q=sub.q||'',r=find(q);return`<input id=dq value="${esc(q)}" placeholder="ابحث بالعربي أو الإنجليزي"><div class=row><button class=s data-act=favs>⭐ المفضلة</button><button class=s data-act=addw>+ كلمة جديدة</button></div>
${(sub.favs?all().filter(e=>S.words[e.id]?.fav):r).map(card).join('')||'<p class=m>مفيش نتائج.</p>'}<p class=m>${all().length} كلمة في القاموس حاليًا.</p>`},
study(){const s=sub.study;if(s?.qs)return quizView(s);const d=due();
if(s?.fc!=null){const id=d[0];if(!id)return`<div class=card>خلصت المراجعات المستحقة 🎉</div><button data-act=back>رجوع</button>`;const e=byId(id);
return`<div class=card><p class=m>متبقي ${d.length}</p><div class=en>${esc(e.en)}</div>${s.show?`<p>${esc(e.ar.join('، '))}</p><p class=ex dir=ltr>${esc(e.ex||'')}</p><div class=row><button class="bad g" data-act=grade data-v=0 data-id="${id}">لسه</button><button class="ok g" data-act=grade data-v=1 data-id="${id}">عرفتها</button></div>`:'<button data-act=show>اعرض المعنى</button>'}</div>`}
const mist=S.mistakes.filter(m=>!m.rev);
return`<div class=card><b>مراجعة الكلمات (${d.length} مستحقة)</b><div class=row><button class=g data-act=fc>بطاقات</button></div></div>
<div class=card><b>اختبار</b><p class=m>من الكلمات اللي ذاكرتها بس.</p><div class=row><button class=g data-act=quiz data-k=w>اختبر كلماتي</button><button class="s g" data-act=quiz data-k=m>من أخطائي</button><button class="s g" data-act=quiz data-k=g>قاموس عام</button></div></div>
<div class=card><b>دفتر الأخطاء (${mist.length})</b>${mist.slice(-8).reverse().map(m=>`<p><b dir=ltr>${esc(m.q)}</b><br>إجابتك: ${esc(m.given)} ← الصح: ${esc(m.correct)}<br><small>${esc(m.why)} · ${m.date}</small> <button class=s data-act=mrev data-id="${m.id}">تمت المراجعة</button></p>`).join('')||'<p class=m>فاضي، ممتاز.</p>'}</div>`},
plan(){const tk=S.tasks.slice().sort((a,b)=>a.done-b.done||b.prio-a.prio||a.min-b.min),n=due().length;
return`<div class=card><div class=big id=tm>${fmt(TM.left)}</div><p class=m style="text-align:center">${TM.mode==='focus'?'تركيز':'راحة'} · جلسات: ${TM.count}</p>
<select id=tsel><option value="">بدون ربط</option>${S.tasks.filter(t=>!t.done).map(t=>`<option value="${t.id}" ${TM.task===t.id?'selected':''}>${esc(t.title)}</option>`).join('')}</select>
<div class=row><button class=g data-act=tgl>${TM.run?'إيقاف مؤقت':'ابدأ'}</button><button class="s g" data-act=rst>إعادة</button><button class="s g" data-act=fm>وضع التركيز</button></div></div>
<div class=card><b>مهمة جديدة</b><input id=tt placeholder="العنوان (مثلًا: درس Unit 1)"><div class=row><input class=g id=ts placeholder="المادة"><input class=g id=tmin type=number value=30 min=5></div>
<div class=row><select class=g id=tp><option value=2>أولوية عالية</option><option value=1 selected>متوسطة</option><option value=0>منخفضة</option></select><select class=g id=ty><option>فهم</option><option>حفظ</option><option>حل مسائل</option><option>كلمات</option><option>قراءة/كتابة</option></select></div>
<div class=row><button class=g data-act=addt>إضافة</button>${n?`<button class="s g" data-act=addrev>راجع ${n} كلمة (~${Math.ceil(n*.5)} د)</button>`:''}</div></div>
${tk.map(t=>`<div class=card><div class=row><input type=checkbox style="width:24px" data-act=td data-id="${t.id}" ${t.done?'checked':''}><span class=g ${t.done?'style="text-decoration:line-through;opacity:.6"':''}>${esc(t.title)} <small>${esc(t.subject||'')} · ${t.min}د · ${t.type}</small></span><button class=s data-act=tdel data-id="${t.id}">🗑</button></div>${t.done?'':`<small>الطريقة المقترحة: ${esc(COACH[t.type]?.[0]||'')}</small>`}</div>`).join('')||'<p class=m>مفيش مهام. لو اتأخرت في حاجة مفيش مشكلة، رتّبها تاني براحتك.</p>'}`},
more(){const st=S.set;return`<div class=card><b>إحصائياتي</b>${stats()}</div>
<div class=card><b>دروسي (قارئ الكلمات)</b>${S.lessons.map(l=>`<p><a href="#" data-act=openl data-id="${l.id}" class=w>${esc(l.title)}</a> <small>${esc(l.subject||'')}</small></p>`).join('')||'<p class=m>الصق نص درس إنجليزي واضغط على أي كلمة.</p>'}<button class=s data-act=newl>+ درس جديد</button></div>
<div class=card><b>كيف أذاكر؟</b>${Object.entries(COACH).map(([k,v])=>`<p><b>${k}:</b> ${esc(v[0])}<br><small>${esc(v[1])}</small></p>`).join('')}</div>
<div class=card><b>ركن الهدوء</b><div class=breath></div><p class=m style="text-align:center">شهيق 4 ثواني · احبس 4 · زفير 6. كرره 5 مرات.</p><p class=m>💧 اشرب مية · 🚶 قوم اتحرك دقيقة · 👀 بصّ بعيد عن الشاشة. (ده تنظيم عام مش علاج.)</p>
<textarea id=nt placeholder="إيه اللي شاغل بالك؟"></textarea><button class=s data-act=note>احفظ</button><small> ${S.notes.length} ملاحظة محفوظة</small></div>
<div class=card><b>الإعدادات</b><div class=row><button class=s data-act=theme>الوضع: ${st.theme==='dark'?'داكن':'فاتح'}</button></div>
<div class=row><label class=g>تركيز <input id=sf type=number value=${st.focus}></label><label class=g>راحة <input id=ss type=number value=${st.short}></label><label class=g>طويلة <input id=sl type=number value=${st.long}></label></div><button class=s data-act=setsave>حفظ</button></div>
<div class=card><b>نسخة احتياطية</b><p class=m>كل بياناتك محلية على جهازك.</p><div class=row><button class=g data-act=exp>تصدير</button><label class="btn s g" style="text-align:center">استعادة<input type=file id=imp accept=.json hidden></label></div></div>`}};
const COACH={'حفظ':['Active Recall + تكرار متباعد: غطّي الإجابة وحاولي تفتكريها قبل ما تشوفي.','مثال: اقفل القاموس واكتب معاني 10 كلمات من ذاكرتك.'],
'فهم':['تقنية فاينمان: اشرح الدرس بكلامك كأنك بتعلّم حد.','مثال: اشرح قاعدة Present Perfect بصوت عالي في دقيقتين.'],
'حل مسائل':['حل بدون ما تبص على الحل، وبعدين قارن وسجّل الغلطات في دفتر الأخطاء.','ابدأ بمسألة سهلة عشان تسخّن.'],
'كلمات':['جمل قصيرة بالكلمة + مراجعة في المراجعات المستحقة كل يوم.','5-10 كلمات في اليوم أحسن من 50 مرة واحدة.'],
'قراءة/كتابة':['اقرأ فقرة، علّم الكلمات الصعبة، ولخّص في 3 جمل.','استخدم Pomodoro 25/5.']};
const focusToday=()=>S.sessions.filter(x=>x.date===today()).reduce((a,x)=>a+x.min,0);
function stats(){const days=[...Array(7)].map((_,i)=>{const d=new Date(Date.now()-(6-i)*864e5).toLocaleDateString('en-CA');return S.sessions.filter(x=>x.date===d).reduce((a,x)=>a+x.min,0)}),mx=Math.max(...days,1),ws=Object.values(S.words),
q=S.hist.reduce((a,h)=>[a[0]+h.score,a[1]+h.n],[0,0]),bad=Object.entries(S.words).filter(([,w])=>w.bad>=2).map(([id])=>byId(id)?.en).filter(Boolean);
return`<div class=bars>${days.map(d=>`<i style="height:${d/mx*100}%" title="${d}"></i>`).join('')}</div><small>دقائق التركيز آخر 7 أيام</small>
<p>جلسات: ${S.sessions.length} · مهام مكتملة: ${S.tasks.filter(t=>t.done).length}<br>كلمات تتذاكر: ${ws.length} · متقنة: ${ws.filter(w=>w.box>=4).length} · محتاجة مراجعة: ${due().length}<br>دقة الاختبارات: ${q[1]?Math.round(q[0]/q[1]*100)+'%':'—'}<br>كلمات بتغلط فيها: ${esc(bad.join('، ')||'—')}</p>`}
/* ===== quiz ===== */
function buildQuiz(k){let ids=k==='m'?[...new Set(S.mistakes.filter(m=>!m.rev).map(m=>m.wordId))]:k==='g'?all().map(e=>e.id):Object.keys(S.words);ids=shuf(ids.filter(byId)).slice(0,10);
return ids.map(id=>{const e=byId(id),c=e.ar[0],o=shuf([...new Set(shuf(all().filter(x=>x.id!==id)).map(x=>x.ar[0]))].filter(a=>a!==c).slice(0,3).concat(c));return{id,q:e.en,o,c}})}
function quizView(s){if(s.i>=s.qs.length)return`<div class=card><h3>النتيجة: ${s.score}/${s.qs.length}</h3><p class=m>${s.score===s.qs.length?'ممتاز!':'كل غلطة اتسجلت في دفتر الأخطاء عشان تراجعها.'}</p><button data-act=back>رجوع</button></div>`;
const q=s.qs[s.i];return`<div class=card><p class=m>${s.i+1}/${s.qs.length}</p><div class=en>${esc(q.q)}</div>${q.o.map((o,i)=>`<button class="opt ${s.a!=null?(o===q.c?'ok':i===s.a?'bad':''):''}" data-act=ans data-v="${i}">${esc(o)}</button>`).join('')}${s.a!=null?`<button data-act=nxt>التالي</button>`:''}</div>`}
/* ===== assistant (local) ===== */
function ask(t){const r=[],q=t.trim();let m;
if(/اختبر|quiz/i.test(q)){sub.study={qs:buildQuiz(Object.keys(S.words).length?'w':'g'),i:0,score:0,a:null};tab='study';return null}
if(/خطة|جدول|ذاكر لي|اعملل?ي/.test(q)){const n=due().length;return`نوع الطلب: تنظيم مذاكرة.<br>عندك ${n} مراجعة مستحقة. افتح «المذاكرة» وضيف مهام، وأنا هرتبها بالأولوية والوقت.`}
if(m=q.match(/(?:الفرق بين|difference between)\s+(.+?)\s+(?:و|and)\s+(.+)/i)){const a=find(m[1])[0],b=find(m[2])[0];
return`نوع الطلب: مقارنة.<br>`+(a&&b?[a,b].map(e=>`<b dir=ltr>${esc(e.en)}</b>: ${esc(e.ar.join('، '))}<br><small dir=ltr>${esc(e.ex||'')}</small>`).join('<hr>')+'<br><small>الفرق الدقيق في الاستخدام مش موجود في القاموس المحلي لسه.</small>':'واحدة منهم مش في القاموس المحلي.')}
if(/لخص/.test(q)){const s=q.replace(/.*لخص/,'').split(/(?<=[.!?])\s+/).filter(x=>x.length>20);return s.length?'نوع الطلب: تلخيص.<br>'+esc(s.slice(0,2).join(' ')):'الصق النص بعد كلمة «لخص».'}
const words=q.split(/[\s،,؟?.!]+/).filter(w=>w.length>1),hits=[...new Set(words.flatMap(w=>find(w).slice(0,2)))].slice(0,3);
if(hits.length)return'نوع الطلب: سؤال عن كلمة.<br>'+hits.map(e=>`<b dir=ltr>${esc(e.en)}</b> (${esc(e.pos)}): ${esc(e.ar.join('، '))}<br><small dir=ltr>${esc(e.ex||'')}</small>`).join('<hr>')+'<br><small>فتحهم في القاموس وضيفهم للمراجعة.</small>';
return'مش لاقي إجابة في المحتوى المحلي. جرّب كلمة محددة، أو ضيف الدرس من «المزيد».'}
/* ===== timer ===== */
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
const dur=m=>(m==='focus'?S.set.focus:m==='short'?S.set.short:S.set.long)*60;
setInterval(()=>{if(!TM.run)return;TM.left=Math.max(0,Math.round((TM.end-Date.now())/1000));const e=$('#tm');if(e)e.textContent=fmt(TM.left);const f=$('#ft');if(f)f.textContent=fmt(TM.left);
if(TM.left<=0){TM.run=false;navigator.vibrate?.(300);if(TM.mode==='focus'){TM.count++;S.sessions.push({date:today(),min:S.set.focus,task:TM.task});TM.mode=TM.count%S.set.every?'short':'long'}else TM.mode='focus';TM.left=dur(TM.mode);save();render()}},500);
function fmView(){const t=S.tasks.find(x=>x.id===TM.task);$('#fm').hidden=!sub.fm;if(sub.fm)$('#fm').innerHTML=`<p class=m>${TM.mode==='focus'?'ركّز، خطوة واحدة بس':'خد راحة'}</p><h2>${esc(t?.title||'جلسة تركيز')}</h2><div class=big id=ft>${fmt(TM.left)}</div><div class=row style="justify-content:center"><button data-act=tgl>${TM.run?'إيقاف':'ابدأ'}</button><button class=s data-act=fm>خروج</button></div><p class=m>أنت بتعمل كويس 💜</p>`}
/* ===== events ===== */
function modal(h){const m=$('#modal');m.hidden=!h;m.innerHTML=h?h+'<button class=s data-act=close>إغلاق</button>':''}
document.addEventListener('click',async ev=>{const el=ev.target.closest('[data-act],[data-go]');if(!el)return;if(el.dataset.go)return go(el.dataset.go);const a=el.dataset.act,id=el.dataset.id;let re=true;
if(a==='fav'){learn(id);S.words[id].fav=!S.words[id].fav}
else if(a==='learn')learn(id,sub.lesson);
else if(a==='speak'){const u=new SpeechSynthesisUtterance(byId(id).en);u.lang='en-US';speechSynthesis.speak(u);re=false}
else if(a==='favs')sub.favs=!sub.favs;
else if(a==='addw'){const en=prompt('الكلمة بالإنجليزي'),ar=en&&prompt('المعنى بالعربي');if(en&&ar&&!find(en).some(e=>e.en.toLowerCase()===en.toLowerCase()))S.custom.push({id:'c_'+en.toLowerCase().trim().replace(/\s+/g,'_'),en:en.trim(),pos:'',ar:[ar.trim()],src:'أضافها الطالب'})}
else if(a==='ask'){const i=$('#ci'),t=i.value.trim();if(!t)return;S.chat.push({r:'u',t:esc(t)});const r=ask(t);if(r)S.chat.push({r:'b',t:r})}
else if(a==='fc')sub.study={fc:1};else if(a==='show')sub.study.show=1;else if(a==='back')sub.study=null;
else if(a==='grade'){const e=byId(id),ok=el.dataset.v==='1';grade(id,ok);if(!ok)addMistake(id,e.en,'لم أتذكرها',e.ar[0],'نسيان في المراجعة');sub.study.show=0}
else if(a==='quiz'){const qs=buildQuiz(el.dataset.k);if(!qs.length){alert('مفيش كلمات كفاية. ضيف كلمات للمراجعة الأول أو جرّب القاموس العام.');return}sub.study={qs,i:0,score:0,a:null}}
else if(a==='ans'&&sub.study.a==null){const s=sub.study,q=s.qs[s.i],i=+el.dataset.v;s.a=i;if(q.o[i]===q.c){s.score++;if(S.words[q.id])grade(q.id,true)}else{learn(q.id);grade(q.id,false);addMistake(q.id,q.q,q.o[i],q.c,'اختيار خاطئ لمعنى الكلمة')}}
else if(a==='nxt'){const s=sub.study;s.i++;s.a=null;if(s.i>=s.qs.length)S.hist.push({date:today(),score:s.score,n:s.qs.length})}
else if(a==='mrev'){S.mistakes.find(m=>m.id===id).rev=true}
else if(a==='addt'){const t=$('#tt').value.trim();if(!t)return;S.tasks.push({id:uid('t'),title:t,subject:$('#ts').value,min:+$('#tmin').value||30,prio:+$('#tp').value,type:$('#ty').value,done:false})}
else if(a==='addrev'){const n=due().length;S.tasks.push({id:uid('t'),title:`مراجعة ${n} كلمة`,subject:'إنجليزي',min:Math.ceil(n*.5),prio:2,type:'كلمات',done:false})}
else if(a==='td'){const t=S.tasks.find(x=>x.id===id);t.done=!t.done}else if(a==='tdel')S.tasks=S.tasks.filter(x=>x.id!==id);
else if(a==='tgl'){TM.run=!TM.run;TM.task=$('#tsel')?.value??TM.task;if(TM.run)TM.end=Date.now()+TM.left*1e3}
else if(a==='rst'){TM.run=false;TM.left=dur(TM.mode)}else if(a==='fm')sub.fm=!sub.fm;
else if(a==='theme'){S.set.theme=S.set.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=S.set.theme}
else if(a==='setsave'){S.set.focus=+$('#sf').value||25;S.set.short=+$('#ss').value||5;S.set.long=+$('#sl').value||15;TM.left=dur(TM.mode)}
else if(a==='note'){const v=$('#nt').value.trim();if(v)S.notes.push({date:today(),t:v})}
else if(a==='newl'){const t=prompt('عنوان الدرس'),x=t&&prompt('الصق النص الإنجليزي');if(t&&x)S.lessons.push({id:uid('l'),title:t,subject:'',text:x})}
else if(a==='openl'){ev.preventDefault();const l=S.lessons.find(x=>x.id===id);sub.lesson=id;modal(`<h3>${esc(l.title)}</h3><p dir=ltr style="line-height:2">${l.text.split(/(\b[A-Za-z']+\b)/).map(p=>/^[A-Za-z']+$/.test(p)?`<span class=w data-act=lw data-id="${esc(p)}">${esc(p)}</span>`:esc(p)).join('')}</p>`);re=false}
else if(a==='lw'){const r=find(id).find(e=>e.en.toLowerCase()===id.toLowerCase());modal((r?card(r):`<div class=card>«${esc(id)}» مش في القاموس. أضفه من تبويب القاموس.</div>`)+'<button class=s data-act=openl data-id="'+sub.lesson+'">⬅ رجوع للدرس</button>');re=false}
else if(a==='close'){modal(null);re=true}
else if(a==='exp'){const b=new Blob([JSON.stringify(S)],{type:'application/json'}),u=document.createElement('a');u.href=URL.createObjectURL(b);u.download='memo3-backup-'+today()+'.json';u.click();re=false}
if(a==='fav'||a==='learn'){if($('#modal')&&!$('#modal').hidden){const e=byId(id);modal(card(e));re=false}}
await save();if(re)render()});
document.addEventListener('change',async ev=>{if(ev.target.id==='imp'){try{const d=JSON.parse(await ev.target.files[0].text());if(!d.words||!Array.isArray(d.tasks))throw 0;await IDB.set('prev',S);S=Object.assign(DEF(),d);await save();render();alert('تمت الاستعادة (النسخة القديمة محفوظة داخليًا).')}catch{alert('ملف غير صالح')}}});
document.addEventListener('input',ev=>{if(ev.target.id==='dq'){sub.q=ev.target.value;sub.favs=false;const p=ev.target.selectionStart;render();const i=$('#dq');i.focus();i.setSelectionRange(p,p)}});
document.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.id==='ci')$('[data-act=ask]').click()});
function render(){$('#view').innerHTML=V[tab]();$('#nav').innerHTML=TABS.map(t=>`<button class="${t[0]===tab?'on':''}" data-go=${t[0]}><span>${t[1]}</span>${t[2]}</button>`).join('');fmView();const c=$('#cl');if(c)c.scrollTop=c.scrollHeight}
(async()=>{await IDB.open();S=Object.assign(DEF(),await IDB.get('state')||{});S.set=Object.assign(DEF().set,S.set);
try{D=await (await fetch('data/dictionary.json')).json()}catch{D=[]}
document.documentElement.dataset.theme=S.set.theme;TM.left=dur('focus');$('#net').textContent=navigator.onLine?'':'بدون إنترنت ✔';
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});render()})();
