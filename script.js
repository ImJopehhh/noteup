// script.js

// --- State Management ---
let transactions = [];
const ROWS_PER_PAGE = 20;
let currentPage = 1;
let currentEditId = null; // Menyimpan ID yang sedang diedit
let idToDelete = null;    // Menyimpan ID yang akan dihapus
let financeChart = null;  // Instance Chart.js
let currentChartFilter = 'ALL';

// --- Selectors ---
const form = document.getElementById('transaction-form');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const dateInput = document.getElementById('date');

const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const tableBody = document.getElementById('transaction-body');
const pageInfo = document.getElementById('pagination-info');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    // Set default date input to today
    dateInput.valueAsDate = new Date(); 
    updateUI();
});

// --- Core Functions ---

function loadData() {
    const stored = localStorage.getItem('noteup_transactions');
    if (stored) transactions = JSON.parse(stored);
}

function saveData() {
    localStorage.setItem('noteup_transactions', JSON.stringify(transactions));
    updateUI();
}

function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function updateUI() {
    // 1. Calculate Header Totals
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    
    totalBalanceEl.textContent = formatRupiah(income - expense);
    totalIncomeEl.textContent = formatRupiah(income);
    totalExpenseEl.textContent = formatRupiah(expense);

    // 2. Render Table
    renderTable();

    // 3. Render/Update Chart
    renderChart(currentChartFilter);
}

// --- Table Logic ---
function renderTable() {
    tableBody.innerHTML = '';
    
    // Sort Date Descending
    const sortedData = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination
    const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const pageData = sortedData.slice(start, start + ROWS_PER_PAGE);

    if (pageData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Belum ada data.</td></tr>`;
    } else {
        pageData.forEach(item => {
            const isIncome = item.type === 'income';
            
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-800/30 transition-colors border-b border-slate-700/30";
            
            tr.innerHTML = `
                <td class="p-4 whitespace-nowrap text-slate-400 font-mono text-xs">${formatDate(item.date)}</td>
                <td class="p-4 text-right font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'} whitespace-nowrap">
                    ${isIncome ? '+' : '-'} ${formatRupiah(item.amount)}
                </td>
                <td class="p-4 text-center">
                    <span class="px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${isIncome ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                        ${isIncome ? 'IN' : 'OUT'}
                    </span>
                </td>
                <td class="p-4 text-white text-sm truncate max-w-[150px]" title="${item.note}">${item.note}</td>
                <td class="p-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="editTransaction(${item.id})" class="p-2 rounded-lg bg-slate-800 hover:bg-blue-500/20 hover:text-blue-400 text-slate-400 transition-all" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                        <button onclick="requestDelete(${item.id})" class="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-all" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// --- Chart Logic (Chart.js) ---
function setChartFilter(filter) {
    currentChartFilter = filter;
    
    // Update Button Styles
    document.querySelectorAll('.chart-filter').forEach(btn => {
        if(btn.dataset.filter === filter) {
            btn.className = "chart-filter px-4 py-1.5 text-xs font-medium rounded-md transition-all bg-primary text-dark font-bold shadow-lg";
        } else {
            btn.className = "chart-filter px-4 py-1.5 text-xs font-medium rounded-md transition-all text-slate-400 hover:text-white";
        }
    });

    renderChart(filter);
}

function renderChart(filter) {
    const ctx = document.getElementById('financeChart').getContext('2d');
    
    // 1. Filter Data based on Time
    const now = new Date();
    let filteredData = transactions.filter(t => {
        const tDate = new Date(t.date);
        if (filter === '1W') return tDate >= new Date(now.setDate(now.getDate() - 7));
        if (filter === '1M') return tDate >= new Date(now.setMonth(now.getMonth() - 1));
        if (filter === '1Y') return tDate >= new Date(now.setFullYear(now.getFullYear() - 1));
        return true; // ALL
    });

    // 2. Group Data (Accumulate Balance over time)
    // Sort ascending for Chart
    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

    const labels = filteredData.map(t => new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
    
    // Create running balance array
    let runningBalance = 0;
    const dataPoints = filteredData.map(t => {
        if(t.type === 'income') runningBalance += t.amount;
        else runningBalance -= t.amount;
        return runningBalance;
    });

    // Destroy previous chart if exists
    if (financeChart) financeChart.destroy();

    // Create Gradient
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)'); // Primary Color Low Opacity
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Arus Kas (Balance)',
                data: dataPoints,
                borderColor: '#10b981', // Primary
                backgroundColor: gradient,
                borderWidth: 2,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#0f172a',
                pointHoverBackgroundColor: '#fff',
                fill: true,
                tension: 0.4 // Smooth curves
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1e293b',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    borderColor: '#334155',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return 'Saldo: ' + formatRupiah(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, drawBorder: false },
                    ticks: { color: '#64748b', maxTicksLimit: 7 }
                },
                y: {
                    grid: { color: '#334155', borderDash: [5, 5] },
                    ticks: { display: false } // Sembunyikan angka di Y axis agar bersih
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// --- Form & Edit Logic ---

form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const note = document.getElementById('note').value;
    const dateVal = document.getElementById('date').value;

    if (!amount || amount <= 0) return alert("Nominal harus valid");

    if (currentEditId) {
        // Update Existing
        const index = transactions.findIndex(t => t.id === currentEditId);
        if (index !== -1) {
            transactions[index] = { ...transactions[index], type, amount, note, date: dateVal };
        }
        alert('Data berhasil diperbarui!');
        resetForm();
    } else {
        // Create New
        const newTx = {
            id: Date.now(),
            date: dateVal, // Gunakan tanggal input
            type,
            amount,
            note
        };
        transactions.push(newTx);
    }

    saveData();
    updateUI();
    if (!currentEditId) form.reset();
});

// Trigger Edit Mode
window.editTransaction = function(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    currentEditId = id;
    
    // Populate Form
    document.getElementById('amount').value = tx.amount;
    document.getElementById('note').value = tx.note;
    document.getElementById('date').value = tx.date; // Format YYYY-MM-DD matches input date
    if(tx.type === 'income') document.getElementById('type-income').checked = true;
    else document.getElementById('type-expense').checked = true;

    // Change UI state
    submitBtn.textContent = "Update Catatan";
    submitBtn.classList.replace('bg-primary', 'bg-blue-500');
    cancelEditBtn.classList.remove('hidden');
    
    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth' });
};

// Cancel Edit
cancelEditBtn.addEventListener('click', resetForm);

function resetForm() {
    currentEditId = null;
    form.reset();
    document.getElementById('date').valueAsDate = new Date(); // Reset date to today
    submitBtn.textContent = "Simpan";
    submitBtn.classList.replace('bg-blue-500', 'bg-primary');
    cancelEditBtn.classList.add('hidden');
}

// --- Delete Modal Logic ---

window.requestDelete = function(id) {
    idToDelete = id;
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('hidden');
    // Animation trick
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
        modal.querySelector('div').classList.add('scale-100');
    }, 10);
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.remove('scale-100');
    modal.querySelector('div').classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
    
    if (modalId === 'delete-modal') idToDelete = null;
};

document.getElementById('confirm-delete-btn').addEventListener('click', () => {
    if (idToDelete) {
        transactions = transactions.filter(t => t.id !== idToDelete);
        saveData();
        closeModal('delete-modal');
        // Check if we need to go back a page
        const totalPages = Math.ceil(transactions.length / ROWS_PER_PAGE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
    }
});

// Pagination Event Listeners (sama seperti sebelumnya)
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; updateUI(); }
});
nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(transactions.length / ROWS_PER_PAGE);
    if (currentPage < totalPages) { currentPage++; updateUI(); }
});

// Backup/Restore Logic (sama seperti sebelumnya)
document.getElementById('backup-btn').addEventListener('click', () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noteup_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

document.getElementById('restore-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                if(confirm('Restore data? Data saat ini akan ditimpa.')) {
                    transactions = imported;
                    saveData();
                }
            }
        } catch (err) { alert('File Invalid'); }
    };
    reader.readAsText(file);
});
