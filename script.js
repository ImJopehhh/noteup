// --- Constants & State ---
const STORAGE_KEY = 'noteup_data_v1';
const ITEMS_PER_PAGE = 20;
let transactions = [];
let currentPage = 1;
let financeChart = null;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    // Set default date to today
    document.getElementById('input-date').valueAsDate = new Date();
    renderAll();
});

// --- Core Data Functions ---
function loadData() {
    const data = localStorage.getItem(STORAGE_KEY);
    transactions = data ? JSON.parse(data) : [];
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    renderAll();
}

function renderAll() {
    renderSummary();
    renderTable();
    updateChart('all'); // Default chart view
}

// --- Formatters ---
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
};

// --- Form Handling ---
function setType(type) {
    const btnIncome = document.getElementById('btn-income');
    const btnExpense = document.getElementById('btn-expense');
    const inputType = document.getElementById('input-type');

    inputType.value = type;

    if (type === 'income') {
        btnIncome.classList.add('border-brand', 'text-brand');
        btnIncome.classList.remove('border-gray-600', 'text-gray-300');
        
        btnExpense.classList.remove('border-red-500', 'text-red-500');
        btnExpense.classList.add('border-gray-600', 'text-gray-300');
    } else {
        btnExpense.classList.add('border-red-500', 'text-red-500');
        btnExpense.classList.remove('border-gray-600', 'text-gray-300');

        btnIncome.classList.remove('border-brand', 'text-brand');
        btnIncome.classList.add('border-gray-600', 'text-gray-300');
    }
}
// Set default styling
setType('income');

document.getElementById('transaction-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const type = document.getElementById('input-type').value;
    const amount = parseFloat(document.getElementById('input-amount').value);
    const date = document.getElementById('input-date').value;
    const note = document.getElementById('input-note').value;

    if (!amount || !date) return alert("Mohon lengkapi data nominal dan tanggal.");

    const newTransaction = {
        id: Date.now(),
        type,
        amount,
        date,
        note
    };

    transactions.push(newTransaction);
    // Sort: Newest first
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    saveData();
    e.target.reset();
    document.getElementById('input-date').valueAsDate = new Date(); // Reset date to today
    setType('income'); // Reset type
});

// --- Dashboard Summary ---
function renderSummary() {
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
        if (t.type === 'income') income += t.amount;
        else expense += t.amount;
    });

    const total = income - expense;

    document.getElementById('display-balance').innerText = formatRupiah(total);
    document.getElementById('display-income').innerText = formatRupiah(income);
    document.getElementById('display-expense').innerText = formatRupiah(expense);
}

// --- Table & Pagination ---
function renderTable() {
    const tbody = document.getElementById('transaction-table-body');
    tbody.innerHTML = '';

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedItems = transactions.slice(start, end);

    document.getElementById('total-records').innerText = `${transactions.length} Data`;
    document.getElementById('page-info').innerText = `Page ${currentPage} of ${Math.ceil(transactions.length / ITEMS_PER_PAGE) || 1}`;

    // Disable buttons logic
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = end >= transactions.length;

    if (paginatedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Belum ada catatan transaksi.</td></tr>`;
        return;
    }

    paginatedItems.forEach(t => {
        const isIncome = t.type === 'income';
        const colorClass = isIncome ? 'text-brand' : 'text-red-500';
        const icon = isIncome ? '+' : '-';

        const row = `
            <tr class="hover:bg-gray-800 transition">
                <td class="px-6 py-4 whitespace-nowrap">${formatDate(t.date)}</td>
                <td class="px-6 py-4 text-gray-300">${t.note || '-'}</td>
                <td class="px-6 py-4 text-right font-medium ${colorClass}">
                    ${icon} ${formatRupiah(t.amount)}
                </td>
                <td class="px-6 py-4 text-center space-x-2">
                    <button onclick="openEditModal(${t.id})" class="text-blue-400 hover:text-blue-300"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteItem(${t.id})" class="text-red-400 hover:text-red-300"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable();
    }
});
document.getElementById('next-page').addEventListener('click', () => {
    if ((currentPage * ITEMS_PER_PAGE) < transactions.length) {
        currentPage++;
        renderTable();
    }
});

// --- Actions (Delete & Edit) ---
function deleteItem(id) {
    if (confirm('Yakin ingin menghapus catatan ini?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
    }
}

function openEditModal(id) {
    const item = transactions.find(t => t.id === id);
    if (!item) return;

    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-amount').value = item.amount;
    document.getElementById('edit-note').value = item.note;

    document.getElementById('edit-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

document.getElementById('edit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-id').value);
    const amount = parseFloat(document.getElementById('edit-amount').value);
    const note = document.getElementById('edit-note').value;

    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        transactions[index].amount = amount;
        transactions[index].note = note;
        saveData();
        closeModal();
    }
});

// --- Chart.js Logic ---
function updateChart(days) {
    // Style buttons
    document.querySelectorAll('.chart-filter').forEach(btn => {
        btn.classList.remove('bg-brand', 'text-white');
        btn.classList.add('bg-gray-700', 'text-gray-300');
    });
    // Find active button (simple logic for now, in prod used IDs)
    event && event.target.classList.add('bg-brand', 'text-white');
    event && event.target.classList.remove('bg-gray-700', 'text-gray-300');

    // Filter Logic
    let filteredData = [...transactions];
    
    if (days !== 'all') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
        filteredData = transactions.filter(t => new Date(t.date) >= cutoffDate);
    }

    // Group by Date for Chart
    // Sort ascending for chart (Oldest -> Newest)
    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

    const groupedData = {};
    filteredData.forEach(t => {
        if (!groupedData[t.date]) groupedData[t.date] = 0;
        if (t.type === 'income') groupedData[t.date] += t.amount;
        else groupedData[t.date] -= t.amount;
    });

    const labels = Object.keys(groupedData).map(d => formatDate(d));
    const dataPoints = Object.values(groupedData);

    const ctx = document.getElementById('financeChart').getContext('2d');
    
    // Destroy previous instance
    if (financeChart) financeChart.destroy();

    // Setup Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.5)'); // Brand color
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Net Flow (IDR)',
                data: dataPoints,
                borderColor: '#10b981',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#10b981',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatRupiah(context.raw);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: '#374151' },
                    ticks: { color: '#9ca3af' }
                },
                y: {
                    grid: { color: '#374151' },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
}

// --- Backup & Restore ---
function exportData() {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `noteup_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                if(confirm('Data saat ini akan ditimpa dengan data backup. Lanjutkan?')) {
                    transactions = importedData;
                    saveData();
                    alert('Data berhasil dipulihkan!');
                }
            } else {
                alert('Format file tidak valid!');
            }
        } catch (err) {
            alert('Gagal membaca file JSON.');
        }
    };
    reader.readAsText(file);
    // Reset input
    input.value = '';
                                                       }
