let API_BASE = '';
let TOKEN = '';
let lastNotifCheck = new Date().toISOString();
let products = [];

function fmt(n){ return n == null ? '—' : n.toLocaleString('fr-FR') + ' FCFA'; }

async function api(path, opts = {}){
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}),
      ...(opts.headers || {})
    }
  });
  if (!res.ok){
    const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
    throw new Error(err.error || 'Erreur serveur');
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------- LOGIN ----------
async function login(){
  API_BASE = document.getElementById('apiBaseInput').value.trim().replace(/\/$/, '');
  const password = document.getElementById('passInput').value;
  const errEl = document.getElementById('loginError');
  errEl.classList.add('hidden');
  try {
    const { token } = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) });
    TOKEN = token;
    sessionStorage.setItem('gf_admin_api', API_BASE);
    sessionStorage.setItem('gf_admin_token', TOKEN);
    if (Notification && Notification.permission === 'default') Notification.requestPermission();
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadEverything();
    setInterval(pollNotifications, 15000);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}
function logout(){
  sessionStorage.removeItem('gf_admin_api');
  sessionStorage.removeItem('gf_admin_token');
  location.reload();
}
(function restoreSession(){
  const savedApi = sessionStorage.getItem('gf_admin_api');
  const savedToken = sessionStorage.getItem('gf_admin_token');
  if (savedApi && savedToken){
    API_BASE = savedApi; TOKEN = savedToken;
    document.getElementById('apiBaseInput').value = savedApi;
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    loadEverything();
    setInterval(pollNotifications, 15000);
  }
})();

// ---------- TABS ----------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
  });
});

async function loadEverything(){
  await Promise.all([loadProducts(), loadSettings(), loadClients(), loadMessages(), loadOrders()]);
  pollNotifications();
}

// ---------- PRODUCTS ----------
async function loadProducts(){
  products = await api('/api/products');
  renderProductTable();
  renderPromoSelect();
  renderPromoList();
}
function renderProductTable(){
  document.getElementById('productTable').innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Image</th><th>Nom</th><th>Catégorie</th><th>Format</th><th>Prix</th><th></th></tr></thead>
      <tbody>
        ${products.map(p => `<tr>
          <td>${p.image ? `<img src="${p.image}">` : '—'}</td>
          <td>${p.name} ${p.promoPct ? `<span class="tag-promo">-${p.promoPct}%</span>` : ''}</td>
          <td>${p.cat}</td>
          <td>${p.format}</td>
          <td><input type="number" value="${p.price ?? ''}" style="width:90px" onchange="updateProductField('${p.id}','price',this.value)"></td>
          <td>
            <button class="small-btn" onclick="promptImage('${p.id}')">Image</button>
            <button class="small-btn danger" onclick="deleteProduct('${p.id}')">Suppr.</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}
async function addProduct(){
  const body = {
    name: document.getElementById('npName').value.trim(),
    cat: document.getElementById('npCat').value,
    format: document.getElementById('npFmt').value.trim(),
    price: document.getElementById('npPrice').value,
    image: document.getElementById('npImage').value.trim()
  };
  if (!body.name){ alert('Le nom est requis'); return; }
  await api('/api/products', { method: 'POST', body: JSON.stringify(body) });
  document.getElementById('npName').value = '';
  document.getElementById('npFmt').value = '';
  document.getElementById('npPrice').value = '';
  document.getElementById('npImage').value = '';
  loadProducts();
}
async function updateProductField(id, field, value){
  await api('/api/products/' + id, { method: 'PUT', body: JSON.stringify({ [field]: value }) });
  loadProducts();
}
function promptImage(id){
  const url = prompt("URL de l'image du produit :");
  if (url != null) updateProductField(id, 'image', url);
}
async function deleteProduct(id){
  if (!confirm('Supprimer ce produit ?')) return;
  await api('/api/products/' + id, { method: 'DELETE' });
  loadProducts();
}

// ---------- PROMOS ----------
function renderPromoSelect(){
  document.getElementById('promoProductSelect').innerHTML = products.map(p => `<option value="${p.id}">${p.name} — ${p.format}</option>`).join('');
}
function renderPromoList(){
  const withPromo = products.filter(p => p.promoPct > 0);
  document.getElementById('promoList').innerHTML = withPromo.length ? withPromo.map(p => `
    <div class="conv-card" style="display:flex;justify-content:space-between;align-items:center;">
      <span>${p.name} <span class="tag-promo">-${p.promoPct}%</span></span>
      <button class="small-btn" onclick="removePromo('${p.id}')">Retirer</button>
    </div>`).join('') : '<p class="muted">Aucune promotion active.</p>';
}
async function applyPromo(){
  const id = document.getElementById('promoProductSelect').value;
  const pct = document.getElementById('promoPctInput').value;
  await api('/api/products/' + id, { method: 'PUT', body: JSON.stringify({ promoPct: pct }) });
  loadProducts();
}
async function removePromo(id){
  await api('/api/products/' + id, { method: 'PUT', body: JSON.stringify({ promoPct: 0 }) });
  loadProducts();
}

// ---------- SETTINGS ----------
async function loadSettings(){
  const s = await api('/api/settings');
  document.getElementById('transBase').value = s.transport.base;
  document.getElementById('transPerKm').value = s.transport.perKm;
  document.getElementById('payInstEnabled').checked = s.payment.installmentsEnabled;
  document.getElementById('payMaxTranches').value = s.payment.maxTranches;
  document.getElementById('payMinOrder').value = s.payment.minOrderForInstallments;
  document.getElementById('payMobileMoney').checked = s.payment.mobileMoneyEnabled;
  document.getElementById('paySourceDed').checked = s.payment.sourceDeductionEnabled;
}
async function saveTransport(){
  await api('/api/settings', { method: 'PUT', body: JSON.stringify({
    transport: { base: Number(document.getElementById('transBase').value), perKm: Number(document.getElementById('transPerKm').value) }
  })});
  alert('Livraison enregistrée');
}
async function savePayment(){
  await api('/api/settings', { method: 'PUT', body: JSON.stringify({
    payment: {
      installmentsEnabled: document.getElementById('payInstEnabled').checked,
      maxTranches: Number(document.getElementById('payMaxTranches').value),
      minOrderForInstallments: Number(document.getElementById('payMinOrder').value),
      mobileMoneyEnabled: document.getElementById('payMobileMoney').checked,
      sourceDeductionEnabled: document.getElementById('paySourceDed').checked
    }
  })});
  alert('Paramètres de paiement enregistrés');
}

// ---------- CLIENTS ----------
async function loadClients(){
  const clients = await api('/api/clients');
  document.getElementById('clientTable').innerHTML = clients.length ? `
    <table class="admin-table">
      <thead><tr><th>Nom</th><th>Téléphone</th><th>Réduction</th><th>Statut</th></tr></thead>
      <tbody>${clients.map(c => `<tr>
        <td>${c.name || '—'}</td><td>${c.phone}</td>
        <td>${c.discountPct > 0 ? '-' + c.discountPct + '%' : (c.discountPct < 0 ? '+' + Math.abs(c.discountPct) + '%' : '—')}</td>
        <td>${c.premium ? '<span class="tag-premium">★ premium</span>' : '—'}</td>
      </tr>`).join('')}</tbody>
    </table>` : '<p class="muted">Aucun client avec tarif individuel pour le moment.</p>';
}
async function saveClient(){
  const phone = document.getElementById('clPhone').value.trim();
  if (!phone){ alert('Téléphone requis'); return; }
  await api('/api/clients/' + encodeURIComponent(phone), { method: 'PUT', body: JSON.stringify({
    name: document.getElementById('clName').value.trim(),
    discountPct: document.getElementById('clDiscount').value,
    premium: document.getElementById('clPremium').checked
  })});
  loadClients();
}

// ---------- MESSAGES ----------
async function loadMessages(){
  const convs = await api('/api/messages');
  document.getElementById('conversationList').innerHTML = convs.length ? convs.map(c => `
    <div class="conv-card">
      <div class="conv-head"><span>${c.clientName || 'Client'} — ${c.clientPhone}</span></div>
      ${c.messages.map(m => `<div class="conv-msg ${m.from}">${m.text}</div>`).join('')}
      <div class="reply-row">
        <input id="reply-${c.clientPhone}" placeholder="Répondre...">
        <button class="small-btn" onclick="replyClient('${c.clientPhone}')">Envoyer</button>
      </div>
    </div>`).join('') : '<p class="muted">Aucun message pour le moment.</p>';
}
async function replyClient(phone){
  const input = document.getElementById('reply-' + phone);
  const text = input.value.trim();
  if (!text) return;
  await api('/api/messages/' + encodeURIComponent(phone) + '/reply', { method: 'POST', body: JSON.stringify({ text }) });
  input.value = '';
  loadMessages();
}

// ---------- ORDERS ----------
async function loadOrders(){
  const orders = await api('/api/orders');
  document.getElementById('orderTable').innerHTML = orders.length ? `
    <table class="admin-table">
      <thead><tr><th>Date</th><th>Client</th><th>Articles</th><th>Total</th><th>Paiement</th><th>Statut</th></tr></thead>
      <tbody>${orders.map(o => `<tr>
        <td>${new Date(o.createdAt).toLocaleString('fr-FR')}</td>
        <td>${o.customerName || '—'}<br><span class="muted">${o.customerPhone || ''}</span></td>
        <td>${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}</td>
        <td>${fmt(o.total)}</td>
        <td>${o.paymentMode}${o.sourceDeductionRequested ? ' + coupure source' : ''}</td>
        <td>
          <select onchange="updateOrderStatus('${o.id}', this.value)">
            ${['nouvelle','confirmée','livrée','annulée'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
      </tr>`).join('')}</tbody>
    </table>` : '<p class="muted">Aucune commande pour le moment.</p>';
}
async function updateOrderStatus(id, status){
  await api('/api/orders/' + id + '/status', { method: 'PUT', body: JSON.stringify({ status }) });
  loadOrders();
}

// ---------- NOTIFICATIONS ----------
async function pollNotifications(){
  try {
    const notifs = await api('/api/notifications?since=' + encodeURIComponent(lastNotifCheck));
    if (notifs.length){
      notifs.reverse().forEach(n => {
        if (Notification && Notification.permission === 'granted'){
          new Notification('Céréales Flex', { body: n.text });
        }
      });
      lastNotifCheck = new Date().toISOString();
    }
    const all = await api('/api/notifications');
    document.getElementById('notifCount').textContent = all.length;
    document.getElementById('notifCount').classList.toggle('hidden', all.length === 0);
    document.getElementById('notifPanel').innerHTML = all.map(n => `
      <div class="n-item">${n.text}<div class="n-date">${new Date(n.createdAt).toLocaleString('fr-FR')}</div></div>`).join('') || '<p class="muted">Aucune notification.</p>';
  } catch (err) { /* silencieux si token expiré, géré au prochain login */ }
}
function toggleNotifPanel(){ document.getElementById('notifPanel').classList.toggle('hidden'); }
