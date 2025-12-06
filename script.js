// Konfigurasi State
const STATE = {
    transactions: [],
    currency: 'IDR', // 'IDR' atau 'USD'
    currentPage: 1,
    rowsPerPage: 20,
    storageKey: 'noteup_data_v1'
};

// DOM Elements
const els = {
    balance: document.getElementById('displayBalance'),
    income: document.getElementById('displayIncome'),
    expense: document.getElementById('displayExpense'),
    form: document.getElementById('transactionForm'),
    tableBody: document.getElementById('tableBody'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    pageIndicator: document.getElementById('pageIndicator'),
    recordCount: document.getElementById('recordCount'),
    currencyToggle: document.getElementById('currencyToggle'),
    currencyLabel: document.getElementById('currencyLabel'),
    amountInput: document.getElementById('inputAmount')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    renderAll();
    setupEventListeners();
});

// --- Event Listeners ---
function setupEventListeners() {
    // Form Submit
    els.form.addEventListener('submit', handleFormSubmit);

    // Pagination
    els.prevBtn.addEventListener('click', () => changePage(-1));
    els.nextBtn.addEventListener('click', () => changePage(1));

    // Currency Toggle
    els.currencyToggle.addEventListener('click', toggleCurrency);
}

// --- Core Logic ---

function loadData() {
    const rawData = localStorage.getItem(STATE.storageKey);
    if (rawData) {
        STATE.transactions = JSON.parse(rawData);
    }
}

function saveData() {
    localStorage.setItem(STATE.storageKey, JSON.stringify(STATE.transactions));
    renderAll();
}

function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(els.form);
    const amount = parseFloat(formData.get('amount'));
    const type = formData.get('type');
    const msg = formData.get('message') || (type === 'income' ? 'Pemasukan' : 'Pengeluaran');

    if (!amount || amount <= 0) {
        alert("Mohon masukkan nominal yang valid.");
        return;
    }

    const newTransaction = {
        id: Date.now(), // Unique ID based on timestamp
        date: new Date().toISOString(),
        type: type, // 'income' or 'expense'
        amount: amount,
        message: msg,
        currency: STATE.currency // Simpan mata uang saat input
    };

    // Add to beginning of array (Newest first)
    STATE.transactions.unshift(newTransaction);
    
    saveData();
    els.form.reset();
}

function deleteTransaction(id) {
    if(confirm("Hapus catatan ini?")) {
        STATE.transactions = STATE.transactions.filter(t => t.id !== id);
        saveData();
    }
}

// --- Rendering & UI ---

function renderAll() {
    updateSummary();
    renderTable();
}

function updateSummary() {
    let totalIncome = 0;
    let totalExpense = 0;

    STATE.transactions.forEach(t => {
        // Konversi sederhana jika perlu (disini diasumsikan 1 USD = 15000 IDR untuk simulasi visual jika currency campur)
        // Namun untuk simplicitas MVP, kita asumsikan angka nominal sesuai currency yang aktif atau mentah.
        // Fitur profesional: Seharusnya menyimpan rate saat transaksi.
        // Disini kita jumlahkan raw value sesuai filternya.
        
        if (t.type === 'income') totalIncome += t.amount;
        if (t.type === 'expense') totalExpense += t.amount;
    });

    const totalBalance = totalIncome - totalExpense;

    els.balance.innerText = formatMoney(totalBalance);
    els.income.innerText = formatMoney(totalIncome);
    els.expense.innerText = formatMoney(totalExpense);
    
    // Warna Balance dinamis
    els.balance.className = `text-3xl font-bold mt-2 ${totalBalance >= 0 ? 'text-white' : 'text-rose-500'}`;
}

function renderTable() {
    els.tableBody.innerHTML = '';
    
    const totalItems = STATE.transactions.length;
    els.recordCount.innerText = `${totalItems} Data`;

    // Pagination Logic
    const start = (STATE.currentPage - 1) * STATE.rowsPerPage;
    const end = start + STATE.rowsPerPage;
    const paginatedItems = STATE.transactions.slice(start, end);

    if (paginatedItems.length === 0) {
        els.tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-8 text-center text-slate-500">
                    Tidak ada data di halaman ini.
                </td>
            </tr>
        `;
    } else {
        paginatedItems.forEach(t => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-800/50 transition duration-150 fade-in group';
            
            const isIncome = t.type === 'income';
            const amountClass = isIncome ? 'text-emerald-400' : 'text-rose-400';
            const sign = isIncome ? '+' : '-';

            // Format Date
            const dateObj = new Date(t.date);
            const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-slate-300">
                    <div class="font-medium">${dateStr}</div>
                    <div class="text-xs text-slate-500">${timeStr}</div>
                </td>
                <td class="px-6 py-4 text-slate-300">
                    <span class="block truncate max-w-[150px] sm:max-w-xs" title="${t.message}">${t.message}</span>
                </td>
                <td class="px-6 py-4 text-right font-mono font-medium ${amountClass}">
                    ${sign} ${formatMoney(t.amount)}
                </td>
                <td class="px-6 py-4 text-center">
                    <button onclick="deleteTransaction(${t.id})" class="text-slate-500 hover:text-rose-500 transition p-2 rounded hover:bg-rose-500/10" title="Hapus">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </td>
            `;
            els.tableBody.appendChild(row);
        });
    }

    // Update Buttons
    els.pageIndicator.innerText = `Page ${STATE.currentPage} of ${Math.ceil(totalItems / STATE.rowsPerPage) || 1}`;
    els.prevBtn.disabled = STATE.currentPage === 1;
    els.nextBtn.disabled = end >= totalItems;
}

function changePage(direction) {
    STATE.currentPage += direction;
    renderTable();
}

// --- Utilities ---

function formatMoney(amount) {
    const locale = STATE.currency === 'IDR' ? 'id-ID' : 'en-US';
    const currency = STATE.currency;
    
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function toggleCurrency() {
    STATE.currency = STATE.currency === 'IDR' ? 'USD' : 'IDR';
    
    // Update Button Text
    els.currencyToggle.innerText = STATE.currency === 'IDR' ? 'IDR (Rp)' : 'USD ($)';
    els.currencyLabel.innerText = STATE.currency;
    
    // Refresh UI
    renderAll();
}

// --- Backup & Restore ---

function backupData() {
    if (STATE.transactions.length === 0) {
        alert("Belum ada data untuk dibackup!");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(STATE.transactions));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "noteup_backup_" + new Date().toISOString().slice(0,10) + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function restoreData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                if(confirm("Restore data akan menimpa/menggabungkan data yang ada. Lanjutkan?")) {
                    // Strategy: Merge and remove duplicates based on ID
                    const currentIds = new Set(STATE.transactions.map(t => t.id));
                    const newItems = data.filter(t => !currentIds.has(t.id));
                    
                    STATE.transactions = [...newItems, ...STATE.transactions];
                    // Sort again by date/id descending just in case
                    STATE.transactions.sort((a, b) => b.id - a.id);
                    
                    saveData();
                    alert("Data berhasil dipulihkan!");
                }
            } else {
                alert("Format file JSON tidak valid.");
            }
        } catch (err) {
            alert("Gagal membaca file backup.");
            console.error(err);
        }
        // Reset input agar bisa pilih file yang sama lagi jika perlu
        input.value = '';
    };
    reader.readAsText(file);
}
