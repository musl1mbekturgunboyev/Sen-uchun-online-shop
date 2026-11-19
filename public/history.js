async function orderHistoryKey() {
  function readOrCreate() {
    try {
      const name = 'sen-uchun.history.v1';
      let key = localStorage.getItem(name);
      if (!key) {
        const bytes = crypto.getRandomValues(new Uint8Array(32));
        key = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
        localStorage.setItem(name, key);
      }
      if (!/^[0-9a-f]{64}$/.test(key)) throw Error();
      return key;
    } catch {
      throw Error('Buyurtmalarni saqlash uchun brauzerda sayt xotirasiga ruxsat bering.');
    }
  }
  return navigator.locks ? navigator.locks.request('sen-uchun.history', readOrCreate) : readOrCreate();
}

(() => {
  const el = id => document.getElementById(id);
  const panel = el('customerHistory');
  const rows = el('historyRows');
  const more = el('historyMore');
  const status = el('historyStatus');
  let cursor, generation = 0, stage='';
  const tabs=document.createElement('nav');tabs.className='order-tabs';tabs.setAttribute('aria-label','Buyurtma holatlari');rows.before(tabs);
  function renderTabs(){tabs.replaceChildren();for(const value of ['','Yangi','Qabul qilindi','Tayyorlanmoqda','Tayyor','Yo‘lda','Topshirildi']){const b=document.createElement('button');b.textContent=value==='Topshirildi'?'Olingan':value||'Barchasi';b.setAttribute('aria-pressed',String(stage===value));b.onclick=()=>{stage=value;cursor=null;rows.replaceChildren();renderTabs();renderPage();};tabs.append(b);}}renderTabs();
  async function renderPage() {
    const current = ++generation;
    more.hidden = true;
    status.textContent = 'Yuklanmoqda…';
    try {
      const response = await fetch('/api/my-orders?stage='+encodeURIComponent(stage)+(cursor?'&before='+cursor:''), {
        headers: {'X-Order-Key': await orderHistoryKey()}, cache: 'no-store'
      });
      if (!response.ok) throw Error();
      const data = await response.json();
      if (current !== generation) return;
      for (const order of data.orders) {
        const row = document.createElement('li');row.className='history-order';
        const date = new Date(order.created).toLocaleDateString('uz-UZ');
        row.textContent = order.product + ' — ' + order.qty + ' dona · ' + date + ' · № ' + order.id.slice(0,8);
        row.append(' · '+(order.stage||'Avvalgi buyurtma'));
        if(order.tracking){const link=document.createElement('a');link.href=trackingLink(order.tracking);link.textContent='Holat va to‘lov';link.className='primary';link.onclick=()=>panel.close();row.append(' · ',link);}
        rows.append(row);
        cursor = order.cursor;
      }
      status.textContent = rows.childElementCount ? '' : (stage?'Bu holatda buyurtma yo‘q.':'Bu brauzerdan berilgan buyurtmalar shu yerda ko‘rinadi.');
      more.textContent = 'Yana ko‘rish';
      more.hidden = !data.more;
    } catch {
      if (current !== generation) return;
      status.textContent = 'Buyurtmalarni yuklab bo‘lmadi. Ulanish va brauzer xotirasini tekshiring.';
      more.textContent = 'Qayta urinish';
      more.hidden = false;
    }
  }
  el('historyOpen').onclick = () => {
    cursor = null;
    rows.replaceChildren();
    panel.showModal();
    renderPage();
  };
  el('historyClose').onclick = () => panel.close();
  more.onclick = renderPage;
})();
