(() => {
  const root = document.documentElement;
  const theme = document.getElementById('theme');
  // file:// 下，浏览器可能限制存储；当前页交互不依赖存储成功。
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const savedTheme = read('xenogears-theme');
  if (['auto', 'light', 'dark'].includes(savedTheme)) theme.value = savedTheme;
  const applyTheme = () => {
    if (theme.value === 'auto') delete root.dataset.theme;
    else root.dataset.theme = theme.value;
    write('xenogears-theme', theme.value);
  };
  applyTheme();
  theme.addEventListener('change', applyTheme);

  const imageCatalog = JSON.parse(document.getElementById('image-catalog').textContent);
  const characterCatalog = JSON.parse(document.getElementById('character-catalog').textContent);
  const termCatalog = JSON.parse(document.getElementById('term-catalog').textContent);
  const entrySelector = '[data-character],[data-term]';
  const view = document.getElementById('reading-view');
  const savedView = read('xenogears-view');
  if (['first','second'].includes(savedView)) view.value=savedView;
  root.dataset.view=view.value;
  const imageDialog = document.getElementById('image-dialog');
  const imageFull = document.getElementById('image-full');
  let imageTrigger;
  let previousOverflow = '';
  function openImage(id,trigger,key) {
    hideCharacter();
    const item = imageCatalog[id];
    imageTrigger = trigger;
    imageFull.src = item.src;
    imageFull.alt = item.name;
    imageFull.className = item.kind === '人物' && item.id !== 'abel' ? 'portrait' : '';
    document.getElementById('image-title').textContent = item.name;
    document.getElementById('image-kind').textContent = item.kind;
    const bio=characterCatalog.chapters[key]?.people[id] || termCatalog.chapters[key]?.terms[id];
    document.getElementById('image-description').textContent = view.value==='first' ? bio ? `${bio.identity} ${bio.now}` : item.firstCaption || item.caption : item.caption;
    const source = document.getElementById('image-source');
    source.href = item.source;
    source.textContent = item.sourceLabel;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    imageDialog.showModal();
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-image]');
    if (!trigger) return;
    event.preventDefault();
    const key=trigger.closest('.chapter-block')?.dataset.chapter;
    openImage(trigger.dataset.image,trigger,key);
  });
  document.getElementById('image-close').addEventListener('click', () => imageDialog.close());
  imageDialog.addEventListener('click', event => {
    if (event.target === imageDialog) imageDialog.close();
  });
  imageDialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    imageTrigger.focus({ preventScroll: true });
  });

  const characterCard=document.getElementById('character-card');
  const portrait=document.getElementById('character-portrait');
  const picture=document.getElementById('character-picture');
  let characterTrigger=null;
  let hideTimer;
  function entryFor(trigger){
    const isTerm=!!trigger.dataset.term;
    const catalog=isTerm?termCatalog:characterCatalog;
    const entry=(isTerm?catalog.terms:catalog.characters)[trigger.dataset.term||trigger.dataset.character];
    const chapter=catalog.chapters[trigger.dataset.chapter];
    return {entry,chapter,bio:(isTerm?chapter.terms:chapter.people)[entry.id],isTerm};
  }
  function hideCharacter(){
    clearTimeout(hideTimer);
    if(characterCard.matches(':popover-open')) characterCard.hidePopover();
    characterTrigger?.setAttribute('aria-expanded','false');
  }
  function showCharacter(trigger){
    clearTimeout(hideTimer);
    if(characterTrigger!==trigger)characterTrigger?.setAttribute('aria-expanded','false');
    characterTrigger=trigger;
    const {entry,chapter,bio,isTerm}=entryFor(trigger);
    document.getElementById('character-title').textContent=entry.name;
    document.getElementById('character-perspective').textContent=(view.value==='first'?'首周目 · ':'二周目 · ')+(isTerm?entry.kind:view.value==='first'?'本章已知':'本章与回看');
    document.getElementById('character-identity').textContent=bio.identity;
    document.getElementById('character-chapter').textContent=`本章｜${chapter.title.split('：')[0]}`;
    document.getElementById('character-now').textContent=bio.now;
    document.getElementById('character-retrospect').hidden=view.value!=='second';
    document.getElementById('character-second').textContent=view.value==='second'?bio.second:'';
    portrait.hidden=!entry.imageId;
    picture.hidden=!entry.imageId;
    if(entry.imageId){portrait.src=imageCatalog[entry.imageId].src;portrait.alt=entry.name;portrait.classList.toggle('object-image',isTerm);}
    characterCard.showPopover();
    trigger.setAttribute('aria-expanded','true');
    positionCharacter();
  }
  function positionCharacter(){
    const r=characterTrigger.getBoundingClientRect(), c=characterCard.getBoundingClientRect();
    const left=Math.max(12,Math.min(r.left,innerWidth-c.width-12));
    const top=r.bottom+c.height+10<innerHeight-12?r.bottom+10:Math.max(12,Math.min(r.top-c.height-10,innerHeight-c.height-12));
    characterCard.style.left=`${left}px`;
    characterCard.style.top=`${top}px`;
  }
  document.addEventListener('pointerover',event=>{
    if(event.pointerType!=='mouse')return;
    if(characterCard.contains(event.target)){clearTimeout(hideTimer);return;}
    const trigger=event.target.closest(entrySelector);
    if(trigger&&!imageDialog.open)showCharacter(trigger);
  });
  document.addEventListener('pointerout',event=>{
    if(event.pointerType!=='mouse')return;
    if(!event.target.closest(entrySelector)&&!characterCard.contains(event.target))return;
    if(characterCard.contains(event.relatedTarget)||characterTrigger?.contains(event.relatedTarget))return;
    hideTimer=setTimeout(hideCharacter,160);
  });
  document.addEventListener('focusin',event=>{
    const trigger=event.target.closest(entrySelector);
    if(trigger&&!imageDialog.open)showCharacter(trigger);
    else if(!characterCard.contains(event.target))hideCharacter();
  });
  document.addEventListener('click',event=>{
    const trigger=event.target.closest(entrySelector);
    if(trigger){event.preventDefault();showCharacter(trigger);document.getElementById('character-close').focus();}
    else if(!characterCard.contains(event.target))hideCharacter();
  });
  function closeCharacter(){hideCharacter();characterTrigger?.focus({preventScroll:true});hideCharacter();}
  document.getElementById('character-close').addEventListener('click',closeCharacter);
  picture.addEventListener('click',()=>{
    const {entry}=entryFor(characterTrigger);
    openImage(entry.imageId,characterTrigger,characterTrigger.dataset.chapter);
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&characterCard.matches(':popover-open'))closeCharacter();});
  addEventListener('scroll',()=>{
    if(!characterCard.matches(':popover-open'))return;
    const r=characterTrigger.getBoundingClientRect();
    if(r.bottom<66||r.top>innerHeight)hideCharacter();else positionCharacter();
  },{passive:true});
  addEventListener('resize',hideCharacter);

  const sidebar = document.getElementById('sidebar');
  const shade = document.getElementById('menu-shade');
  const menu = document.getElementById('menu-button');
  const close = document.getElementById('menu-close');
  const mobile = matchMedia('(max-width: 800px)');
  let opened = false;
  function setMenu(value, focusReturn = true) {
    opened = value;
    sidebar.classList.toggle('is-open', value);
    menu.setAttribute('aria-expanded', String(value));
    shade.hidden = !value;
    document.body.style.overflow = value && mobile.matches ? 'hidden' : '';
    if (value) close.focus();
    else if (focusReturn) menu.focus();
  }
  menu.addEventListener('click', () => setMenu(!opened));
  close.addEventListener('click', () => setMenu(false));
  shade.addEventListener('click', () => setMenu(false));
  mobile.addEventListener('change', () => setMenu(false, false));
  document.addEventListener('keydown', event => {
    if (!opened || !mobile.matches) return;
    if (event.key === 'Escape') setMenu(false);
    if (event.key === 'Tab') {
      const focusable = [...sidebar.querySelectorAll('button,a[href]')].filter(e=>e.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  sidebar.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    if (opened) setMenu(false, false);
    const heading = document.querySelector(link.getAttribute('href'));
    if (heading) heading.focus({ preventScroll: true });
  });

  const spoilerToggle = document.getElementById('spoiler-toggle');
  spoilerToggle.addEventListener('change', () => {
    document.querySelectorAll('details.foreshadow').forEach(note => { note.open = spoilerToggle.checked; });
    updateReading();
  });
  const headings = [...document.querySelectorAll('.prose h2[id], .prose h3[id]')];
  const links = [...sidebar.querySelectorAll('a[href^="#"]')];
  const bar = document.getElementById('progress-bar');
  const label = document.getElementById('progress-label');
  // 以章节中的可见内容块和块内比例定位，换行及上方图示变化不影响续读。
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  let savedPosition;
  try { savedPosition = JSON.parse(read('xenogears-position')); } catch {}
  let positionReady = false;
  let saveTimer;
  const readingLine = () => document.querySelector('.topbar').getBoundingClientRect().bottom + 24;
  const readingBlocks = heading => [heading, ...heading.parentElement.querySelectorAll('p,li,figure,table,summary')];
  function savePosition() {
    clearTimeout(saveTimer);
    if (!positionReady) return;
    const line = readingLine();
    const heading = headings.filter(h => h.getClientRects().length && h.getBoundingClientRect().top <= line).at(-1);
    const position = { view: view.value, hash: location.hash, heading: heading?.id || null, y: scrollY };
    if (heading) {
      const blocks = readingBlocks(heading);
      const block = blocks.filter(e => e.getClientRects().length && e.getBoundingClientRect().top <= line).at(-1) || heading;
      const rect = block.getBoundingClientRect();
      position.block = blocks.indexOf(block);
      position.fraction = (line - rect.top) / Math.max(1, rect.height);
    }
    write('xenogears-position', JSON.stringify(position));
  }
  async function restorePosition() {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // 新的章节链接优先；原链接的刷新和无锚点重开恢复上次位置。
    if (savedPosition?.view === view.value && (!location.hash || location.hash === savedPosition.hash)) {
      const heading = document.getElementById(savedPosition.heading);
      if (heading?.getClientRects().length) {
        const block = readingBlocks(heading)[savedPosition.block];
        const target = block?.getClientRects().length ? block : heading;
        const rect = target.getBoundingClientRect();
        scrollTo({ top: scrollY + rect.top + rect.height * savedPosition.fraction - readingLine(), behavior: 'instant' });
      } else if (!savedPosition.heading) scrollTo({ top: savedPosition.y, behavior: 'instant' });
    }
    positionReady = true;
    updateReading();
  }
  addEventListener('pagehide', savePosition);
  document.addEventListener('visibilitychange', () => { if (document.hidden) savePosition(); });
  let active = '';
  let queued = false;
  function updateReading() {
    queued = false;
    const max = Math.max(1, root.scrollHeight - innerHeight);
    const percent = Math.round(Math.min(100, Math.max(0, scrollY / max * 100)));
    bar.style.width = `${percent}%`;
    label.textContent = `${percent}%`;
    label.setAttribute('aria-label', `阅读进度 ${percent}%`);
    if (positionReady) { clearTimeout(saveTimer); saveTimer = setTimeout(savePosition, 250); }
    let current = '';
    for (const heading of headings) {
      if(!heading.getClientRects().length)continue;
      if (heading.getBoundingClientRect().top <= 140) current = heading.id;
      else break;
    }
    if (current === active) return;
    active = current;
    for (const link of links) {
      const selected = link.hash === `#${active}`;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
  function schedule() { if (!queued) { queued = true; requestAnimationFrame(updateReading); } }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  document.querySelectorAll('details').forEach(note => note.addEventListener('toggle', schedule));
  view.addEventListener('change',()=>{
    const old=headings.filter(h=>h.getClientRects().length&&h.getBoundingClientRect().top<=145).at(-1);
    const offset=old?.getBoundingClientRect().top;
    hideCharacter();
    root.dataset.view=view.value;
    write('xenogears-view',view.value);
    if(old?.getClientRects().length) scrollBy({top:old.getBoundingClientRect().top-offset,behavior:'instant'});
    else if(old)document.getElementById('chapter-35').scrollIntoView({behavior:'instant'});
    updateReading();
  });
  updateReading();
  if (document.readyState === 'complete') restorePosition();
  else addEventListener('load', restorePosition, { once: true });
})();
