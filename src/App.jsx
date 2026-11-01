import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Minus,
  Save,
  Trash2,
  Download,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  X,
  CalendarDays,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ============================================================
//  HELPER FUNCTIONS
// ============================================================
const API_URL = '/api/transactions';

const formatRupiah = (num) => {
  if (num == null) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
};

const formatInputRupiah = (value) => {
  const num = value.replace(/\D/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('id-ID');
};

const parseRupiahInput = (formatted) => {
  return formatted.replace(/\./g, '').replace(/,/g, '');
};

const formatTanggal = (dateStr) => {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getToday = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// ============================================================
//  COMPONENT: Windows Spinner
// ============================================================
const WinSpinner = ({ size = 'sm', className = '' }) => (
  <div
    className={`win-spinner ${size === 'lg' ? 'win-spinner-lg' : ''} ${className}`}
    role="status"
    aria-label="Memuat..."
  />
);

// ============================================================
//  COMPONENT: Skeleton Card
// ============================================================
const SkeletonCard = ({ isPrimary = false }) => (
  <div
    className={`rounded-lg p-5 border ${
      isPrimary ? 'bg-blue-200' : 'bg-white border-win-border'
    }`}
  >
    <div className="skeleton h-4 w-24 mb-3" />
    <div className="skeleton h-8 w-36 mb-2" />
    <div className="skeleton h-3 w-20" />
  </div>
);

// ============================================================
//  COMPONENT: Skeleton Table
// ============================================================
const SkeletonTable = () => (
  <div className="bg-white rounded-lg border border-win-border overflow-hidden">
    <div className="p-4 border-b border-win-border">
      <div className="skeleton h-5 w-48" />
    </div>
    <div className="p-4 space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="skeleton h-4 w-8" />
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 w-40 flex-1" />
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 w-28" />
        </div>
      ))}
    </div>
  </div>
);

// ============================================================
//  COMPONENT: Toast Notification
// ============================================================
const Toast = ({ message, type = 'success', onClose, visible }) => {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div
        className={`${
          visible ? 'toast-enter' : 'toast-exit'
        } flex items-start gap-3 p-4 rounded-lg shadow-lg border ${
          type === 'success'
            ? 'bg-white border-green-200 text-green-800'
            : type === 'error'
            ? 'bg-white border-red-200 text-red-800'
            : 'bg-white border-blue-200 text-blue-800'
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {type === 'success' ? (
            <span className="text-lg">✅</span>
          ) : type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-500" />
          ) : (
            <span className="text-lg">ℹ️</span>
          )}
        </div>
        <p className="text-sm font-medium flex-1 leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-0.5 rounded hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
};

// ============================================================
//  COMPONENT: Modal Saldo Awal
// ============================================================
const ModalSaldoAwal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('Saldo awal bulan');
  const [tanggal, setTanggal] = useState(getToday());

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const raw = parseRupiahInput(jumlah);
    if (!raw || Number(raw) <= 0) return;
    onSubmit({
      tanggal,
      jenis: 'saldo_awal',
      jumlah: Number(raw),
      keterangan,
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 modal-overlay bg-black/40">
      <div className="modal-content bg-white rounded-lg shadow-xl w-full max-w-md border border-win-border">
        {/* Title Bar */}
        <div className="flex items-center justify-between p-4 border-b border-win-border">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-win-blue" />
            <h2 className="text-base font-semibold">Atur Saldo Awal</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-win-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-gray-500">
            Masukkan sisa saldo dari bulan sebelumnya sebagai modal awal.
          </p>

          <div>
            <label className="block text-sm font-medium mb-1.5">Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg input-win text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Jumlah Saldo Awal (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={jumlah}
              onChange={(e) => setJumlah(formatInputRupiah(e.target.value))}
              placeholder="Contoh: 5.000.000"
              className="w-full px-3 py-2.5 rounded-lg input-win text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Keterangan</label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Saldo awal bulan November"
              className="w-full px-3 py-2.5 rounded-lg input-win text-sm"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg btn-win-secondary text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-lg btn-win-primary text-sm font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <WinSpinner className="border-white/30 border-t-white" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Saldo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
//  COMPONENT: Konfirmasi Hapus
// ============================================================
const ModalKonfirmasi = ({ isOpen, onClose, onConfirm, isLoading, item }) => {
  if (!isOpen || !item) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 modal-overlay bg-black/40">
      <div className="modal-content bg-white rounded-lg shadow-xl w-full max-w-sm border border-win-border">
        <div className="flex items-center justify-between p-4 border-b border-win-border">
          <h2 className="text-base font-semibold text-red-600 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Konfirmasi Hapus
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-win-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-sm text-gray-600 mb-1">Apakah Anda yakin ingin menghapus data ini?</p>
          <div className="bg-red-50 p-3 rounded-lg mt-3 text-sm space-y-1">
            <p><span className="font-medium">Tanggal:</span> {formatTanggal(item.tanggal)}</p>
            <p><span className="font-medium">Keterangan:</span> {item.keterangan}</p>
            <p><span className="font-medium">Jumlah:</span> {formatRupiah(item.jumlah)}</p>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg btn-win-secondary text-sm font-medium"
            >
              Batal
            </button>
            <button
              onClick={() => onConfirm(item.id)}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <WinSpinner className="border-white/30 border-t-white" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
//  MAIN APP
// ============================================================
export default function App() {
  // ---------- State ----------
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  const [jenis, setJenis] = useState('pengeluaran');
  const [tanggal, setTanggal] = useState(getToday());
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState('');

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const [showSaldoModal, setShowSaldoModal] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const [newRowId, setNewRowId] = useState(null);

  const toastTimer = useRef(null);

  // ---------- Toast helper ----------
  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type, visible: true });
    toastTimer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
      setTimeout(() => setToast({ message: '', type: 'success', visible: false }), 400);
    }, 5000);
  }, []);

  // ---------- Fetch Transactions ----------
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      showToast('Gagal memuat data dari server. Periksa koneksi internet.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ---------- Calculate Totals ----------
  const saldoAwal = transactions
    .filter((t) => t.jenis === 'saldo_awal')
    .reduce((sum, t) => sum + Number(t.jumlah), 0);

  const totalPemasukan = transactions
    .filter((t) => t.jenis === 'pemasukan')
    .reduce((sum, t) => sum + Number(t.jumlah), 0);

  const totalPengeluaran = transactions
    .filter((t) => t.jenis === 'pengeluaran')
    .reduce((sum, t) => sum + Number(t.jumlah), 0);

  const sisaSaldo = saldoAwal + totalPemasukan - totalPengeluaran;

  // ---------- Filtered + Running Balance ----------
  const filteredTransactions = transactions.filter((t) => {
    const d = new Date(t.tanggal);
    return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear;
  });

  // Build running balance for filtered view
  const tableRows = [];
  let runningBalance = 0;

  // Calculate running balance from ALL transactions up to the filter period
  // First, get balance before the filter period starts
  const filterStart = new Date(filterYear, filterMonth - 1, 1);
  transactions.forEach((t) => {
    const tDate = new Date(t.tanggal);
    if (tDate < filterStart) {
      if (t.jenis === 'saldo_awal' || t.jenis === 'pemasukan') {
        runningBalance += Number(t.jumlah);
      } else {
        runningBalance -= Number(t.jumlah);
      }
    }
  });

  // Then, build table rows for filtered period
  filteredTransactions.forEach((t, idx) => {
    if (t.jenis === 'saldo_awal' || t.jenis === 'pemasukan') {
      runningBalance += Number(t.jumlah);
    } else {
      runningBalance -= Number(t.jumlah);
    }
    tableRows.push({
      ...t,
      no: idx + 1,
      pemasukan: t.jenis === 'saldo_awal' || t.jenis === 'pemasukan' ? Number(t.jumlah) : 0,
      pengeluaran: t.jenis === 'pengeluaran' ? Number(t.jumlah) : 0,
      saldo: runningBalance,
    });
  });

  // ---------- Filtered Totals ----------
  const filteredPemasukan = filteredTransactions
    .filter((t) => t.jenis === 'pemasukan' || t.jenis === 'saldo_awal')
    .reduce((sum, t) => sum + Number(t.jumlah), 0);

  const filteredPengeluaran = filteredTransactions
    .filter((t) => t.jenis === 'pengeluaran')
    .reduce((sum, t) => sum + Number(t.jumlah), 0);

  // ---------- Save Transaction ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const rawJumlah = parseRupiahInput(jumlah);
    if (!rawJumlah || Number(rawJumlah) <= 0) {
      showToast('Masukkan jumlah yang valid.', 'error');
      return;
    }
    if (!keterangan.trim()) {
      showToast('Keterangan tidak boleh kosong.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          jenis,
          jumlah: Number(rawJumlah),
          keterangan: keterangan.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan');
      }

      const result = await res.json();
      setNewRowId(result.data?.id);

      // Refresh data
      await fetchTransactions();

      // Calculate new saldo for toast
      const updatedRes = await fetch(API_URL);
      const updatedData = await updatedRes.json();
      const newSaldo = updatedData.reduce((acc, t) => {
        if (t.jenis === 'saldo_awal' || t.jenis === 'pemasukan') return acc + Number(t.jumlah);
        return acc - Number(t.jumlah);
      }, 0);

      showToast(
        `Data berhasil disimpan! Sisa saldo saat ini: ${formatRupiah(newSaldo)}`,
        'success'
      );

      // Reset form
      setJumlah('');
      setKeterangan('');
      setTanggal(getToday());

      // Clear highlight after animation
      setTimeout(() => setNewRowId(null), 2000);
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan data.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Save Saldo Awal ----------
  const handleSaveSaldo = async (data) => {
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan saldo awal');
      }
      await fetchTransactions();
      setShowSaldoModal(false);
      showToast('Saldo awal berhasil disimpan!', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan saldo awal.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ---------- Delete Transaction ----------
  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menghapus');
      }
      await fetchTransactions();
      setDeleteItem(null);
      showToast('Data berhasil dihapus.', 'success');
    } catch (err) {
      showToast(err.message || 'Gagal menghapus data.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ---------- Export Excel ----------
  const handleExportExcel = () => {
    if (tableRows.length === 0) {
      showToast('Tidak ada data untuk di-export.', 'error');
      return;
    }

    const bulanNama = BULAN_NAMA[filterMonth - 1];
    const fileName = `Catatan_Keuangan_${bulanNama}_${filterYear}.xlsx`;

    // Build data rows
    const wsData = [
      [`Catatan Keuangan - ${bulanNama} ${filterYear}`],
      [],
      ['No', 'Tanggal', 'Keterangan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Sisa Saldo (Rp)'],
    ];

    tableRows.forEach((row) => {
      wsData.push([
        row.no,
        formatTanggal(row.tanggal),
        row.keterangan,
        row.pemasukan || '',
        row.pengeluaran || '',
        row.saldo,
      ]);
    });

    // Summary rows
    wsData.push([]);
    wsData.push(['', '', 'Total Pemasukan', filteredPemasukan, '', '']);
    wsData.push(['', '', 'Total Pengeluaran', '', filteredPengeluaran, '']);
    wsData.push([
      '',
      '',
      'Sisa Saldo Akhir',
      '',
      '',
      tableRows.length > 0 ? tableRows[tableRows.length - 1].saldo : 0,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 14 },  // Tanggal
      { wch: 35 },  // Keterangan
      { wch: 20 },  // Pemasukan
      { wch: 20 },  // Pengeluaran
      { wch: 22 },  // Sisa Saldo
    ];

    // Merge title row
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, bulanNama);
    XLSX.writeFile(wb, fileName);

    showToast(`File ${fileName} berhasil di-download!`, 'success');
  };

  // ---------- Available years for filter ----------
  const availableYears = [...new Set(transactions.map((t) => new Date(t.tanggal).getFullYear()))];
  if (!availableYears.includes(filterYear)) availableYears.push(filterYear);
  availableYears.sort();

  // ============================================================
  //  RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-win-bg font-segoe">
      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => {
          setToast((prev) => ({ ...prev, visible: false }));
          setTimeout(() => setToast({ message: '', type: 'success', visible: false }), 400);
        }}
      />

      {/* Modal Saldo Awal */}
      <ModalSaldoAwal
        isOpen={showSaldoModal}
        onClose={() => setShowSaldoModal(false)}
        onSubmit={handleSaveSaldo}
        isLoading={saving}
      />

      {/* Modal Konfirmasi Hapus */}
      <ModalKonfirmasi
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        item={deleteItem}
      />

      {/* ===== HEADER (Windows Title Bar Style) ===== */}
      <header className="bg-white border-b border-win-border sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-win-blue flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 leading-tight">Catatan Keuangan</h1>
              <p className="text-xs text-gray-400">Pencatatan keuangan harian</p>
            </div>
          </div>
          <button
            onClick={() => setShowSaldoModal(true)}
            className="btn-win-secondary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Wallet className="w-4 h-4 text-win-blue" />
            <span className="hidden sm:inline">Atur Saldo Awal</span>
            <span className="sm:hidden">Saldo</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* ===== FULL PAGE LOADING ===== */}
        {loading ? (
          <>
            {/* Skeleton Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SkeletonCard isPrimary />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <SkeletonTable />
          </>
        ) : (
          <>
            {/* ===== DASHBOARD CARDS ===== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              {/* Card: Sisa Saldo (Primary) */}
              <div className="bg-win-blue-dark rounded-lg p-5 text-white sm:col-span-2 lg:col-span-1 card-hover">
                <div className="flex items-center gap-2 mb-2 opacity-90">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-medium">Sisa Saldo</span>
                </div>
                <p className="text-2xl lg:text-3xl font-bold tracking-tight">
                  {formatRupiah(sisaSaldo)}
                </p>
                <p className="text-xs opacity-70 mt-1">Saldo saat ini</p>
              </div>

              {/* Card: Saldo Awal */}
              <div className="bg-white rounded-lg p-5 border border-win-border card-hover">
                <div className="flex items-center gap-2 mb-2 text-gray-500">
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-medium">Saldo Awal</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{formatRupiah(saldoAwal)}</p>
                <p className="text-xs text-gray-400 mt-1">Modal awal</p>
              </div>

              {/* Card: Total Pemasukan */}
              <div className="bg-white rounded-lg p-5 border border-win-border card-hover">
                <div className="flex items-center gap-2 mb-2 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Total Pemasukan</span>
                </div>
                <p className="text-xl font-bold text-green-600">{formatRupiah(totalPemasukan)}</p>
                <p className="text-xs text-gray-400 mt-1">Semua pemasukan</p>
              </div>

              {/* Card: Total Pengeluaran */}
              <div className="bg-white rounded-lg p-5 border border-win-border card-hover">
                <div className="flex items-center gap-2 mb-2 text-red-500">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm font-medium">Total Pengeluaran</span>
                </div>
                <p className="text-xl font-bold text-red-500">{formatRupiah(totalPengeluaran)}</p>
                <p className="text-xs text-gray-400 mt-1">Semua pengeluaran</p>
              </div>
            </div>

            {/* ===== FORM INPUT ===== */}
            <div className="bg-white rounded-lg border border-win-border p-5 animate-fade-in">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-win-blue" />
                Input Transaksi Harian
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Toggle Jenis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jenis Transaksi
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setJenis('pemasukan')}
                      className={`flex-1 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all border-2 ${
                        jenis === 'pemasukan'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-win-border bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Plus className="w-5 h-5" />
                      Pemasukan
                    </button>
                    <button
                      type="button"
                      onClick={() => setJenis('pengeluaran')}
                      className={`flex-1 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all border-2 ${
                        jenis === 'pengeluaran'
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-win-border bg-white text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Minus className="w-5 h-5" />
                      Pengeluaran
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Tanggal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg input-win text-sm"
                      required
                    />
                  </div>

                  {/* Jumlah */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Jumlah (Rp)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={jumlah}
                      onChange={(e) => setJumlah(formatInputRupiah(e.target.value))}
                      placeholder="Contoh: 150.000"
                      className="w-full px-3 py-2.5 rounded-lg input-win text-sm"
                      required
                    />
                  </div>

                  {/* Keterangan */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Keterangan
                    </label>
                    <input
                      type="text"
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Contoh: Belanja bulanan"
                      className="w-full px-3 py-2.5 rounded-lg input-win text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Tombol Simpan */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto btn-win-primary px-8 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <WinSpinner className="border-white/30 border-t-white" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Data</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* ===== TABEL RIWAYAT ===== */}
            <div className="bg-white rounded-lg border border-win-border overflow-hidden animate-fade-in">
              {/* Header Tabel */}
              <div className="p-4 border-b border-win-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  📋 Riwayat Transaksi
                </h2>

                <div className="flex items-center gap-3 flex-wrap">
                  {/* Filter Bulan */}
                  <div className="relative">
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(Number(e.target.value))}
                      className="appearance-none bg-white border border-win-border rounded-lg px-3 py-2 pr-8 text-sm input-win cursor-pointer"
                    >
                      {BULAN_NAMA.map((nama, idx) => (
                        <option key={idx} value={idx + 1}>
                          {nama}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Filter Tahun */}
                  <div className="relative">
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(Number(e.target.value))}
                      className="appearance-none bg-white border border-win-border rounded-lg px-3 py-2 pr-8 text-sm input-win cursor-pointer"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Export Button */}
                  <button
                    onClick={handleExportExcel}
                    className="btn-win-secondary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Download className="w-4 h-4 text-green-600" />
                    <span className="hidden sm:inline">📥 Export ke Excel (Siap Print)</span>
                    <span className="sm:hidden">📥 Export</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              {tableRows.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Belum ada data transaksi untuk {BULAN_NAMA[filterMonth - 1]} {filterYear}.</p>
                  <p className="text-xs mt-1">Mulai catat pemasukan dan pengeluaran harian.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-zebra">
                    <thead>
                      <tr className="bg-gray-50 border-b border-win-border">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 w-12">No</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 w-28">Tanggal</th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Keterangan</th>
                        <th className="text-right px-4 py-3 font-semibold text-green-600 w-32">Pemasukan</th>
                        <th className="text-right px-4 py-3 font-semibold text-red-500 w-32">Pengeluaran</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-600 w-36">Sisa Saldo</th>
                        <th className="text-center px-4 py-3 font-semibold text-gray-600 w-16">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row) => (
                        <tr
                          key={row.id}
                          className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${
                            row.id === newRowId ? 'row-enter' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-500">{row.no}</td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            {formatTanggal(row.tanggal)}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {row.jenis === 'saldo_awal' && (
                              <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mr-2 font-medium">
                                Saldo Awal
                              </span>
                            )}
                            {row.keterangan}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium whitespace-nowrap">
                            {row.pemasukan > 0 ? formatRupiah(row.pemasukan) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-red-500 font-medium whitespace-nowrap">
                            {row.pengeluaran > 0 ? formatRupiah(row.pengeluaran) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                            {formatRupiah(row.saldo)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setDeleteItem(row)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                              title="Hapus data"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Table Footer Summary */}
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-win-border font-semibold">
                        <td colSpan={3} className="px-4 py-3 text-right text-gray-600">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 whitespace-nowrap">
                          {formatRupiah(filteredPemasukan)}
                        </td>
                        <td className="px-4 py-3 text-right text-red-500 whitespace-nowrap">
                          {formatRupiah(filteredPengeluaran)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-800 whitespace-nowrap">
                          {tableRows.length > 0 ? formatRupiah(tableRows[tableRows.length - 1].saldo) : 'Rp 0'}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="text-center text-xs text-gray-400 py-4">
              Catatan Keuangan &copy; {new Date().getFullYear()} &mdash; Dibuat dengan ❤️ untuk Mama
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
