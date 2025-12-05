// script.js

// --- State Management ---
let transactions = [];
const ROWS_PER_PAGE = 20;
let currentPage = 1;

// --- Selectors ---
const form = document.getElementById('transaction-form');
const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const tableBody = document.getElementById('transaction-body');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const pageInfo = document.getElementById('pagination-info');
const backupBtn = document.getElementById('backup-btn');
const restoreInput = document.getElementById('restore-file');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateUI();
});

// --- Core Functions ---

// 1. Load Data from LocalStorage
function loadData() {
    const storedData = localStorage.getItem('noteup_transactions');
    if (storedData) {
        transactions = JSON.parse(storedData);
    }
}

// 2. Save Data to LocalStorage
function saveData() {
    localStorage.setItem('noteup_transactions', JSON.stringify(transactions));
    updateUI();
}

// 3. Formatter: Rupiah
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
}

// 4. Formatter: Date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// 5. Update UI (Totals & Table)
function updateUI() {
    // Calculate Totals
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expense;

    // Update DOM Totals
    totalBalanceEl.textContent = formatRupiah(balance);
    totalIncomeEl.textContent = formatRupiah(income);
    totalExpenseEl.textContent = formatRupiah(expense);

    // Update Table with Pagination
    renderTable();
}

// 6. Render Table with Pagination logic
function renderTable() {
    tableBody.innerHTML = '';
    
    // Sort: Terbaru ke Terlama
    const sortedData = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination Logic
    const totalPages = Math.ceil(sortedData.length / ROWS_PER_PAGE) || 1;
    
    // Ensure currentPage is valid
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    const pageData = sortedData.slice(start, end);

    // Render Rows
    if (pageData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Belum ada catatan transaksi.</td></tr>`;
    } else {
        pageData.forEach(item => {
            const isIncome = item.type === 'income';
            const amountClass = isIncome ? 'text-emerald-400' : 'text-rose-400';
            const typeLabel = isIncome ? 'Pemasukan' : 'Pengeluaran';
            const sign = isIncome ? '+' : '-';

            const row = document.createElement('tr');
            row.className = "hover:bg-slate-800/30 transition-colors border-b border-slate-700/30 last:border-0";
            row.innerHTML = `
                <td class="p-4 whitespace-nowrap text-slate-400">${formatDate(item.date)}</td>
                <td class="p-4 text-white font-medium truncate max-w-[150px]" title="${item.note}">${item.note || '-'}</td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded text-xs font-semibold ${isIncome ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                        ${typeLabel}
                    </span>
                </td>
                <td class="p-4 text-right font-bold ${amountClass} whitespace-nowrap">
                    ${sign} ${formatRupiah(item.amount)}
                </td>
                <td class="p-4 text-center">
                    <button onclick="deleteTransaction(${item.id})" class="text-slate-500 hover:text-rose-400 transition-colors" title="Hapus">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Update Pagination Controls
    pageInfo.innerText = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

// --- Event Listeners ---

// 1. Submit Form
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const note = document.getElementById('note').value;

    if (!amount || amount <= 0) {
        alert("Mohon masukkan nominal yang valid.");
        return;
    }

    const newTransaction = {
        id: Date.now(),
        date: new Date().toISOString(),
        type,
        amount,
        note
    };

    transactions.push(newTransaction);
    saveData();
    form.reset();
    
    // Kembali ke halaman 1 agar user melihat data yang baru diinput
    currentPage = 1;
    updateUI();
});

// 2. Pagination Buttons
prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});

nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(transactions.length / ROWS_PER_PAGE) || 1;
    if (currentPage < totalPages) {
        currentPage++;
        renderTable();
    }
});

// 3. Delete Action (Harus diekspos ke window object karena dipanggil di HTML string)
window.deleteTransaction = function(id) {
    if(confirm('Yakin ingin menghapus catatan ini?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
    }
};

// 4. Backup Data (Download JSON)
backupBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `noteup_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// 5. Restore Data (Upload JSON)
restoreInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                if(confirm(`Ditemukan ${importedData.length} data. Apakah Anda ingin menimpa data saat ini?`)) {
                    transactions = importedData;
                    saveData();
                    alert("Data berhasil dipulihkan!");
                }
            } else {
                alert("Format file JSON tidak valid.");
            }
        } catch (error) {
            alert("Error membaca file. Pastikan file adalah JSON yang valid.");
            console.error(error);
        }
        // Reset input agar bisa upload file yang sama jika perlu
        restoreInput.value = '';
    };
    reader.readAsText(file);
});
                      
