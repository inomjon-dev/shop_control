const loggedUserId = Number(localStorage.getItem('pc_user_id'));
if (!loggedUserId) window.location.href = 'index.html';

function getCurrentUser() {
    const { users } = getStoreData();
    return users.find(u => u.id === loggedUserId);
}

let currentUser = getCurrentUser();
if (!currentUser) {
    localStorage.removeItem('pc_user_id');
    window.location.href = 'index.html';
}

const isAdmin = currentUser.role === 'admin';
let uploadedDeviceImageBase64 = "";
let uploadedProfileAvatarBase64 = "";

// Xodimning ilovadagi faol vaqtini har 60 soniyada oshirib borish
setInterval(() => {
    const data = getStoreData();
    const idx = data.users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
        data.users[idx].activeMinutes = (data.users[idx].activeMinutes || 0) + 1;
        data.users[idx].isOnline = true;
        saveStoreData({ users: data.users });
        if (isAdmin) renderStaffKPI();
    }
}, 60000);

document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    setupUserUI();
    renderAll();
    lucide.createIcons();
});

// YIG'ILUVCHI SIDEBAR
function toggleSidebar() {
    const sidebar = document.getElementById('mainSidebar');
    const main = document.getElementById('mainContent');
    const icon = document.getElementById('sidebarToggleIcon');
    const isCollapsed = sidebar.classList.toggle('sidebar-collapsed');
    main.classList.toggle('main-expanded', isCollapsed);
    icon.setAttribute('data-lucide', isCollapsed ? 'panel-left-open' : 'panel-left-close');
    lucide.createIcons();
}

// DARK / LIGHT MODE
function applySavedTheme() {
    const saved = localStorage.getItem('pc_theme') || 'dark';
    const html = document.documentElement;
    const icon = document.getElementById('themeIcon');
    if (saved === 'light') {
        html.classList.remove('dark');
        html.classList.add('light');
        if (icon) icon.setAttribute('data-lucide', 'moon');
    } else {
        html.classList.remove('light');
        html.classList.add('dark');
        if (icon) icon.setAttribute('data-lucide', 'sun');
    }
}

function toggleTheme() {
    const isLight = document.documentElement.classList.contains('light');
    localStorage.setItem('pc_theme', isLight ? 'dark' : 'light');
    applySavedTheme();
    lucide.createIcons();
}

function setupUserUI() {
    currentUser = getCurrentUser();
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userRoleDisplay').textContent = isAdmin ? "Do'kon Egasi • Profil" : `${currentUser.branch} • Profil`;
    document.getElementById('branchScopeBadge').textContent = isAdmin ? "Barcha filiallar nazorati" : `Filial: ${currentUser.branch}`;

    const avatarBox = document.getElementById('sidebarAvatarBox');
    if (currentUser.avatar) {
        avatarBox.innerHTML = `<img src="${currentUser.avatar}" class="w-full h-full object-cover">`;
    } else {
        avatarBox.textContent = currentUser.name.charAt(0).toUpperCase();
    }

    const { rate } = getStoreData();
    const rateInput = document.getElementById('exchangeRateInput');
    rateInput.value = rate;

    if (!isAdmin) {
        rateInput.disabled = true;
        document.getElementById('adminStaffMenu').style.display = 'none';
        document.getElementById('branchFilter').style.display = 'none';
        document.getElementById('approvalsMenuLabel').textContent = "Mening so'rovlarim";
        document.getElementById('intakeSubmitBtn').textContent = "Adminga kirim so'rovi yuborish";
        document.getElementById('saleSubmitBtn').textContent = "Adminga sotuv so'rovi yuborish";
        document.getElementById('pBranch').value = currentUser.branch;
        document.getElementById('pBranch').disabled = true;
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
}

function updateExchangeRate() {
    if (!isAdmin) return;
    const newRate = Number(document.getElementById('exchangeRateInput').value);
    if (newRate > 1000) {
        saveStoreData({ rate: newRate });
        addAuditLog(currentUser.name, "Barcha filiallar", "Kurs yangilandi", `1$ = ${newRate.toLocaleString()} UZS`, "info");
        renderAll();
    }
}

// FILIAL BO'YICHA MA'LUMOTLARNI FILTRLASH (Xodim faqat o'z filialini ko'radi!)
function getScopedData() {
    const raw = getStoreData();
    if (isAdmin) return raw;
    const myBranch = currentUser.branch;
    return {
        ...raw,
        phones: raw.phones.filter(p => p.branch === myBranch),
        sales: raw.sales.filter(s => s.branch === myBranch),
        expenses: raw.expenses.filter(e => e.branch === myBranch),
        logs: raw.logs.filter(l => l.branch === myBranch)
    };
}

function renderAll() {
    renderKPI();
    renderInventory();
    renderApprovals();
    renderSales();
    renderDebts();
    renderAnalytics();
    if (isAdmin) renderStaffKPI();
    lucide.createIcons();
}

function getDaysInStock(dateStr) {
    if (!dateStr) return 1;
    const added = new Date(dateStr);
    const now = new Date("2026-11-17");
    const diff = Math.floor((now - added) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
}

// 1. KPI KARTOCHKALAR
function renderKPI() {
    const { phones, sales, expenses, approvals, rate } = getScopedData();
    const availablePhones = phones.filter(p => p.status === 'available');
    
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.soldPrice), 0);
    const grossProfit = sales.reduce((sum, s) => sum + (Number(s.soldPrice) - Number(s.costPrice)), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = grossProfit - totalExpenses;
    const totalStockCost = availablePhones.reduce((sum, p) => sum + Number(p.costPrice), 0);
    const pendingCount = isAdmin 
        ? approvals.filter(a => a.status === 'pending').length 
        : approvals.filter(a => a.sellerId === currentUser.id && a.status === 'pending').length;

    const kpiGrid = document.getElementById('kpiGrid');

    if (isAdmin) {
        kpiGrid.innerHTML = `
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-medium text-slate-400 uppercase">Sof Foyda (Net Profit)</span>
                <p class="text-2xl font-bold text-emerald-400 mt-2">$${netProfit.toLocaleString()}</p>
                <p class="text-xs text-slate-400 mt-1">Chiqimlar ($${totalExpenses}) ayrilgan</p>
            </div>
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-medium text-slate-400 uppercase">Jami Kirim (Savdo)</span>
                <p class="text-2xl font-bold mt-2">$${totalRevenue.toLocaleString()}</p>
                <p class="text-xs text-slate-400 mt-1">≈ ${(totalRevenue * rate).toLocaleString()} so'm</p>
            </div>
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-medium text-slate-400 uppercase">Ombor Kapitali</span>
                <p class="text-2xl font-bold text-cyan-400 mt-2">$${totalStockCost.toLocaleString()}</p>
                <p class="text-xs text-slate-400 mt-1">${availablePhones.length} ta qurilma omborda</p>
            </div>
            <div onclick="switchTab('approvals')" class="glass-card p-5 rounded-2xl cursor-pointer">
                <span class="text-xs font-medium text-slate-400 uppercase">Kutilayotgan So'rovlar</span>
                <p class="text-2xl font-bold text-amber-400 mt-2">${pendingCount} ta</p>
                <p class="text-xs text-slate-400 mt-1">Tasdiqlash kutilmoqda</p>
            </div>
        `;
    } else {
        const mySales = sales.filter(s => s.seller === currentUser.name);
        const myRevenue = mySales.reduce((sum, s) => sum + Number(s.soldPrice), 0);
        const bonusRate = (currentUser.bonusPercent || 2) / 100;

        kpiGrid.innerHTML = `
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-medium text-slate-400 uppercase">${currentUser.branch} Ombori</span>
                <p class="text-2xl font-bold mt-2">${availablePhones.length} dona</p>
                <p class="text-xs text-cyan-400 mt-1">Sotuvga tayyor qurilmalar</p>
            </div>
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-medium text-slate-400 uppercase">Filial Savdosi (Kirim)</span>
                <p class="text-2xl font-bold text-emerald-400 mt-2">$${totalRevenue.toLocaleString()}</p>
                <p class="text-xs text-slate-400 mt-1">Mening savdom: $${myRevenue}</p>
            </div>
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-medium text-slate-400 uppercase">Filial Chiqimlari</span>
                <p class="text-2xl font-bold text-rose-400 mt-2">-$${totalExpenses.toLocaleString()}</p>
                <p class="text-xs text-slate-400 mt-1">${expenses.length} ta xarajat yozilgan</p>
            </div>
            <div class="glass-card p-5 rounded-2xl">
                <span class="text-xs font-medium text-slate-400 uppercase">Mening Bonusim (${currentUser.bonusPercent || 2}%)</span>
                <p class="text-2xl font-bold text-amber-400 mt-2">$${Math.round(myRevenue * bonusRate)}</p>
                <p class="text-xs text-slate-400 mt-1">≈ ${(Math.round(myRevenue * bonusRate) * rate).toLocaleString()} so'm</p>
            </div>
        `;
    }
}

// 2. OMBOR VA KIMDAN OLINGANLIGI JADVALI
function renderInventory() {
    const { phones, rate } = getScopedData();
    const query = document.getElementById('searchInput').value.toLowerCase();
    const branch = document.getElementById('branchFilter').value;
    const condFilter = document.getElementById('conditionFilter').value;

    const filtered = phones.filter(p => {
        if (p.status !== 'available') return false;
        const matchQuery = p.model.toLowerCase().includes(query) || 
                           (p.sellerName && p.sellerName.toLowerCase().includes(query)) || 
                           (p.sellerPassport && p.sellerPassport.toLowerCase().includes(query)) ||
                           p.imei.includes(query);
        const matchBranch = !isAdmin || branch === 'all' || p.branch === branch;
        const matchCond = condFilter === 'all' || (p.condition && p.condition.includes(condFilter));
        return matchQuery && matchBranch && matchCond;
    });

    document.getElementById('inventoryTableBody').innerHTML = filtered.map(p => {
        const days = getDaysInStock(p.addedDate);
        const safeNote = (p.note || "").replace(/'/g, "");
        const thumbHtml = p.image 
            ? `<img src="${p.image}" onclick="openImageZoom('${p.image}', '${p.model}', '${safeNote}')" class="w-12 h-12 rounded-xl object-cover border border-slate-700 cursor-zoom-in shrink-0">`
            : `<div class="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 shrink-0"><i data-lucide="smartphone" class="w-5 h-5"></i></div>`;

        return `
            <tr class="hover:bg-slate-800/30 transition">
                <td class="py-3.5 px-4 max-w-xs">
                    <div class="flex items-start gap-3">
                        ${thumbHtml}
                        <div>
                            <div class="font-semibold"><span class="text-cyan-400 mr-1 text-xs font-bold uppercase">[${p.brand || 'Tel'}]</span>${p.model}</div>
                            <div class="text-xs text-slate-400 mt-0.5">${p.storage} • ${p.color}</div>
                            ${p.note ? `<div class="text-[11px] text-amber-400 mt-1 bg-amber-500/10 px-2 py-0.5 rounded">📝 ${p.note}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td class="py-3.5 px-4 font-mono text-xs text-cyan-400">${p.imei}</td>
                <td class="py-3.5 px-4">
                    <div class="text-xs font-medium">${p.sellerName || "Noma'lum"}</div>
                    <div class="text-[11px] text-slate-400">${p.sellerPhone || ''}</div>
                    <div class="text-[11px] font-mono text-amber-400 mt-0.5">Pasport: ${p.sellerPassport || 'Kiritilmagan'}</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="text-xs font-medium">AKB ${p.battery}% • ${p.condition}</div>
                    <div class="text-[11px] text-slate-400 mt-0.5">${p.branch} • ${days} kun</div>
                </td>
                ${isAdmin ? `<td class="py-3.5 px-4 text-slate-400 font-medium">$${p.costPrice}</td>` : ''}
                <td class="py-3.5 px-4">
                    <div class="font-bold">$${p.sellPrice}</div>
                    <div class="text-[11px] text-slate-400">${(p.sellPrice * rate).toLocaleString()} so'm</div>
                </td>
                <td class="py-3.5 px-4 text-right">
                    <button onclick="openSaleModal(${p.id})" class="bg-blue-600/20 hover:bg-blue-600 text-cyan-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">Sotish</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 3. SO'ROVLAR MARKAZI (HAM KIRIM, HAM SOTUV SO'ROVLARI)
function renderApprovals() {
    const { approvals } = getStoreData();
    const pending = approvals.filter(a => a.status === 'pending');
    document.getElementById('approvalBadge').textContent = pending.length;

    const visibleList = isAdmin ? approvals : approvals.filter(a => a.sellerId === currentUser.id);
    const container = document.getElementById('approvalsList');

    if (visibleList.length === 0) {
        container.innerHTML = `<div class="glass-panel p-8 rounded-2xl text-center text-slate-400">Hozircha hech qanday so'rov yo'q</div>`;
        return;
    }

    container.innerHTML = visibleList.map(app => {
        const statusBadge = app.status === 'pending' 
            ? `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400">⏳ Tasdiq kutilmoqda</span>`
            : app.status === 'approved'
            ? `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">✅ Tasdiqlangan</span>`
            : `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400">❌ Rad etilgan</span>`;

        const adminActions = (isAdmin && app.status === 'pending') ? `
            <div class="flex gap-2 mt-3 sm:mt-0">
                <button onclick="handleApproval(${app.id}, 'approve')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1">
                    <i data-lucide="check" class="w-3.5 h-3.5"></i> Tasdiqlash
                </button>
                <button onclick="handleApproval(${app.id}, 'reject')" class="bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1">
                    <i data-lucide="x" class="w-3.5 h-3.5"></i> Rad etish
                </button>
            </div>
        ` : '';

        return `
            <div class="glass-card p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-bold text-cyan-400">${app.actionType}</span>
                        <span class="text-xs text-slate-500">• ${app.time}</span>
                        ${statusBadge}
                    </div>
                    <p class="font-semibold text-sm">${app.summary}</p>
                    <p class="text-xs text-slate-400 mt-1">Xodim: <span class="text-slate-300 font-medium">${app.sellerName}</span></p>
                </div>
                ${adminActions}
            </div>
        `;
    }).join('');
}

function handleApproval(approvalId, decision) {
    if (!isAdmin) return;
    const data = getStoreData();
    const idx = data.approvals.findIndex(a => a.id === approvalId);
    if (idx === -1) return;

    const app = data.approvals[idx];
    if (decision === 'approve') {
        app.status = 'approved';
        if (app.category === 'intake') {
            // Telefon sotib olish so'rovi tasdiqlandi -> omborga qo'shiladi
            data.phones.unshift(app.payload);
            addAuditLog(currentUser.name, app.payload.branch, "Kirim tasdiqlandi", `${app.payload.model} omborga qo'shildi`, "intake");
        } else {
            // Sotuv so'rovi tasdiqlandi
            executeSaleTransaction(data, app.payload, app.sellerName);
            addAuditLog(currentUser.name, app.branch || "Asosiy filial", "Sotuv tasdiqlandi", `${app.sellerName} savdosi tasdiqlandi`, "sale");
        }
    } else {
        app.status = 'rejected';
        if (app.category !== 'intake') {
            const pIdx = data.phones.findIndex(p => p.id === app.payload.phoneId);
            if (pIdx !== -1 && data.phones[pIdx].status === 'pending_sale') data.phones[pIdx].status = 'available';
        }
    }

    saveStoreData({ approvals: data.approvals, phones: data.phones, sales: data.sales });
    renderAll();
}

// 4. SOTUVLAR TARIXI (KIM SOTIB OLGAN VA KIMDAN OLINGAN EDI)
function renderSales() {
    const { sales } = getScopedData();
    document.getElementById('salesTableBody').innerHTML = sales.map(s => {
        const profit = s.soldPrice - s.costPrice;
        return `
            <tr class="hover:bg-slate-800/30">
                <td class="py-3.5 px-4">
                    <div class="text-xs font-mono text-cyan-400">${s.receiptNo}</div>
                    <div class="text-[11px] text-slate-400">${s.date}</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-medium">${s.model}</div>
                    <div class="text-xs font-mono text-slate-400">${s.imei}</div>
                    <div class="text-[11px] text-emerald-400 mt-0.5">${s.conditionAtSale || 'Ideal'}</div>
                </td>
                <td class="py-3.5 px-4">
                    <div class="text-xs font-semibold">${s.customerName || s.customer}</div>
                    <div class="text-[11px] text-slate-400">${s.customerPhone || ''} ${s.customerPassport ? '• Pasport: ' + s.customerPassport : ''}</div>
                    <div class="text-[11px] text-cyan-400 mt-0.5">Sotuvchi: ${s.seller}</div>
                </td>
                <td class="py-3.5 px-4 text-xs text-slate-400 max-w-[200px]">
                    ${s.boughtFrom || "Ta'minotchidan olingan"}
                </td>
                <td class="py-3.5 px-4">
                    <div class="font-bold">$${s.soldPrice}</div>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">${s.paymentType}</span>
                </td>
                ${isAdmin ? `<td class="py-3.5 px-4 font-bold text-emerald-400">+$${profit}</td>` : ''}
                <td class="py-3.5 px-4 text-right">
                    <button onclick="showReceipt(${s.id})" class="bg-slate-800 px-2.5 py-1.5 rounded-lg text-xs">Chek</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 5. STATISTIKA, KIRIM-CHIQIM & AI BIZNES TAHLILCHI
function renderAnalytics() {
    const { phones, sales, expenses, logs, rate } = getScopedData();

    const totalKirim = sales.reduce((s, x) => s + Number(x.soldPrice), 0);
    const soldPhonesCost = sales.reduce((s, x) => s + Number(x.costPrice), 0);
    const operatingExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalChiqim = soldPhonesCost + operatingExpenses;
    const sofFoyda = totalKirim - totalChiqim;

    // AI TAHLILCHI XULOSALARI GENERATSIYASI
    const availablePhones = phones.filter(p => p.status === 'available');
    const oldPhones = availablePhones.filter(p => getDaysInStock(p.addedDate) >= 30);
    const totalDebts = sales.reduce((s, x) => s + Number(x.debtAmount || 0), 0);
    const marginPercent = totalKirim > 0 ? Math.round((sofFoyda / totalKirim) * 100) : 0;

    const aiInsights = [
        {
            icon: "trending-up", color: "text-emerald-400",
            title: "Rentabellik va Sof Foyda tahlili",
            text: `Joriy hududda jami $${totalKirim.toLocaleString()} savdo qilindi. Barcha tan narx va $${operatingExpenses} lik xarajatlardan so'ng sof foyda marjasi ${marginPercent}% ($${sofFoyda}) ni tashkil etmoqda.`
        },
        {
            icon: "alert-triangle", color: "text-amber-400",
            title: "Ombor aylanmasi va O'lik yuklar",
            text: oldPhones.length > 0 
                ? `Diqqat! Omborda ${oldPhones.length} ta qurilma 30 kundan ortiq turib qolgan (${oldPhones[0].model}). Narx tushishidan oldin ularga chegirma e'lon qilish tavsiya etiladi.`
                : `Ombordagi barcha ${availablePhones.length} ta telefon yangi kelgan (30 kundan kam), tovar aylanmasi sog'lom holatda.`
        },
        {
            icon: "wallet", color: "text-rose-400",
            title: "Nasiya va Naqd pul oqimi",
            text: totalDebts > 0 
                ? `Mijozlarda $${totalDebts} miqdorida yopilmagan nasiya mavjud. Qarzlar ulushi umumiy savdoning ${Math.round((totalDebts / (totalKirim || 1)) * 100)}% qismini tashkil qiladi.`
                : `Barcha savdolar to'liq yopilgan, muddati o'tgan qarzdorlik mavjud emas.`
        },
        {
            icon: "shield-check", color: "text-cyan-400",
            title: "Pasport va IMEI Xavfsizlik Holati",
            text: `Ombordagi ${availablePhones.length} ta qurilmaning barchasi 15 xonali IMEI va sotib olingan egasining pasport ma'lumotlari bilan himoyalangan.`
        }
    ];

    document.getElementById('aiInsightsContainer').innerHTML = aiInsights.map(item => `
        <div class="p-3.5 rounded-xl bg-slate-900/75 border border-slate-800 flex items-start gap-3">
            <i data-lucide="${item.icon}" class="w-4 h-4 ${item.color} shrink-0 mt-0.5"></i>
            <div>
                <p class="font-bold text-slate-200 mb-0.5">${item.title}</p>
                <p class="text-slate-400">${item.text}</p>
            </div>
        </div>
    `).join('');

    // Moliyaviy balans kartochkalari
    document.getElementById('financialBalanceCards').innerHTML = `
        <div class="glass-card p-5 rounded-2xl border-l-4 border-l-blue-500">
            <span class="text-xs uppercase text-slate-400 font-semibold">Jami Kirim (Savdo Tushumi)</span>
            <p class="text-2xl font-extrabold text-blue-400 mt-1">+$${totalKirim.toLocaleString()}</p>
            <p class="text-xs text-slate-400 mt-1">${sales.length} ta sotilgan qurilma</p>
        </div>
        <div class="glass-card p-5 rounded-2xl border-l-4 border-l-rose-500">
            <span class="text-xs uppercase text-slate-400 font-semibold">Jami Chiqim (Tan narx + Xarajat)</span>
            <p class="text-2xl font-extrabold text-rose-400 mt-1">-$${totalChiqim.toLocaleString()}</p>
            <p class="text-xs text-slate-400 mt-1">Tovar: $${soldPhonesCost} • Xarajat: $${operatingExpenses}</p>
        </div>
        <div class="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500">
            <span class="text-xs uppercase text-slate-400 font-semibold">Toza Sof Foyda</span>
            <p class="text-2xl font-extrabold text-emerald-400 mt-1">$${sofFoyda.toLocaleString()}</p>
            <p class="text-xs text-slate-400 mt-1">≈ ${(sofFoyda * rate).toLocaleString()} so'm</p>
        </div>
    `;

    // Chiqimlar ro'yxati
    document.getElementById('expensesList').innerHTML = expenses.map(e => `
        <div class="flex justify-between items-center p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <div>
                <p class="font-semibold">${e.title}</p>
                <p class="text-[11px] text-slate-400">${e.date} • ${e.branch} (${e.actor})</p>
            </div>
            <span class="font-bold text-rose-400">-$${e.amount}</span>
        </div>
    `).join('');

    // To'lov usullari
    const totalRev = totalKirim || 1;
    const types = ["Naqd", "Karta / Terminal", "Trade-in", "Nasiya"];
    document.getElementById('paymentStatsContainer').innerHTML = types.map(t => {
        const sum = sales.filter(s => s.paymentType.includes(t.split(' ')[0])).reduce((a, b) => a + Number(b.soldPrice), 0);
        const pct = Math.round((sum / totalRev) * 100);
        return `
            <div>
                <div class="flex justify-between text-xs mb-1">
                    <span class="text-slate-300 font-medium">${t}</span>
                    <span class="font-bold">$${sum.toLocaleString()} (${pct}%)</span>
                </div>
                <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-cyan-400" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');

    // Audit Log
    document.getElementById('auditLogList').innerHTML = logs.map(l => `
        <div class="flex items-start justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs gap-3">
            <div>
                <span class="font-bold text-cyan-400">[${l.action}]</span> <span>${l.detail}</span>
                <p class="text-[11px] text-slate-400 mt-0.5">${l.branch} • Xodim: ${l.actor}</p>
            </div>
            <span class="text-[11px] font-mono text-slate-500 shrink-0">${l.time}</span>
        </div>
    `).join('');
}

function openExpenseModal() {
    document.getElementById('expenseModal').classList.remove('hidden');
    document.getElementById('expenseModal').classList.add('flex');
}

document.getElementById('expenseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = getStoreData();
    const branch = isAdmin ? "Asosiy filial" : currentUser.branch;
    const newExp = {
        id: Date.now(), date: "2026-11-17",
        title: document.getElementById('expTitle').value,
        amount: Number(document.getElementById('expAmount').value),
        branch: branch, actor: currentUser.name
    };
    data.expenses.unshift(newExp);
    saveStoreData({ expenses: data.expenses });
    addAuditLog(currentUser.name, branch, "Chiqim", `${newExp.title} (-$${newExp.amount})`, "info");
    closeModal('expenseModal');
    e.target.reset();
    renderAll();
});

// 6. XODIMLAR & FAOLLIK VAQTI NAZORATI
function renderStaffKPI() {
    const { users, sales } = getStoreData();
    document.getElementById('staffKpiList').innerHTML = users.map(u => {
        const sellerSales = sales.filter(s => s.seller === u.name);
        const totalSum = sellerSales.reduce((sum, s) => sum + Number(s.soldPrice), 0);
        const mins = u.activeMinutes || 0;
        const hoursText = mins >= 60 ? `${Math.floor(mins / 60)} soat ${mins % 60} daq` : `${mins} daqiqa`;
        const avatarHtml = u.avatar ? `<img src="${u.avatar}" class="w-full h-full object-cover">` : u.name.charAt(0);

        return `
            <div class="glass-card p-5 rounded-2xl space-y-3">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 overflow-hidden relative">
                            ${avatarHtml}
                        </div>
                        <div>
                            <h4 class="font-bold flex items-center gap-2">
                                ${u.name}
                                <span class="w-2 h-2 rounded-full ${u.isOnline ? 'bg-emerald-400' : 'bg-slate-500'}" title="${u.isOnline ? 'Hozir onlayn' : 'Oflayn'}"></span>
                            </h4>
                            <p class="text-xs text-slate-400">Login: <span class="font-mono text-cyan-400">${u.username}</span> • ${u.branch}</p>
                        </div>
                    </div>
                    ${u.role !== 'admin' ? `<button onclick="toggleStaffStatus(${u.id})" class="text-xs px-3 py-1 rounded-lg border ${u.active !== false ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'}">${u.active !== false ? 'Faol' : 'Blok'}</button>` : ''}
                </div>
                <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                    <div class="bg-slate-900/60 p-2 rounded-xl">
                        <span class="text-slate-400 block text-[10px]">Oxirgi kirish</span>
                        <span class="font-semibold">${u.lastLogin || 'Bugun'}</span>
                    </div>
                    <div class="bg-slate-900/60 p-2 rounded-xl">
                        <span class="text-slate-400 block text-[10px]">Ilovadagi faollik</span>
                        <span class="font-semibold text-amber-400">⏱ ${hoursText}</span>
                    </div>
                    <div class="bg-slate-900/60 p-2 rounded-xl">
                        <span class="text-slate-400 block text-[10px]">Savdo hajmi</span>
                        <span class="font-semibold text-emerald-400">$${totalSum} (${sellerSales.length} ta)</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleStaffStatus(userId) {
    const data = getStoreData();
    const idx = data.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
        data.users[idx].active = data.users[idx].active === false ? true : false;
        saveStoreData({ users: data.users });
        renderAll();
    }
}

function openAddStaffModal() {
    document.getElementById('addStaffModal').classList.remove('hidden');
    document.getElementById('addStaffModal').classList.add('flex');
}

document.getElementById('addStaffForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = getStoreData();
    data.users.push({
        id: Date.now(), name: document.getElementById('stName').value, phone: document.getElementById('stPhone').value,
        username: document.getElementById('stUsername').value.trim().toLowerCase(),
        password: document.getElementById('stPassword').value.trim(), avatar: "", role: "staff",
        branch: document.getElementById('stBranch').value, bonusPercent: Number(document.getElementById('stBonus').value),
        active: true, lastLogin: "Hali kirmagan", activeMinutes: 0, isOnline: false
    });
    saveStoreData({ users: data.users });
    closeModal('addStaffModal');
    e.target.reset();
    renderAll();
});

// 7. PROFIL SOZLAMALARI (Admin Loginni o'zgartira oladi)
function openProfileModal() {
    currentUser = getCurrentUser();
    uploadedProfileAvatarBase64 = currentUser.avatar || "";
    document.getElementById('profName').value = currentUser.name;
    document.getElementById('profPhone').value = currentUser.phone || "";
    document.getElementById('profUsername').value = currentUser.username;
    document.getElementById('profPassword').value = currentUser.password;

    const uInput = document.getElementById('profUsername');
    if (isAdmin) {
        uInput.disabled = false;
        document.getElementById('loginEditHint').textContent = "(o'zgartirish mumkin)";
    } else {
        uInput.disabled = true;
        document.getElementById('loginEditHint').textContent = "(faqat admin o'zgartiradi)";
    }

    const prev = document.getElementById('profAvatarPreview');
    prev.innerHTML = currentUser.avatar ? `<img src="${currentUser.avatar}" class="w-full h-full object-cover">` : currentUser.name.charAt(0).toUpperCase();

    document.getElementById('profileModal').classList.remove('hidden');
    document.getElementById('profileModal').classList.add('flex');
}

function previewProfileAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedProfileAvatarBase64 = e.target.result;
        document.getElementById('profAvatarPreview').innerHTML = `<img src="${uploadedProfileAvatarBase64}" class="w-full h-full object-cover">`;
    };
    reader.readAsDataURL(file);
}

document.getElementById('profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = getStoreData();
    const idx = data.users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
        data.users[idx].name = document.getElementById('profName').value;
        data.users[idx].phone = document.getElementById('profPhone').value;
        if (isAdmin) data.users[idx].username = document.getElementById('profUsername').value.trim().toLowerCase();
        data.users[idx].password = document.getElementById('profPassword').value;
        data.users[idx].avatar = uploadedProfileAvatarBase64;
        saveStoreData({ users: data.users });
    }
    closeModal('profileModal');
    setupUserUI();
    renderAll();
});

// 8. NASIYA, KIRIM VA SOTUV AMALIYOTLARI
function renderDebts() {
    const { sales } = getScopedData();
    const debts = sales.filter(s => s.debtAmount > 0);
    document.getElementById('debtBadge').textContent = debts.length;
    const container = document.getElementById('debtsContainer');
    if (debts.length === 0) {
        container.innerHTML = `<div class="glass-panel p-8 rounded-2xl text-center text-slate-400 col-span-2">Faol nasiyalar yo'q</div>`;
        return;
    }
    container.innerHTML = debts.map(d => `
        <div class="glass-card p-5 rounded-2xl flex flex-col justify-between">
            <div>
                <div class="flex justify-between"><h4 class="font-bold">${d.customerName || d.customer}</h4><span class="bg-rose-500/20 text-rose-400 text-xs px-2.5 py-1 rounded-lg font-bold">Qarz: $${d.debtAmount}</span></div>
                <p class="text-xs text-slate-400 mt-1">${d.model} • IMEI: ${d.imei}</p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
                <span class="text-xs text-slate-400">To'langan: $${d.paidAmount} / $${d.soldPrice}</span>
                <button onclick="closeDebt(${d.id})" class="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold">Qarzni yopish</button>
            </div>
        </div>
    `).join('');
}

function closeDebt(saleId) {
    const data = getStoreData();
    const idx = data.sales.findIndex(s => s.id === saleId);
    if (idx !== -1) {
        data.sales[idx].paidAmount = data.sales[idx].soldPrice;
        data.sales[idx].debtAmount = 0;
        data.sales[idx].paymentType = "To'liq yopilgan";
        saveStoreData({ sales: data.sales });
        renderAll();
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600/20', 'text-cyan-400', 'border', 'border-blue-500/30');
        btn.classList.add('text-slate-400');
    });
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('bg-blue-600/20', 'text-cyan-400', 'border', 'border-blue-500/30');
        activeBtn.classList.remove('text-slate-400');
    }
}

function populateModelsByBrand() {
    const brand = document.getElementById('pBrand').value;
    const modelSelect = document.getElementById('pModelSelect');
    const customInput = document.getElementById('pCustomModel');
    if (brand === "Boshqa") {
        modelSelect.innerHTML = `<option value="custom">Qo'lda kiritish...</option>`;
        customInput.classList.remove('hidden');
        return;
    }
    const models = PHONE_CATALOG[brand] || [];
    modelSelect.innerHTML = models.map(m => `<option value="${m}">${m}</option>`).join('') + `<option value="custom">+ Boshqa model...</option>`;
    customInput.classList.add('hidden');
}

function checkCustomModel() {
    const isCustom = document.getElementById('pModelSelect').value === 'custom';
    document.getElementById('pCustomModel').classList.toggle('hidden', !isCustom);
}

function calcIntakeProfit() {
    const cost = Number(document.getElementById('pCost').value || 0);
    const sell = Number(document.getElementById('pSell').value || 0);
    document.getElementById('intakeProfitPreview').textContent = (cost > 0 && sell > 0) ? `Kutilayotgan sof foyda: +$${sell - cost}` : "";
}

function previewDeviceImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedDeviceImageBase64 = e.target.result;
        document.getElementById('photoPreviewBox').innerHTML = `<img src="${uploadedDeviceImageBase64}" class="w-full h-full object-cover">`;
    };
    reader.readAsDataURL(file);
}

function openImageZoom(imgUrl, title, note = "") {
    document.getElementById('zoomedImg').src = imgUrl;
    document.getElementById('zoomedCaption').textContent = title;
    document.getElementById('zoomedNote').textContent = note;
    document.getElementById('imageZoomModal').classList.remove('hidden');
    document.getElementById('imageZoomModal').classList.add('flex');
}

function openAddPhoneModal() {
    uploadedDeviceImageBase64 = "";
    populateModelsByBrand();
    if (!isAdmin) document.getElementById('pBranch').value = currentUser.branch;
    document.getElementById('addPhoneModal').classList.remove('hidden');
    document.getElementById('addPhoneModal').classList.add('flex');
}

document.getElementById('addPhoneForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = getStoreData();
    const sel = document.getElementById('pModelSelect').value;
    const finalModel = sel === 'custom' ? document.getElementById('pCustomModel').value : sel;
    const branch = isAdmin ? document.getElementById('pBranch').value : currentUser.branch;

    const newPhoneObj = {
        id: Date.now(), brand: document.getElementById('pBrand').value, model: finalModel,
        storage: document.getElementById('pStorage').value, color: document.getElementById('pColor').value,
        region: "Global", boxStatus: "Bor (Full)", imei: document.getElementById('pImei').value,
        battery: Number(document.getElementById('pBattery').value), condition: document.getElementById('pCondition').value,
        sellerName: document.getElementById('pSellerName').value,
        sellerPhone: document.getElementById('pSellerPhone').value,
        sellerPassport: document.getElementById('pSellerPassport').value.toUpperCase(),
        note: document.getElementById('pNote').value.trim(), image: uploadedDeviceImageBase64 || "",
        costPrice: Number(document.getElementById('pCost').value), minPrice: Number(document.getElementById('pMin').value),
        sellPrice: Number(document.getElementById('pSell').value), branch: branch,
        addedDate: "2026-11-17", addedBy: currentUser.name, status: "available"
    };

    if (isAdmin) {
        data.phones.unshift(newPhoneObj);
        saveStoreData({ phones: data.phones });
        addAuditLog(currentUser.name, branch, "Kirim", `${finalModel} (${newPhoneObj.sellerName}) omborga olindi`, "intake");
    } else {
        data.approvals.unshift({
            id: Date.now(), time: new Date().toLocaleString('uz-UZ', { hour12: false }).slice(0, 17),
            sellerId: currentUser.id, sellerName: currentUser.name, category: "intake",
            actionType: "Tel Sotib Olish (Kirim)", summary: `${finalModel} ($${newPhoneObj.costPrice}) — Egasining pasporti: ${newPhoneObj.sellerPassport}`,
            payload: newPhoneObj, status: "pending"
        });
        saveStoreData({ approvals: data.approvals });
        switchTab('approvals');
    }

    closeModal('addPhoneModal');
    e.target.reset();
    renderAll();
});

function openSaleModal(preselectId = null) {
    const { phones } = getScopedData();
    const available = phones.filter(p => p.status === 'available');
    const select = document.getElementById('salePhoneSelect');
    select.innerHTML = available.map(p => `<option value="${p.id}" data-price="${p.sellPrice}" data-min="${p.minPrice || p.costPrice}" data-info="${p.condition} • AKB ${p.battery}% • Kimdan olingan: ${p.sellerName} (${p.sellerPassport})">${p.model} (${p.storage}) — IMEI: ${p.imei} ($${p.sellPrice})</option>`).join('');
    if (preselectId) select.value = preselectId;
    document.getElementById('priceWarning').classList.add('hidden');
    updateSalePrice();
    document.getElementById('saleModal').classList.remove('hidden');
    document.getElementById('saleModal').classList.add('flex');
}

function updateSalePrice() {
    const select = document.getElementById('salePhoneSelect');
    const opt = select.options[select.selectedIndex];
    if (opt) {
        document.getElementById('finalSellPrice').value = opt.getAttribute('data-price');
        document.getElementById('selectedDeviceDetails').textContent = opt.getAttribute('data-info');
        calculateUzs();
    }
}

function calculateUzs() {
    const { rate } = getStoreData();
    const usd = Number(document.getElementById('finalSellPrice').value || 0);
    document.getElementById('uzsEquivalent').textContent = `So'mdagi qiymati: ${(usd * rate).toLocaleString()} UZS`;
}

function toggleExtraFields() {
    const type = document.getElementById('paymentType').value;
    document.getElementById('debtFields').classList.toggle('hidden', type !== 'Nasiya');
    document.getElementById('tradeInFields').classList.toggle('hidden', type !== 'Trade-in (Barter)');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
    document.getElementById(id).classList.remove('flex');
}

function executeSaleTransaction(data, payload, sellerName) {
    const pIdx = data.phones.findIndex(p => p.id === payload.phoneId);
    if (pIdx === -1) return null;
    const phone = data.phones[pIdx];
    data.phones[pIdx].status = 'sold';

    const newSale = {
        id: Date.now(), receiptNo: `PC-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleString('uz-UZ', { hour12: false }).slice(0, 16),
        model: `${phone.model} (${phone.storage})`, imei: phone.imei,
        conditionAtSale: `${payload.saleConditionNote} • AKB ${phone.battery}%`,
        boughtFrom: `${phone.sellerName} (${phone.sellerPhone} | ${phone.sellerPassport})`,
        customerName: payload.custName, customerPhone: payload.custPhone, customerPassport: payload.custPassport,
        seller: sellerName, branch: phone.branch, paymentType: payload.paymentType, warrantyDays: payload.warrantyDays,
        costPrice: phone.costPrice, soldPrice: payload.soldPrice, paidAmount: payload.paidAmount, debtAmount: payload.debtAmount, dueDate: payload.dueDate
    };
    data.sales.unshift(newSale);
    return newSale;
}

document.getElementById('saleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = getStoreData();
    const phoneId = Number(document.getElementById('salePhoneSelect').value);
    const phone = data.phones.find(p => p.id === phoneId);
    if (!phone) return;

    const soldPrice = Number(document.getElementById('finalSellPrice').value);
    const minAllowed = Number(phone.minPrice || phone.costPrice);
    if (!isAdmin && soldPrice < minAllowed) {
        const w = document.getElementById('priceWarning');
        w.textContent = `Xatolik: $${minAllowed} dan arzonga sotish mumkin emas!`;
        w.classList.remove('hidden');
        return;
    }

    const paymentType = document.getElementById('paymentType').value;
    const paidAmount = paymentType === 'Nasiya' ? Number(document.getElementById('paidAmount').value) : soldPrice;
    const payload = {
        phoneId, soldPrice, paymentType, paidAmount, debtAmount: soldPrice - paidAmount,
        dueDate: document.getElementById('dueDate').value,
        custName: document.getElementById('custName').value,
        custPhone: document.getElementById('custPhone').value,
        custPassport: document.getElementById('custPassport').value.toUpperCase(),
        saleConditionNote: document.getElementById('saleConditionNote').value,
        warrantyDays: Number(document.getElementById('warrantyDays').value)
    };

    if (isAdmin) {
        const createdSale = executeSaleTransaction(data, payload, currentUser.name);
        saveStoreData({ phones: data.phones, sales: data.sales });
        addAuditLog(currentUser.name, phone.branch, "Sotuv", `${createdSale.model} ($${soldPrice}) — Xaridor: ${payload.custName}`, "sale");
        closeModal('saleModal');
        e.target.reset();
        renderAll();
        showReceipt(createdSale.id);
    } else {
        const pIdx = data.phones.findIndex(p => p.id === phoneId);
        data.phones[pIdx].status = 'pending_sale';
        data.approvals.unshift({
            id: Date.now(), time: new Date().toLocaleString('uz-UZ', { hour12: false }).slice(0, 17),
            sellerId: currentUser.id, sellerName: currentUser.name, category: "sale", branch: phone.branch,
            actionType: `Sotuv (${paymentType})`, summary: `${phone.model} — $${soldPrice} ga Xaridor: ${payload.custName} (${payload.custPhone})`,
            payload: payload, status: "pending"
        });
        saveStoreData({ phones: data.phones, approvals: data.approvals });
        closeModal('saleModal');
        e.target.reset();
        renderAll();
        switchTab('approvals');
    }
});

function showReceipt(saleId) {
    const { sales, rate } = getStoreData();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;
    document.getElementById('recNo').textContent = `Chek: ${sale.receiptNo} • ${sale.date}`;
    document.getElementById('receiptBody').innerHTML = `
        <div class="flex justify-between py-1 border-b border-slate-100"><span>Qurilma:</span><span class="font-bold">${sale.model}</span></div>
        <div class="flex justify-between py-1 border-b border-slate-100"><span>Sotuv holati:</span><span>${sale.conditionAtSale}</span></div>
        <div class="flex justify-between py-1 border-b border-slate-100"><span>IMEI:</span><span class="font-mono font-bold">${sale.imei}</span></div>
        <div class="flex justify-between py-1 border-b border-slate-100"><span>Xaridor:</span><span>${sale.customerName} (${sale.customerPhone})</span></div>
        <div class="flex justify-between py-1 border-b border-slate-100"><span>Sotuvchi:</span><span>${sale.seller}</span></div>
        <div class="flex justify-between py-1 border-b border-slate-100"><span>Kafolat:</span><span class="font-bold text-emerald-700">${sale.warrantyDays} kun</span></div>
        <div class="flex justify-between pt-2 text-base font-extrabold"><span>JAMI:</span><span>$${sale.soldPrice} (${(sale.soldPrice * rate).toLocaleString()} so'm)</span></div>
    `;
    document.getElementById('receiptModal').classList.remove('hidden');
    document.getElementById('receiptModal').classList.add('flex');
}

function logout() {
    const data = getStoreData();
    const idx = data.users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
        data.users[idx].isOnline = false;
        saveStoreData({ users: data.users });
    }
    localStorage.removeItem('pc_user_id');
    window.location.href = 'index.html';
}