// script.js

// --- Konfigurasi Global ---
const STORAGE_KEY = 'noteup_financial_notes';
const ITEMS_PER_PAGE = 25; // 20-30 data per halaman
let currentPage = 1;
let notesData = [];

// --- Utilities ---

/**
 * Format angka menjadi format mata uang Rupiah.
 * @param {number} number
 * @returns {string}
 */
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
};

// --- LocalStorage Management (CRUD) ---

/**
 * Memuat data dari LocalStorage
 */
const loadNotes = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    notesData = data ? JSON.parse(data) : [];
    // Pastikan data diurutkan dari terbaru ke terlama (berdasarkan timestamp)
    notesData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

/**
 * Menyimpan data ke LocalStorage
 */
const saveNotes = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notesData));
};

// --- Fungsionalitas Utama ---

/**
 * Menghitung dan menampilkan total keuangan.
 */
const calculateTotals = () => {
    let totalPemasukan = 0;
    let totalPengeluaran = 0;

    notesData.forEach(note => {
        const nominal = parseFloat(note.nominal);
        if (note.type === 'Pemasukan') {
            totalPemasukan += nominal;
        } else if (note.type === 'Pengeluaran') {
            totalPengeluaran += nominal;
        }
    });

    const totalUang = totalPemasukan - totalPengeluaran;

    document.getElementById('total-uang').textContent = formatRupiah(totalUang);
    document.getElementById('total-pemasukan').textContent = formatRupiah(totalPemasukan);
    document.getElementById('total-pengeluaran').textContent = formatRupiah(totalPengeluaran);
};

/**
 * Merender tabel riwayat catatan dengan pagination.
 */
const renderHistoryTable = () => {
    const tableBody = document.getElementById('note-history-body');
    tableBody.innerHTML = '';
    
    // Hitung index untuk pagination
    const totalPages = Math.ceil(notesData.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    
    // Ambil data untuk halaman saat ini
    const notesOnPage = notesData.slice(startIndex, endIndex);

    if (notesOnPage.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-500">Belum ada catatan keuangan.</td></tr>`;
        document.getElementById('page-info').textContent = 'Halaman 0 dari 0';
        document.getElementById('prev-page').disabled = true;
        document.getElementById('next-page').disabled = true;
        return;
    }

    notesOnPage.forEach(note => {
        const date = new Date(note.timestamp).toLocaleDateString('id-ID', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        
        const nominalClass = note.type === 'Pemasukan' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold';

        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700 hover:bg-gray-700/50 transition duration-150';
        row.innerHTML = `
            <td class="py-4 px-6 whitespace-nowrap">${date}</td>
            <td class="py-4 px-6 whitespace-nowrap ${nominalClass}">${formatRupiah(parseFloat(note.nominal))}</td>
            <td class="py-4 px-6 text-gray-300">${note.message || '-'}</td>
            <td class="py-4 px-6 whitespace-nowrap space-x-2">
                <button onclick="openEditModal('${note.id}')" class="text-primary-400 hover:text-primary-300 font-medium">Edit</button>
                <button onclick="openDeleteModal('${note.id}')" class="text-red-400 hover:text-red-300 font-medium">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Kontrol Pagination
    document.getElementById('page-info').textContent = `Halaman ${currentPage} dari ${totalPages}`;
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
};

// --- Event Listeners ---

document.getElementById('note-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const type = document.getElementById('type').value;
    const nominal = document.getElementById('nominal').value;
    const message = document.getElementById('message').value.trim();

    if (parseFloat(nominal) <= 0) {
        alert('Nominal harus lebih dari 0.');
        return;
    }

    const newNote = {
        id: Date.now().toString(), // ID unik sederhana
        timestamp: new Date().toISOString(),
        type: type,
        nominal: parseFloat(nominal),
        message: message
    };

    notesData.unshift(newNote); // Tambahkan ke depan agar terbaru di atas
    saveNotes();
    updateUI();
    
    // Reset form
    e.target.reset();
});

// Listener Pagination
document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderHistoryTable();
    }
});

document.getElementById('next-page').addEventListener('click', () => {
    const totalPages = Math.ceil(notesData.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
        currentPage++;
        renderHistoryTable();
    }
});

// CTA Button Scroll
document.getElementById('cta-button').addEventListener('click', () => {
    document.getElementById('notes-section').scrollIntoView({ behavior: 'smooth' });
});

// --- Modal Logic (Edit/Delete) ---

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const closeModalBtn = document.getElementById('close-modal');
const confirmModalBtn = document.getElementById('confirm-modal');
let currentNoteId = null;

closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});

/**
 * Buka modal Edit.
 * @param {string} id
 */
const openEditModal = (id) => {
    const note = notesData.find(n => n.id === id);
    if (!note) return;
    
    currentNoteId = id;
    modalTitle.textContent = 'Edit Catatan Keuangan';
    confirmModalBtn.textContent = 'Simpan Perubahan';
    confirmModalBtn.className = 'py-2 px-4 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition';
    
    modalContent.innerHTML = `
        <form id="edit-form" class="space-y-4">
            <div>
                <label for="edit-type" class="block text-sm font-medium text-gray-300">Tipe Uang</label>
                <select id="edit-type" required class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md bg-gray-700 text-white">
                    <option value="Pemasukan" ${note.type === 'Pemasukan' ? 'selected' : ''}>Pemasukan</option>
                    <option value="Pengeluaran" ${note.type === 'Pengeluaran' ? 'selected' : ''}>Pengeluaran</option>
                </select>
            </div>
            <div>
                <label for="edit-nominal" class="block text-sm font-medium text-gray-300">Nominal Uang (Rp)</label>
                <input type="number" id="edit-nominal" required value="${note.nominal}" class="mt-1 block w-full rounded-md border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-3 bg-gray-700 text-white">
            </div>
            <div>
                <label for="edit-message" class="block text-sm font-medium text-gray-300">Pesan (Opsional)</label>
                <input type="text" id="edit-message" value="${note.message || ''}" class="mt-1 block w-full rounded-md border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-3 bg-gray-700 text-white">
            </div>
        </form>
    `;

    confirmModalBtn.onclick = handleEdit;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

/**
 * Buka modal Delete.
 * @param {string} id
 */
const openDeleteModal = (id) => {
    currentNoteId = id;
    modalTitle.textContent = 'Hapus Catatan';
    confirmModalBtn.textContent = 'Ya, Hapus';
    confirmModalBtn.className = 'py-2 px-4 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition';
    
    modalContent.innerHTML = `<p class="text-gray-300">Anda yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan.</p>`;

    confirmModalBtn.onclick = handleDelete;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

/**
 * Logika Simpan Edit.
 */
const handleEdit = () => {
    const index = notesData.findIndex(n => n.id === currentNoteId);
    if (index === -1) return;

    const editedType = document.getElementById('edit-type').value;
    const editedNominal = parseFloat(document.getElementById('edit-nominal').value);
    const editedMessage = document.getElementById('edit-message').value.trim();

    if (editedNominal <= 0 || isNaN(editedNominal)) {
        alert('Nominal tidak valid.');
        return;
    }

    notesData[index].type = editedType;
    notesData[index].nominal = editedNominal;
    notesData[index].message = editedMessage;

    saveNotes();
    modal.classList.add('hidden');
    updateUI();
};

/**
 * Logika Hapus.
 */
const handleDelete = () => {
    notesData = notesData.filter(n => n.id !== currentNoteId);
    saveNotes();
    modal.classList.add('hidden');
    updateUI();
};

// --- Chart/Grafik Logic (Membutuhkan Chart.js) ---
let financeChart;
const CHART_COLORS = {
    income: 'rgb(52, 211, 153)', // green-400
    expense: 'rgb(248, 113, 113)', // red-400
    balance: 'rgb(99, 102, 241)', // primary-500 (Indigo)
};

/**
 * Menyiapkan data untuk Chart.js.
 * @param {number|string} period - Jumlah hari (7, 30, 180, 365) atau 'all'.
 */
const updateChart = (period) => {
    const today = new Date();
    let startDate = new Date();
    
    if (period !== 'all') {
        startDate.setDate(today.getDate() - parseInt(period) + 1);
    } else {
        // Jika All-Time, mulai dari catatan terlama
        if (notesData.length > 0) {
            startDate = new Date(notesData[notesData.length - 1].timestamp);
        } else {
            startDate = today; // Jika tidak ada data
        }
    }
    
    // Agregasi data harian
    const dailyData = {};
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Inisialisasi semua tanggal dalam rentang dengan 0
    let currentDate = new Date(startDate);
    while (currentDate <= today) {
        const dateKey = currentDate.toISOString().split('T')[0];
        dailyData[dateKey] = { income: 0, expense: 0, balance: 0 };
        currentDate.setTime(currentDate.getTime() + oneDay);
    }

    notesData.forEach(note => {
        const noteDate = new Date(note.timestamp);
        if (noteDate >= startDate && noteDate <= today) {
            const dateKey = noteDate.toISOString().split('T')[0];
            const nominal = parseFloat(note.nominal);
            
            if (dailyData[dateKey]) {
                if (note.type === 'Pemasukan') {
                    dailyData[dateKey].income += nominal;
                } else {
                    dailyData[dateKey].expense += nominal;
                }
            }
        }
    });
    
    // Hitung Balance Akumulatif
    const sortedDates = Object.keys(dailyData).sort();
    let cumulativeBalance = 0;
    
    sortedDates.forEach(date => {
        cumulativeBalance += dailyData[date].income - dailyData[date].expense;
        dailyData[date].balance = cumulativeBalance;
    });

    // Chart Data
    const labels = sortedDates.map(date => new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }));
    const incomeData = sortedDates.map(date => dailyData[date].income);
    const expenseData = sortedDates.map(date => dailyData[date].expense);
    const balanceData = sortedDates.map(date => dailyData[date].balance);

    const ctx = document.getElementById('financeChart').getContext('2d');
    
    if (financeChart) {
        financeChart.destroy();
    }
    
    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pemasukan Harian',
                data: incomeData,
                borderColor: CHART_COLORS.income,
                backgroundColor: 'rgba(52, 211, 153, 0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: false,
                yAxisID: 'y'
            }, {
                label: 'Pengeluaran Harian',
                data: expenseData,
                borderColor: CHART_COLORS.expense,
                backgroundColor: 'rgba(248, 113, 113, 0.2)',
                borderWidth: 2,
                tension: 0.4,
                fill: false,
                yAxisID: 'y'
            }, {
                label: 'Total Saldo (Akumulatif)',
                data: balanceData,
                borderColor: CHART_COLORS.balance,
                backgroundColor: 'rgba(99, 102, 241, 0.4)',
                borderWidth: 3,
                tension: 0.2,
                fill: true,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += formatRupiah(context.parsed.y);
                            }
                            return label;
                        }
                    },
                    bodyFont: { size: 14 },
                    titleFont: { size: 16, weight: 'bold' },
                    backgroundColor: 'rgba(31, 41, 55, 0.9)', // gray-800 semi-transparent
                    titleColor: '#fff',
                    bodyColor: '#e5e7eb',
                    padding: 10,
                    cornerRadius: 8,
                },
                legend: {
                    labels: {
                        color: '#9ca3af', // gray-400
                        font: { size: 14, family: 'Poppins' }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false, color: '#374151' },
                    ticks: { color: '#9ca3af' },
                    title: { display: true, text: 'Tanggal', color: '#f3f4f6' }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: '#374151' },
                    ticks: { 
                        color: '#9ca3af',
                        callback: function(value) { return formatRupiah(value).split(' ')[1]; } // Hilangkan 'Rp'
                    },
                    title: { display: true, text: 'Nominal Harian (Rp)', color: '#f3f4f6' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false, color: '#374151' },
                    ticks: { 
                        color: CHART_COLORS.balance,
                        callback: function(value) { return formatRupiah(value).split(' ')[1]; } // Hilangkan 'Rp'
                    },
                    title: { display: true, text: 'Total Saldo (Akumulatif)', color: CHART_COLORS.balance }
                }
            }
        }
    });
};

// Event listener untuk filter chart
document.querySelectorAll('.chart-filter').forEach(button => {
    button.addEventListener('click', (e) => {
        document.querySelectorAll('.chart-filter').forEach(btn => {
            btn.classList.remove('bg-primary-600', 'text-white');
            btn.classList.add('bg-gray-700', 'text-gray-300');
        });
        e.target.classList.add('bg-primary-600', 'text-white');
        e.target.classList.remove('bg-gray-700', 'text-gray-300');
        
        updateChart(e.target.dataset.period);
    });
});

// --- Backup/Restore Logic ---

document.getElementById('backup-btn').addEventListener('click', () => {
    const dataStr = JSON.stringify(notesData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'noteup_backup_' + new Date().toISOString().split('T')[0] + '.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
});

document.getElementById('restore-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const statusText = document.getElementById('restore-status');
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const restoredData = JSON.parse(event.target.result);
            if (Array.isArray(restoredData) && restoredData.every(item => item.id && item.timestamp && item.type && item.nominal !== undefined)) {
                
                // Gabungkan data lama dan data baru (gunakan logika deduplikasi jika perlu)
                // Untuk kesederhanaan, kita akan TIMPA data yang ada
                notesData = restoredData;
                saveNotes();
                updateUI();
                statusText.className = 'mt-2 text-sm text-green-500';
                statusText.textContent = 'Data berhasil di-restore!';
            } else {
                statusText.className = 'mt-2 text-sm text-red-500';
                statusText.textContent = 'Format file JSON tidak valid untuk noteup!.';
            }
        } catch (error) {
            statusText.className = 'mt-2 text-sm text-red-500';
            statusText.textContent = 'Gagal memproses file. Pastikan itu adalah file JSON yang valid.';
            console.error(error);
        }
        // Reset input file agar change event tetap terpicu jika user memilih file yang sama
        e.target.value = ''; 
    };
    reader.onerror = () => {
        statusText.className = 'mt-2 text-sm text-red-500';
        statusText.textContent = 'Gagal membaca file.';
    };
    reader.readAsText(file);
});


// --- Inisialisasi Aplikasi ---

const updateUI = () => {
    loadNotes();
    calculateTotals();
    renderHistoryTable();
    // Inisialisasi/Update chart dengan periode default (1 Minggu)
    if (document.querySelector('.chart-filter.bg-primary-600')) {
         updateChart(document.querySelector('.chart-filter.bg-primary-600').dataset.period);
    } else {
         updateChart('7'); // Default ke 1 Minggu jika belum ada yang aktif
    }
}

// Jalankan saat aplikasi dimuat
updateUI();
                
