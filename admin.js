/**
 * BarberPro — admin.js
 * Painel administrativo completo:
 * Dashboard, Agenda, Clientes, Serviços, Financeiro, Estoque, Bloqueios, Config
 */

const Admin = {
  _currentTab: 'dashboard',
  _adminCalYear: null,
  _adminCalMonth: null,
  _selectedDay: null,

  /* ═══════════════════════════════════════
     INIT
  ═══════════════════════════════════════ */
  init() {
    const now = new Date();
    this._adminCalYear = now.getFullYear();
    this._adminCalMonth = now.getMonth();
    this._selectedDay = Utils.today();

    this.tab('dashboard');
    this._loadConfig();
    this._setupDaysCheck();
    this._applyColors();

    // Atualiza data no dashboard
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const today = new Date();
    const daysN = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    document.getElementById('current-date-label').textContent =
      `${daysN[today.getDay()]}, ${today.getDate()} de ${months[today.getMonth()]} de ${today.getFullYear()}`;

    // Add modal for day appointments
    const modalHTML = `
      <div id="modal-day-appointments" class="modal hidden" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000;">
        <div class="modal-content" style="background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); max-width: 600px; max-height: 80vh; padding: 2rem; overflow-y: auto;">
          <h3 id="day-modal-title" style="margin-bottom: 1rem; text-align: center;"></h3>
          <div id="day-modal-content"></div>
          <div style="text-align: center; margin-top: 1rem;">
            <button class="btn" style="color: #000;" onclick="Modal.close('modal-day-appointments')">Voltar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add modal for debts
    const debtModalHTML = `
      <div id="modal-debts" class="modal hidden" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000;">
        <div class="modal-content" style="background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); max-width: 600px; max-height: 80vh; padding: 2rem; overflow-y: auto;">
          <h3 style="margin-bottom: 1rem; text-align: center;">💸 Débitos (Fiados)</h3>
          <div id="debts-modal-content"></div>
          <div style="text-align: center; margin-top: 1rem;">
            <button class="btn" style="color: #000;" onclick="Modal.close('modal-debts')">Fechar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', debtModalHTML);
  },

  /* ═══════════════════════════════════════
     NAVEGAÇÃO DE ABAS
  ═══════════════════════════════════════ */
  tab(name) {
    this._currentTab = name;
    // Ativa nav item
    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    // Ativa tab content
    document.querySelectorAll('.tab-content').forEach(t => {
      t.classList.toggle('active', t.id === 'tab-' + name);
    });
    // Fecha sidebar mobile
    document.getElementById('sidebar').classList.remove('open');
    // Renderiza conteúdo
    switch (name) {
      case 'dashboard': this.renderDashboard(); break;
      case 'agenda': this.renderAgenda(); break;
      case 'calendario': this.renderCalendario(); break;
      case 'clientes': this.renderClients(); break;
      case 'servicos': this.renderServices(); break;
      case 'financeiro': this.renderFinanceiro(); break;
      case 'estoque': this.renderStock(); break;
      case 'bloqueios': this.renderBlocks(); break;
    }
  },

  toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
  },

  _applyColors() {
    const cfg = Store.getConfig();
    if (cfg.colors) {
      for (const [k, v] of Object.entries(cfg.colors)) {
        document.documentElement.style.setProperty('--' + k, v);
      }
    }
  },

  /* ═══════════════════════════════════════
     DASHBOARD
  ═══════════════════════════════════════ */
  renderDashboard() {
    const loggedLogin = App.getLoggedLogin();
    const allBookings = Store.getBookings();
    // Filtra agendamentos do usuário logado (por ownerLogin ou sem ownerLogin para admin principal)
    const bookings = allBookings.filter(b => (b.ownerLogin || '') === loggedLogin);
    const services = Store.getServices();
    const today = Utils.today();
    const todayB = bookings.filter(b => b.date === today && b.status !== 'cancelled');

    // KPIs
    const totalToday = todayB.length;
    const paidToday = todayB.filter(b => b.payment === 'paid').length;
    const revenueToday = todayB.filter(b => b.payment === 'paid').reduce((acc, b) => {
      const svc = services.find(s => s.id === b.serviceId);
      return acc + (svc ? svc.price : 0);
    }, 0);
    const monthStart = today.substr(0, 7);
    const monthB = bookings.filter(b => b.date.startsWith(monthStart) && b.payment === 'paid');
    const revenueMonth = monthB.reduce((acc, b) => {
      const svc = services.find(s => s.id === b.serviceId);
      return acc + (svc ? svc.price : 0);
    }, 0);

    document.getElementById('kpi-grid').innerHTML = `
      <div class="kpi-card" onclick="Admin.tab('agenda')" style="cursor: pointer;"><div class="kpi-icon">📅</div><div class="kpi-value">${totalToday}</div><div class="kpi-label">Agendamentos hoje</div></div>
      <div class="kpi-card"><div class="kpi-icon">✅</div><div class="kpi-value">${paidToday}</div><div class="kpi-label">Pagos hoje</div></div>
      <div class="kpi-card" onclick="Admin.tab('financeiro')" style="cursor: pointer;"><div class="kpi-icon">💰</div><div class="kpi-value">${Utils.brl(revenueToday)}</div><div class="kpi-label">Faturamento hoje</div></div>
      <div class="kpi-card" onclick="Admin.tab('financeiro')" style="cursor: pointer;"><div class="kpi-icon">📈</div><div class="kpi-value">${Utils.brl(revenueMonth)}</div><div class="kpi-label">Faturamento do mês</div></div>
    `;

    // Lista de hoje
    const todayList = document.getElementById('today-list');
    if (!todayB.length) {
      todayList.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div>Nenhum agendamento hoje.</div>';
    } else {
      todayList.innerHTML = todayB
        .sort((a, b) => a.time.localeCompare(b.time))
        .map(b => this._renderAppointmentCard(b, false)).join('');
    }

    // Top serviços
    const svcCount = {};
    bookings.filter(b => b.status !== 'cancelled').forEach(b => {
      svcCount[b.serviceId] = (svcCount[b.serviceId] || 0) + 1;
    });
    const sorted = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted[0]?.[1] || 1;
    document.getElementById('top-services').innerHTML = sorted.length ?
      sorted.map(([id, cnt], i) => {
        const svc = services.find(s => s.id === id);
        return `<div class="top-service-item" onclick="Admin.tab('servicos')" style="cursor: pointer;">
          <div class="top-svc-rank">${i + 1}</div>
          <div class="top-svc-name">${svc?.icon || '✂'} ${svc?.name || 'Desconhecido'}</div>
          <div class="top-svc-bar-wrap"><div class="top-svc-bar" style="width:${Math.round(cnt / max * 100)}%"></div></div>
          <div class="top-svc-count">${cnt}x</div>
        </div>`;
      }).join('') :
      '<div class="empty-state">Sem dados ainda.</div>';
  },

  /* ═══════════════════════════════════════
     AGENDA
  ═══════════════════════════════════════ */
  renderAgenda() {
    const today = Utils.today();
    const title = `Hoje — ${Utils.fmtDateLong(today)}`;
    document.getElementById('today-title').textContent = title;

    const loggedLogin = App.getLoggedLogin();
    // Renderizar agendamentos do dia atual (somente do usuário logado)
    const bookings = Store.getBookings().filter(b => b.date === today && b.status !== 'cancelled' && (b.ownerLogin || '') === loggedLogin)
      .sort((a, b) => a.time.localeCompare(b.time));
    const html = bookings.length ? bookings.map(b => this._renderAppointmentCard(b, true)).join('') : '<div class="empty-state"><div class="empty-icon">📅</div>Nenhum agendamento hoje.</div>';
    document.getElementById('today-appointments-list').innerHTML = html;
  },

  renderCalendario() {
    this._renderAdminCal();
  },

  showDebts() {
    const loggedLogin = App.getLoggedLogin();
    const bookings = Store.getBookings().filter(b => b.payment !== 'paid' && b.status === 'confirmed' && (b.ownerLogin || '') === loggedLogin);
    const html = bookings.length ? bookings.map(b => this._renderAppointmentCard(b, true)).join('') : '<div class="empty-state"><div class="empty-icon">💸</div>Nenhum débito pendente.</div>';
    document.getElementById('debts-modal-content').innerHTML = html;
    Modal.open('modal-debts');
  },

  _renderAdminCal() {
    const year = this._adminCalYear;
    const month = this._adminCalMonth;
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    document.getElementById('admin-cal-label').textContent = `${months[month]} ${year}`;

    const cfg = Store.getConfig();
    const blocks = Store.getBlocks();
    const loggedLogin = App.getLoggedLogin();
    const bookings = Store.getBookings().filter(b => (b.ownerLogin || '') === loggedLogin);
    const today = Utils.today();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    let html = days.map(d => `<div class="cal-header">${d}</div>`).join('');
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dow = Utils.dayOfWeek(ds);
      const isWorkDay = cfg.workDays.includes(dow);
      const isFullBlocked = blocks.some(b => b.date === ds && b.time === '');
      const dayBookings = bookings.filter(b => b.date === ds && b.status !== 'cancelled');

      let cls = 'cal-day';
      if (ds === today) cls += ' today';
      if (ds === this._selectedDay) cls += ' selected';
      if (!isWorkDay || isFullBlocked) cls += ' disabled';
      if (dayBookings.length) cls += ' has-bookings';

      html += `<div class="${cls}" onclick="Admin._selectAdminDay('${ds}')">${d}${dayBookings.length ? `<span style="position:absolute;bottom:2px;right:3px;font-size:.55rem;color:var(--gold)">${dayBookings.length}</span>` : ''}</div>`;
    }
    document.getElementById('admin-cal-grid').innerHTML = html;
  },

  _selectAdminDay(ds) {
    this._selectedDay = ds;
    this._renderAdminCal();
    this._openDayModal(ds);
  },

  _openDayModal(ds) {
    const title = `Agendamentos — ${Utils.fmtDateLong(ds)}`;
    const loggedLogin = App.getLoggedLogin();
    const bookings = Store.getBookings().filter(b => b.date === ds && b.status !== 'cancelled' && (b.ownerLogin || '') === loggedLogin)
      .sort((a, b) => a.time.localeCompare(b.time));
    const html = bookings.length ? bookings.map(b => this._renderAppointmentCard(b, true)).join('') : '<div class="empty-state"><div class="empty-icon">📅</div>Nenhum agendamento neste dia.</div>';
    document.getElementById('day-modal-title').textContent = title;
    document.getElementById('day-modal-content').innerHTML = html;
    Modal.open('modal-day-appointments');
  },

  calPrev() {
    this._adminCalMonth--;
    if (this._adminCalMonth < 0) { this._adminCalMonth = 11; this._adminCalYear--; }
    this._renderAdminCal();
  },
  calNext() {
    this._adminCalMonth++;
    if (this._adminCalMonth > 11) { this._adminCalMonth = 0; this._adminCalYear++; }
    this._renderAdminCal();
  },

  /* ═══════════════════════════════════════
     APPOINTMENT CARD — usado em dashboard e agenda
  ═══════════════════════════════════════ */
  _renderAppointmentCard(b, showActions = true) {
    const services = Store.getServices();
    const svc = services.find(s => s.id === b.serviceId);
    const payBadge = b.payment === 'paid' ?
      '<span class="badge-paid">✓ Pago</span>' :
      b.payment === 'fiado' ?
        '<span class="badge-fiado">💰 Fiado</span>' :
        '<span class="badge-unpaid">❌ Não Pago</span>';
    const payButtons = b.payment !== 'paid' ? `
      <button class="btn-sm pay" onclick="Admin.markPaid('${b.id}')">💰 Pago</button>
      <button class="btn-sm fiado" onclick="Admin.markFiado('${b.id}')">📝 Fiado</button>
    ` : '';
    const obs = b.obs ? `<div class="appt-obs">⚠ ${b.obs}</div>` : '';
    const noshow = b.noShow ? `<div class="appt-obs">🚫 Falta de compromisso</div>` : '';

    const whatsappBtn = b.phone ?
      `<button class="btn-sm whatsapp" onclick="Admin.sendWhatsApp('${b.id}')">📱 WA</button>` : '';

    const actions = showActions ? `
      <div class="appt-actions">
        ${payBadge} ${payButtons}
        <button class="btn-sm edit" onclick="Admin.editBooking('${b.id}')">✏ Editar</button>
        <button class="btn-sm delete" onclick="Admin.cancelBooking('${b.id}')">✕ Cancelar</button>
        <button class="btn-sm" onclick="Admin.markNoShow('${b.id}')">🚫 Faltou</button>
        ${whatsappBtn}
      </div>` : `<div class="appt-actions">${payBadge}</div>`;

    return `
    <div class="appointment-card" id="appt-${b.id}">
      <div class="appt-top">
        <span class="appt-name">${b.name}</span>
        <span class="appt-time">🕐 ${b.time}</span>
      </div>
      <div class="appt-meta">
        <span class="appt-service">${svc?.icon || '✂'} ${svc?.name || 'Serviço'}</span>
        <span>📱 ${b.phone}</span>
        <span style="color:var(--gold)">${Utils.brl(svc?.price)}</span>
      </div>
      ${noshow}${obs}
      ${actions}
    </div>`;
  },

  /* ═══════════════════════════════════════
     CRUD AGENDAMENTOS
  ═══════════════════════════════════════ */
  openNewBooking() {
    document.getElementById('booking-edit-id').value = '';
    document.getElementById('modal-booking-title').textContent = 'Novo Agendamento';
    document.getElementById('bk-name').value = '';
    document.getElementById('bk-phone').value = '';
    document.getElementById('bk-obs').value = '';
    document.getElementById('bk-payment').value = 'pending';
    document.getElementById('bk-date').value = Utils.today();
    document.getElementById('bk-date').min = Utils.today();

    // Preenche serviços
    const svcs = Store.getServices().filter(s => s.active);
    document.getElementById('bk-service').innerHTML = svcs.map(s =>
      `<option value="${s.id}">${s.icon} ${s.name} — ${Utils.brl(s.price)}</option>`
    ).join('');

    // Preenche horários
    this._fillTimeSelect(Utils.today(), null);
    document.getElementById('bk-date').onchange = e => this._fillTimeSelect(e.target.value, null);

    Modal.open('modal-booking');
    document.getElementById('bk-name').focus();
  },

  editBooking(id) {
    const b = Store.getBookings().find(b => b.id === id);
    if (!b) return;
    document.getElementById('booking-edit-id').value = id;
    document.getElementById('modal-booking-title').textContent = 'Editar Agendamento';
    document.getElementById('bk-name').value = b.name;
    document.getElementById('bk-phone').value = b.phone;
    document.getElementById('bk-obs').value = b.obs || '';
    document.getElementById('bk-payment').value = b.payment;
    document.getElementById('bk-date').value = b.date;

    const svcs = Store.getServices().filter(s => s.active);
    document.getElementById('bk-service').innerHTML = svcs.map(s =>
      `<option value="${s.id}" ${s.id === b.serviceId ? 'selected' : ''}>${s.icon} ${s.name} — ${Utils.brl(s.price)}</option>`
    ).join('');

    this._fillTimeSelect(b.date, id, b.time);
    document.getElementById('bk-date').onchange = e => this._fillTimeSelect(e.target.value, id);

    Modal.open('modal-booking');
  },

  _fillTimeSelect(date, excludeId, selectedTime = null) {
    const cfg = Store.getConfig();
    const blocks = Store.getBlocks();
    const bookings = Store.getBookings();
    const slots = Utils.generateSlots(cfg);
    const sel = document.getElementById('bk-time');
    sel.innerHTML = slots.map(t => {
      const blocked = Utils.isBlocked(date, t, blocks) || Utils.isBooked(date, t, bookings, excludeId);
      return `<option value="${t}" ${blocked ? 'disabled' : ''} ${t === selectedTime ? 'selected' : ''}>${t}${blocked ? ' (ocupado)' : ''}</option>`;
    }).join('');
    if (selectedTime) sel.value = selectedTime;
  },

  saveBooking() {
    const id = document.getElementById('booking-edit-id').value;
    const name = document.getElementById('bk-name').value.trim();
    const phone = document.getElementById('bk-phone').value.trim();
    const svcId = document.getElementById('bk-service').value;
    const date = document.getElementById('bk-date').value;
    const time = document.getElementById('bk-time').value;
    const pay = document.getElementById('bk-payment').value;
    const obs = document.getElementById('bk-obs').value.trim();

    if (!name || !phone || !svcId || !date || !time) {
      Utils.toast('Preencha todos os campos obrigatórios.'); return;
    }

    let bookings = Store.getBookings();
    const cfg = Store.getConfig();
    const svc = Store.getServices().find(s => s.id === svcId);

    if (id) {
      // Editar
      const idx = bookings.findIndex(b => b.id === id);
      if (idx > -1) bookings[idx] = { ...bookings[idx], name, phone, serviceId: svcId, date, time, payment: pay, obs };
    } else {
      // Novo
      const booking = { id: Utils.uid(), name, phone, serviceId: svcId, date, time, payment: pay, obs, status: 'confirmed', createdAt: new Date().toISOString(), source: 'admin', ownerLogin: App.getLoggedLogin() };
      bookings.push(booking);

      // Atualiza cliente
      const clients = Store.getClients();
      const key = phone.replace(/\D/g, '');
      if (!clients[key]) clients[key] = { name, phone, obs: '', visits: 0 };
      clients[key].visits = (clients[key].visits || 0) + 1;
      Store.setClients(clients);

      // Pergunta se quer enviar WA
      const msg = Utils.fillMsg(cfg.msgConfirmClient, {
        nome: name, servico: svc?.name || '', data: Utils.fmtDate(date), hora: time
      });
      setTimeout(() => {
        if (confirm(`Enviar confirmação para ${name} pelo WhatsApp?`)) {
          window.open(Utils.whatsappUrl(phone, msg), '_blank');
        }
      }, 300);
    }

    Store.setBookings(bookings);
    Modal.close('modal-booking');
    Utils.toast(id ? 'Agendamento atualizado!' : 'Agendamento criado!');
    this.renderAgenda();
    if (this._currentTab === 'dashboard') this.renderDashboard();
  },

  cancelBooking(id) {
    if (!confirm('Cancelar este agendamento?')) return;
    const bookings = Store.getBookings();
    const idx = bookings.findIndex(b => b.id === id);
    if (idx > -1) bookings[idx].status = 'cancelled';
    Store.setBookings(bookings);
    Utils.toast('Agendamento cancelado.');
    this.renderAgenda();
    if (this._currentTab === 'dashboard') this.renderDashboard();
  },

  markPaid(id) {
    const bookings = Store.getBookings();
    const b = bookings.find(b => b.id === id);
    if (b) b.payment = 'paid';
    Store.setBookings(bookings);
    Utils.toast('Pagamento registrado! ✅');
    this.renderAgenda();
    if (this._currentTab === 'dashboard') this.renderDashboard();
    if (this._currentTab === 'financeiro') this.renderFinanceiro();
  },

  markFiado(id) {
    const bookings = Store.getBookings();
    const b = bookings.find(b => b.id === id);
    if (b) b.payment = 'fiado';
    Store.setBookings(bookings);
    Utils.toast('Marcado como fiado! 💰');
    this.renderAgenda();
    if (this._currentTab === 'dashboard') this.renderDashboard();
    if (this._currentTab === 'financeiro') this.renderFinanceiro();
  },

  markNoShow(id) {
    const bookings = Store.getBookings();
    const b = bookings.find(b => b.id === id);
    if (!b) return;
    b.noShow = true;
    b.obs = b.obs ? b.obs + ' | Falta de compromisso' : 'Falta de compromisso';
    // Marca no cliente
    const clients = Store.getClients();
    const key = b.phone.replace(/\D/g, '');
    if (clients[key]) {
      clients[key].obs = (clients[key].obs || '') + (clients[key].obs ? ' | ' : '') + `Faltou em ${Utils.fmtDate(b.date)}`;
      Store.setClients(clients);
    }
    Store.setBookings(bookings);
    Utils.toast('Marcado como faltoso.');
    this.renderAgenda();
    if (this._currentTab === 'dashboard') this.renderDashboard();
  },

  sendWhatsApp(id) {
    const b = Store.getBookings().find(b => b.id === id);
    if (!b) return;
    const svc = Store.getServices().find(s => s.id === b.serviceId);
    const cfg = Store.getConfig();
    const msg = Utils.fillMsg(cfg.msgConfirmClient, {
      nome: b.name, servico: svc?.name || '', data: Utils.fmtDate(b.date), hora: b.time
    });
    window.open(Utils.whatsappUrl(b.phone, msg), '_blank');
  },

  /* ═══════════════════════════════════════
     CLIENTES
  ═══════════════════════════════════════ */
  renderClients() {
    this._renderClientsTable('');
  },

  filterClients() {
    this._renderClientsTable(document.getElementById('client-search').value.toLowerCase());
  },

  _renderClientsTable(filter) {
    const clients = Store.getClients();
    const loggedLogin = App.getLoggedLogin();
    const bookings = Store.getBookings().filter(b => (b.ownerLogin || '') === loggedLogin);

    // Monta conjunto de telefones que têm agendamento com este usuário
    const ownerPhones = new Set(bookings.map(b => b.phone.replace(/\D/g, '')));

    let rows = Object.values(clients).filter(c => ownerPhones.has(c.phone.replace(/\D/g, '')));
    if (filter) rows = rows.filter(c => c.name.toLowerCase().includes(filter) || c.phone.includes(filter));

    if (!rows.length) {
      document.getElementById('clients-table-wrap').innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div>Nenhum cliente cadastrado.</div>';
      return;
    }

    const html = `
    <table class="clients-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>WhatsApp</th>
          <th>Visitas</th>
          <th>Último agend.</th>
          <th>Observação</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(c => {
      const key = c.phone.replace(/\D/g, '');
      const lastB = bookings.filter(b => b.phone.replace(/\D/g, '') === key && b.status !== 'cancelled').sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).pop();
      return `<tr>
            <td><strong>${c.name}</strong></td>
            <td><a href="https://wa.me/55${key}" target="_blank" style="color:var(--green)">📱 ${c.phone}</a></td>
            <td style="text-align:center">${c.visits || 0}</td>
            <td>${lastB ? Utils.fmtDate(lastB.date) + ' ' + lastB.time : '—'}</td>
            <td><span class="client-obs-text">${c.obs || ''}</span></td>
            <td>
              <button class="btn-sm edit" onclick="Admin.openClientObs('${key}')">✏ Obs</button>
            </td>
          </tr>`;
    }).join('')}
      </tbody>
    </table>`;
    document.getElementById('clients-table-wrap').innerHTML = html;
  },

  openClientObs(phone) {
    const clients = Store.getClients();
    const c = clients[phone];
    if (!c) return;
    document.getElementById('obs-client-phone').value = phone;
    document.getElementById('obs-text').value = c.obs || '';
    Modal.open('modal-client-obs');
  },

  saveClientObs() {
    const phone = document.getElementById('obs-client-phone').value;
    const obs = document.getElementById('obs-text').value.trim();
    const clients = Store.getClients();
    if (clients[phone]) clients[phone].obs = obs;
    Store.setClients(clients);
    Modal.close('modal-client-obs');
    Utils.toast('Observação salva!');
    this.renderClients();
  },

  /* ═══════════════════════════════════════
     SERVIÇOS
  ═══════════════════════════════════════ */
  renderServices() {
    const services = Store.getServices();
    const el = document.getElementById('services-admin-grid');
    if (!services.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">✂</div>Nenhum serviço cadastrado.</div>';
      return;
    }
    el.innerHTML = services.map(s => `
      <div class="service-admin-card ${!s.active ? 'svc-inactive' : ''}">
        <div class="svc-admin-top">
          <div class="svc-admin-icon-name">
            <span class="svc-admin-icon">${s.icon || '✂'}</span>
            <span class="svc-admin-name">${s.name}</span>
            ${!s.active ? '<span class="svc-paused-badge">⏸ Pausado</span>' : ''}
          </div>
          <span style="color:var(--gold);font-weight:700">${Utils.brl(s.price)}</span>
        </div>
        <div style="font-size:.82rem;color:var(--text2);margin-bottom:.75rem">${s.desc || ''} · ⏱ ${s.duration}min</div>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap">
          <button class="btn-sm edit" onclick="Admin.openServiceModal('${s.id}')">✏ Editar</button>
          <button class="btn-sm" onclick="Admin.toggleService('${s.id}')">${s.active ? '⏸ Pausar' : '▶ Ativar'}</button>
          <button class="btn-sm delete" onclick="Admin.deleteService('${s.id}')">✕ Remover</button>
        </div>
      </div>
    `).join('');
  },

  openServiceModal(id = null) {
    document.getElementById('svc-edit-id').value = id || '';
    document.getElementById('modal-service-title').textContent = id ? 'Editar Serviço' : 'Novo Serviço';
    if (id) {
      const s = Store.getServices().find(s => s.id === id);
      if (!s) return;
      document.getElementById('svc-name').value = s.name;
      document.getElementById('svc-price').value = s.price;
      document.getElementById('svc-duration').value = s.duration;
      document.getElementById('svc-desc').value = s.desc || '';
      document.getElementById('svc-icon').value = s.icon || '✂';
      document.getElementById('svc-active').checked = s.active;
    } else {
      document.getElementById('svc-name').value = '';
      document.getElementById('svc-price').value = '';
      document.getElementById('svc-duration').value = '30';
      document.getElementById('svc-desc').value = '';
      document.getElementById('svc-icon').value = '✂';
      document.getElementById('svc-active').checked = true;
    }
    Modal.open('modal-service');
    document.getElementById('svc-name').focus();
  },

  saveService() {
    const id = document.getElementById('svc-edit-id').value;
    const name = document.getElementById('svc-name').value.trim();
    const price = parseFloat(document.getElementById('svc-price').value);
    const duration = parseInt(document.getElementById('svc-duration').value);
    const desc = document.getElementById('svc-desc').value.trim();
    const icon = document.getElementById('svc-icon').value.trim() || '✂';
    const active = document.getElementById('svc-active').checked;

    if (!name || isNaN(price)) { Utils.toast('Preencha nome e preço.'); return; }

    let services = Store.getServices();
    if (id) {
      const idx = services.findIndex(s => s.id === id);
      if (idx > -1) services[idx] = { ...services[idx], name, price, duration, desc, icon, active };
    } else {
      services.push({ id: Utils.uid(), name, price, duration, desc, icon, active });
    }
    Store.setServices(services);
    Modal.close('modal-service');
    Utils.toast(id ? 'Serviço atualizado!' : 'Serviço criado!');
    this.renderServices();
  },

  toggleService(id) {
    const services = Store.getServices();
    const s = services.find(s => s.id === id);
    if (s) s.active = !s.active;
    Store.setServices(services);
    Utils.toast(s?.active ? 'Serviço ativado.' : 'Serviço pausado.');
    this.renderServices();
  },

  deleteService(id) {
    if (!confirm('Remover este serviço?')) return;
    Store.setServices(Store.getServices().filter(s => s.id !== id));
    Utils.toast('Serviço removido.');
    this.renderServices();
  },

  /* ═══════════════════════════════════════
     FINANCEIRO
  ═══════════════════════════════════════ */
  renderFinanceiro() {
    const filter = document.getElementById('fin-filter')?.value || 'month';
    const loggedLogin = App.getLoggedLogin();
    const bookings = Store.getBookings().filter(b => (b.ownerLogin || '') === loggedLogin);
    const services = Store.getServices();
    const today = Utils.today();
    const now = new Date();

    const filtered = bookings.filter(b => {
      if (b.payment !== 'paid') return false;
      if (filter === 'today') return b.date === today;
      if (filter === 'week') {
        const start = new Date(now); start.setDate(now.getDate() - now.getDay());
        return new Date(b.date) >= start;
      }
      if (filter === 'month') return b.date.startsWith(today.substr(0, 7));
      return true;
    }).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

    const total = filtered.reduce((acc, b) => {
      const s = services.find(s => s.id === b.serviceId);
      return acc + (s?.price || 0);
    }, 0);

    const cfg = Store.getConfig();
    const discount = parseInt(cfg.discount) || 0;
    const totalWithDisc = discount > 0 ? total * (1 - discount / 100) : total;

    document.getElementById('fin-kpi-grid').innerHTML = `
      <div class="kpi-card"><div class="kpi-icon">🧾</div><div class="kpi-value">${filtered.length}</div><div class="kpi-label">Pagamentos</div></div>
      <div class="kpi-card"><div class="kpi-icon">💰</div><div class="kpi-value">${Utils.brl(totalWithDisc)}</div><div class="kpi-label">Total recebido</div></div>
      <div class="kpi-card"><div class="kpi-icon">📊</div><div class="kpi-value">${Utils.brl(filtered.length ? totalWithDisc / filtered.length : 0)}</div><div class="kpi-label">Ticket médio</div></div>
    `;

    if (!filtered.length) {
      document.getElementById('fin-history').innerHTML = '<div class="empty-state"><div class="empty-icon">💰</div>Nenhum pagamento no período.</div>';
      return;
    }
    document.getElementById('fin-history').innerHTML = filtered.map(b => {
      const svc = services.find(s => s.id === b.serviceId);
      const price = discount > 0 ? (svc?.price || 0) * (1 - discount / 100) : (svc?.price || 0);
      return `<div class="fin-row">
        <span class="fin-date">📅 ${Utils.fmtDate(b.date)} ${b.time}</span>
        <span>
          <div class="fin-name">${b.name}</div>
          <div class="fin-service">${svc?.icon || '✂'} ${svc?.name || '—'}</div>
        </span>
        <span class="fin-amount">${Utils.brl(price)}</span>
        <div style="display:flex;gap:.4rem;margin-left:.5rem">
  <button class="btn-sm whatsapp" onclick="Admin.sendWhatsApp('${b.id}')">📱</button>

  <button 
    class="btn-sm delete"
    onclick="Admin.deletePayment('${b.id}')">
    🗑 Excluir
  </button>
</div>`;
    }).join('');
  },

  /* ═══════════════════════════════════════
     ESTOQUE
  ═══════════════════════════════════════ */
  renderStock() {
    const stock = Store.getStock();
    const el = document.getElementById('stock-list');
    if (!stock.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div>Estoque vazio. Adicione produtos.</div>';
      return;
    }
    el.innerHTML = stock.map(item => {
      const isLow = item.qty <= item.minQty;
      return `<div class="stock-item">
        <span class="stock-name"><strong>${item.name}</strong>${isLow ? ' <span class="stock-alert">⚠ Estoque baixo</span>' : ''}</span>
        <span class="stock-qty ${isLow ? 'low' : 'ok'}">${item.qty} un</span>
        <span style="font-size:.78rem;color:var(--text2)">Min: ${item.minQty} | Custo: ${Utils.brl(item.cost)} | Venda: ${Utils.brl(item.sell)}</span>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-left:auto">
          <button class="btn-sm" onclick="Admin.adjustStock('${item.id}', 1)">+</button>
          <button class="btn-sm" onclick="Admin.adjustStock('${item.id}', -1)">−</button>
          <button class="btn-sm edit" onclick="Admin.openStockModal('${item.id}')">✏</button>
          <button class="btn-sm delete" onclick="Admin.deleteStock('${item.id}')">✕</button>
        </div>
      </div>`;
    }).join('');
  },

  openStockModal(id = null) {
    document.getElementById('stk-edit-id').value = id || '';
    document.getElementById('modal-stock-title').textContent = id ? 'Editar Produto' : 'Novo Produto';
    if (id) {
      const s = Store.getStock().find(s => s.id === id);
      if (!s) return;
      document.getElementById('stk-name').value = s.name;
      document.getElementById('stk-qty').value = s.qty;
      document.getElementById('stk-min').value = s.minQty;
      document.getElementById('stk-cost').value = s.cost;
      document.getElementById('stk-sell').value = s.sell;
    } else {
      document.getElementById('stk-name').value = '';
      document.getElementById('stk-qty').value = 1;
      document.getElementById('stk-min').value = 2;
      document.getElementById('stk-cost').value = 0;
      document.getElementById('stk-sell').value = 0;
    }
    Modal.open('modal-stock');
  },

  saveStock() {
    const id = document.getElementById('stk-edit-id').value;
    const name = document.getElementById('stk-name').value.trim();
    const qty = parseInt(document.getElementById('stk-qty').value);
    const minQty = parseInt(document.getElementById('stk-min').value);
    const cost = parseFloat(document.getElementById('stk-cost').value);
    const sell = parseFloat(document.getElementById('stk-sell').value);
    if (!name) { Utils.toast('Informe o nome do produto.'); return; }

    let stock = Store.getStock();
    if (id) {
      const idx = stock.findIndex(s => s.id === id);
      if (idx > -1) stock[idx] = { ...stock[idx], name, qty, minQty, cost, sell };
    } else {
      stock.push({ id: Utils.uid(), name, qty, minQty, cost, sell });
    }
    Store.setStock(stock);
    Modal.close('modal-stock');
    Utils.toast('Produto salvo!');
    this.renderStock();
  },

  adjustStock(id, delta) {
    const stock = Store.getStock();
    const s = stock.find(s => s.id === id);
    if (!s) return;
    s.qty = Math.max(0, s.qty + delta);
    Store.setStock(stock);
    this.renderStock();
  },

  deleteStock(id) {
    if (!confirm('Remover este produto?')) return;
    Store.setStock(Store.getStock().filter(s => s.id !== id));
    Utils.toast('Produto removido.');
    this.renderStock();
  },

  /* ═══════════════════════════════════════
     BLOQUEIOS
  ═══════════════════════════════════════ */
  renderBlocks() {
    const blocks = Store.getBlocks();
    const el = document.getElementById('blocks-list');
    if (!blocks.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div>Nenhum bloqueio cadastrado.</div>';
      return;
    }
    el.innerHTML = blocks
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .map(b => `<div class="block-item">
        <span class="block-date">📅 ${Utils.fmtDate(b.date)}</span>
        <span class="block-time">${b.time ? '🕐 ' + b.time : '🔒 Dia inteiro'}</span>
        <span class="block-reason">${b.reason || '—'}</span>
        <button class="btn-sm delete" onclick="Admin.deleteBlock('${b.id}')">✕ Remover</button>
      </div>`).join('');
  },

  openBlockModal() {
    document.getElementById('blk-date').value = Utils.today();
    document.getElementById('blk-time').value = '';
    document.getElementById('blk-reason').value = '';
    Modal.open('modal-block');
  },

  saveBlock() {
    const date = document.getElementById('blk-date').value;
    const time = document.getElementById('blk-time').value;
    const reason = document.getElementById('blk-reason').value.trim();
    if (!date) { Utils.toast('Selecione a data.'); return; }
    const blocks = Store.getBlocks();
    blocks.push({ id: Utils.uid(), date, time, reason });
    Store.setBlocks(blocks);
    Modal.close('modal-block');
    Utils.toast('Bloqueio criado!');
    this.renderBlocks();
    this._renderAdminCal();
  },

  deleteBlock(id) {
    Store.setBlocks(Store.getBlocks().filter(b => b.id !== id));
    Utils.toast('Bloqueio removido.');
    this.renderBlocks();
    this._renderAdminCal();
  },

  /* ═══════════════════════════════════════
     CONFIGURAÇÕES
  ═══════════════════════════════════════ */
  _loadConfig() {
    const cfg = Store.getConfig();
    document.getElementById('cfg-user').value = cfg.user;
    document.getElementById('cfg-open').value = cfg.openTime;
    document.getElementById('cfg-close').value = cfg.closeTime;
    document.getElementById('cfg-interval').value = cfg.interval;
    document.getElementById('cfg-discount').value = cfg.discount || 0;
    document.getElementById('cfg-coupon').value = cfg.coupon || '';
    document.getElementById('cfg-barber-phone').value = cfg.barberPhone || '';
    document.getElementById('msg-confirm-client').value = cfg.msgConfirmClient;
    document.getElementById('msg-reminder').value = cfg.msgReminder;

    // ── Link exclusivo + WhatsApp individual ──
    if (!document.getElementById('user-link-card')) {
      const loggedLogin = App.getLoggedLogin();
      const baseUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'agendar.html';
      const exclusiveLink = `${baseUrl}?adm=${loggedLogin}`;
      const savedPhone = Store.getUserWhatsApp(loggedLogin);

      const linkCardHTML = `
        <div class="card" id="user-link-card" style="border: 1px solid var(--border-gold);">
          <div class="card-title">🔗 Seu Link Exclusivo de Agendamento</div>
          <p style="font-size:.85rem;color:var(--text2);margin-bottom:.75rem;">
            Envie este link para seus clientes. Os agendamentos feitos por ele serão vinculados apenas a você.
          </p>
          <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">
            <input type="text" id="user-exclusive-link" value="${exclusiveLink}" readonly
              style="flex:1;min-width:0;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:.6rem .9rem;color:var(--gold);font-size:.85rem;cursor:pointer;"
              onclick="this.select()">
            <button class="btn" onclick="Admin.copyExclusiveLink()" style="white-space:nowrap;">📋 Copiar Link</button>
          </div>
          <div class="form-group" style="margin-top:1.25rem;">
            <label>📱 Seu WhatsApp (para receber notificações de novos agendamentos)</label>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
              <input type="tel" id="cfg-user-whatsapp" placeholder="(11) 99999-9999"
                value="${savedPhone}"
                oninput="Utils.maskPhone(this)"
                style="flex:1;min-width:0;">
              <button class="btn" onclick="Admin.saveUserWhatsApp()" style="white-space:nowrap;">💾 Salvar WhatsApp</button>
            </div>
            <small style="color:var(--text2);font-size:.78rem;">Quando um cliente agendar pelo seu link, você receberá uma notificação neste número.</small>
          </div>
        </div>
      `;
      // Insere antes do primeiro card de config
      const tabConfig = document.getElementById('tab-config');
      tabConfig.insertAdjacentHTML('afterbegin', linkCardHTML);
    }

    // Add colors section if not exists
    if (!document.getElementById('colors-card')) {
      const colorsHTML = `
        <div class="card" id="colors-card">
          <div class="card-title">Cores do Tema</div>
          <div class="config-grid">
            <div class="form-group">
              <label>Cor Principal (Gold)</label>
              <input type="color" id="cfg-gold" value="${cfg.colors?.gold || '#C9A84C'}" onchange="Admin.updateColor('gold', this.value)">
            </div>
            <div class="form-group">
              <label>Fundo Principal</label>
              <input type="color" id="cfg-bg" value="${cfg.colors?.bg || '#0E0E0F'}" onchange="Admin.updateColor('bg', this.value)">
            </div>
            <div class="form-group">
              <label>Fundo Secundário</label>
              <input type="color" id="cfg-bg2" value="${cfg.colors?.bg2 || '#181819'}" onchange="Admin.updateColor('bg2', this.value)">
            </div>
            <div class="form-group">
              <label>Texto Principal</label>
              <input type="color" id="cfg-text" value="${cfg.colors?.text || '#F0EDE8'}" onchange="Admin.updateColor('text', this.value)">
            </div>
            <div class="form-group">
              <label>Cor Verde</label>
              <input type="color" id="cfg-green" value="${cfg.colors?.green || '#3ECF8E'}" onchange="Admin.updateColor('green', this.value)">
            </div>
            <div class="form-group">
              <label>Cor Vermelha</label>
              <input type="color" id="cfg-red" value="${cfg.colors?.red || '#FF5C5C'}" onchange="Admin.updateColor('red', this.value)">
            </div>
          </div>
        </div>
      `;
      document.getElementById('tab-config').insertAdjacentHTML('beforeend', colorsHTML);
    }
  },

  _setupDaysCheck() {
    const cfg = Store.getConfig();
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const wrap = document.getElementById('days-check');
    wrap.innerHTML = names.map((n, i) => `
      <button class="day-btn ${cfg.workDays.includes(i) ? 'active' : ''}" 
        onclick="Admin._toggleDay(${i}, this)">${n}</button>
    `).join('');
  },

  _toggleDay(idx, btn) {
    btn.classList.toggle('active');
  },

  saveCredentials() {
    const user = document.getElementById('cfg-user').value.trim();
    const pass = document.getElementById('cfg-pass').value;

    if (!user) {
      Utils.toast('Informe o usuário.');
      return;
    }

    const cfg = Store.getConfig();
    cfg.user = user;

    if (pass) {
      cfg.pass = pass;

      // 🔥 aumenta sessionVersion pra derrubar qualquer sessão antiga
      cfg.sessionVersion = (cfg.sessionVersion || 1) + 1;
    }

    Store.setConfig(cfg);

    document.getElementById('cfg-pass').value = '';
    Utils.toast('Credenciais salvas! (Sessões antigas foram encerradas)');
  },

  saveHours() {
    const cfg = Store.getConfig();
    cfg.openTime = document.getElementById('cfg-open').value;
    cfg.closeTime = document.getElementById('cfg-close').value;
    cfg.interval = parseInt(document.getElementById('cfg-interval').value) || 30;
    // Dias ativos
    const activeDays = [];
    document.querySelectorAll('.day-btn.active').forEach(b => {
      const idx = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].indexOf(b.textContent);
      if (idx > -1) activeDays.push(idx);
    });
    cfg.workDays = activeDays;
    Store.setConfig(cfg);
    Utils.toast('Horários salvos!');
  },

  saveMessages() {
    const cfg = Store.getConfig();
    cfg.msgConfirmClient = document.getElementById('msg-confirm-client').value;
    cfg.msgReminder = document.getElementById('msg-reminder').value;
    cfg.barberPhone = document.getElementById('cfg-barber-phone').value.trim();
    Store.setConfig(cfg);
    Utils.toast('Mensagens salvas!');
  },

  saveDiscount() {
    const cfg = Store.getConfig();
    cfg.discount = parseInt(document.getElementById('cfg-discount').value) || 0;
    cfg.coupon = document.getElementById('cfg-coupon').value.trim();
    Store.setConfig(cfg);
    Utils.toast('Desconto salvo!');
  },

  //exlui agendamento financeiro 
  deletePayment(id) {

    const cfg = Store.getConfig();

    // cria overlay (fundo escuro)
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    // caixa modal
    const box = document.createElement('div');
    box.style.background = '#111';
    box.style.padding = '20px';
    box.style.border = '1px solid #333';
    box.style.borderRadius = '8px';
    box.style.minWidth = '280px';
    box.style.display = 'flex';
    box.style.flexDirection = 'column';
    box.style.gap = '10px';

    const input = document.createElement('input');
    input.type = 'password';
    input.placeholder = 'Digite a senha';
    input.style.padding = '10px';

    const btnOk = document.createElement('button');
    btnOk.innerText = 'Confirmar';
    btnOk.style.backgroundColor = '#035e1c';

    const btnCancel = document.createElement('button');
    btnCancel.innerText = 'Cancelar';
    btnCancel.style.backgroundColor = '#751010';


    box.appendChild(input);
    box.appendChild(btnOk);
    box.appendChild(btnCancel);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // 🔴 CLICAR FORA CANCELA
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });

    // botão cancelar
    btnCancel.onclick = () => {
      document.body.removeChild(overlay);
    };

    // botão confirmar
    btnOk.onclick = () => {

      const senha = input.value;

      if (senha !== cfg.pass) {
        Utils.toast('Senha incorreta!');
        document.body.removeChild(overlay);
        return;
      }

      if (!confirm('Tem certeza que deseja excluir este pagamento?')) {
        document.body.removeChild(overlay);
        return;
      }

      let bookings = Store.getBookings();

      bookings = bookings.filter(b => b.id !== id);

      Store.setBookings(bookings);

      Utils.toast('Pagamento excluído com sucesso!');

      this.renderFinanceiro();

      if (this._currentTab === 'dashboard') this.renderDashboard();
      if (this._currentTab === 'agenda') this.renderAgenda();

      document.body.removeChild(overlay);
    };
  },

  copyExclusiveLink() {
    const input = document.getElementById('user-exclusive-link');
    if (!input) return;
    input.select();
    try {
      navigator.clipboard.writeText(input.value).then(() => {
        Utils.toast('✅ Link copiado! Envie para seus clientes.');
      }).catch(() => {
        document.execCommand('copy');
        Utils.toast('✅ Link copiado!');
      });
    } catch (e) {
      document.execCommand('copy');
      Utils.toast('✅ Link copiado!');
    }
  },

  saveUserWhatsApp() {
    const loggedLogin = App.getLoggedLogin();
    const phone = document.getElementById('cfg-user-whatsapp').value.trim();
    if (!phone) { Utils.toast('Informe o número de WhatsApp.'); return; }
    Store.setUserWhatsApp(loggedLogin, phone);
    Utils.toast('✅ WhatsApp salvo com sucesso!');
  },

  updateColor(key, value) {
    document.documentElement.style.setProperty('--' + key, value);
    const cfg = Store.getConfig();
    if (!cfg.colors) cfg.colors = {};
    cfg.colors[key] = value;
    Store.setConfig(cfg);
  },
};

// Expor ao HTML
window.Admin = Admin;
window.Modal = Modal;