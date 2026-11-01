import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Save,
  Trash2,
  Edit2,
  Download,
  Plus,
  Search,
  CheckCircle2,
  X,
  Sliders,
  Users,
  DollarSign,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const API_URL = '/api';

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

const formatRupiah = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
};

const formatCellRupiah = (num) => {
  if (!num || Number(num) === 0) return '-';
  return Number(num).toLocaleString('id-ID');
};

const formatInputRupiah = (val) => {
  const digits = String(val || '').replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
};

const parseRupiahInput = (val) => {
  if (!val) return 0;
  const digits = String(val).replace(/\D/g, '');
  return Number(digits) || 0;
};

export default function App() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    total_saldo_awal: 0,
    total_sumbangan: 0,
    total_pemasukan: 0,
    total_pengeluaran: 0,
    sisa_saldo: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('contribution'); // contribution | expense | members
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedCell, setSelectedCell] = useState(null); // { memberId, bulan }

  // Form Sumbangan
  const [contribMemberId, setContribMemberId] = useState('');
  const [contribMemberSearch, setContribMemberSearch] = useState('');
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [contribMonth, setContribMonth] = useState(new Date().getMonth() + 1);
  const [contribNominal, setContribNominal] = useState('100.000');
  const dropdownRef = useRef(null);
  const formSectionRef = useRef(null);

  // Form Pengeluaran
  const [expenseId, setExpenseId] = useState(null);
  const [expenseTanggal, setExpenseTanggal] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [expenseNominal, setExpenseNominal] = useState('');
  const [expenseKeterangan, setExpenseKeterangan] = useState('');

  // Form Anggota
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberNoUrut, setMemberNoUrut] = useState('');
  const [memberNama, setMemberNama] = useState('');

  // Modal Saldo Awal
  const [isSaldoModalOpen, setIsSaldoModalOpen] = useState(false);
  const [modalSaldoNominal, setModalSaldoNominal] = useState('');
  const [modalSaldoKeterangan, setModalSaldoKeterangan] = useState(
    'Saldo Awal / Akumulasi Sebelumnya'
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsMemberDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Data
  const fetchData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}?tahun=${selectedYear}`);
        const data = await res.json();
        if (data.success) {
          setMembers(data.members || []);
          setContributions(data.contributions || []);
          setExpenses(data.expenses || []);
          if (data.summary) setSummary(data.summary);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [selectedYear]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Trigger Toast Notification with Sisa Saldo
  const showNotification = (message, customSisaSaldo = null) => {
    const sisa = customSisaSaldo !== null ? customSisaSaldo : summary.sisa_saldo;
    setToast({
      message,
      sisaSaldo: sisa,
    });
    setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  // Matrix Map & Calculations
  const contributionsMap = useMemo(() => {
    const map = {};
    for (const c of contributions) {
      if (!map[c.member_id]) map[c.member_id] = {};
      map[c.member_id][c.bulan] = Number(c.jumlah);
    }
    return map;
  }, [contributions]);

  const memberRowTotals = useMemo(() => {
    const totals = {};
    for (const m of members) {
      let sum = 0;
      for (let b = 1; b <= 12; b++) {
        sum += contributionsMap[m.id]?.[b] || 0;
      }
      totals[m.id] = sum;
    }
    return totals;
  }, [members, contributionsMap]);

  const monthlyTotals = useMemo(() => {
    const totals = {};
    for (let b = 1; b <= 12; b++) totals[b] = 0;
    for (const c of contributions) {
      totals[c.bulan] = (totals[c.bulan] || 0) + Number(c.jumlah);
    }
    return totals;
  }, [contributions]);

  const grandTotalSumbangan = useMemo(() => {
    return Object.values(monthlyTotals).reduce((a, b) => a + b, 0);
  }, [monthlyTotals]);

  const saldoAwalItem = useMemo(() => {
    return expenses.find((e) => e.jenis === 'saldo_awal');
  }, [expenses]);

  const totalSaldoAwal = useMemo(() => {
    return Number(saldoAwalItem?.jumlah || 0);
  }, [saldoAwalItem]);

  const totalPemasukan = useMemo(() => {
    return totalSaldoAwal + grandTotalSumbangan;
  }, [totalSaldoAwal, grandTotalSumbangan]);

  const pengeluaranList = useMemo(() => {
    return expenses.filter((e) => e.jenis === 'pengeluaran');
  }, [expenses]);

  const totalPengeluaran = useMemo(() => {
    return pengeluaranList.reduce((acc, curr) => acc + Number(curr.jumlah), 0);
  }, [pengeluaranList]);

  const sisaSaldoFinal = useMemo(() => {
    return totalPemasukan - totalPengeluaran;
  }, [totalPemasukan, totalPengeluaran]);

  const pengeluaranKeteranganText = useMemo(() => {
    if (pengeluaranList.length === 0) return 'Tidak ada pengeluaran';
    return pengeluaranList
      .map(
        (p) =>
          `${formatRupiah(p.jumlah)} (${p.keterangan || 'pengeluaran'})`
      )
      .join(', ');
  }, [pengeluaranList]);

  // Filtered members for matrix table
  const filteredMembers = useMemo(() => {
    if (!filterSearch.trim()) return members;
    const q = filterSearch.toLowerCase();
    return members.filter(
      (m) =>
        m.nama.toLowerCase().includes(q) || String(m.no_urut).includes(q)
    );
  }, [members, filterSearch]);

  // Autocomplete members search for form input
  const searchedMembersForInput = useMemo(() => {
    if (!contribMemberSearch.trim()) return members;
    const q = contribMemberSearch.toLowerCase();
    return members.filter((m) => m.nama.toLowerCase().includes(q));
  }, [members, contribMemberSearch]);

  // Quick Edit Cell Click
  const handleCellClick = (member, bulan) => {
    setSelectedCell({ memberId: member.id, bulan });
    setActiveTab('contribution');
    setContribMemberId(member.id);
    setContribMemberSearch(member.nama);
    setContribMonth(bulan);
    const existingVal = contributionsMap[member.id]?.[bulan] || 0;
    setContribNominal(existingVal > 0 ? formatInputRupiah(String(existingVal)) : '100.000');
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Submit Sumbangan
  const handleSaveContribution = async (e) => {
    e.preventDefault();
    if (!contribMemberId) {
      alert('Silakan pilih nama anggota terlebih dahulu.');
      return;
    }

    setIsSaving(true);
    const nominal = parseRupiahInput(contribNominal);

    try {
      const res = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_contribution',
          tahun: selectedYear,
          member_id: contribMemberId,
          bulan: contribMonth,
          jumlah: nominal,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchData(false);
        const memberObj = members.find((m) => m.id === Number(contribMemberId));
        const bulanName = MONTH_NAMES[contribMonth - 1];
        const msg =
          nominal > 0
            ? `Sumbangan ${memberObj?.nama || 'Anggota'} (${bulanName}): ${formatRupiah(nominal)}`
            : `Sumbangan ${memberObj?.nama || 'Anggota'} (${bulanName}) telah dihapus`;

        showNotification(
          `✅ Data berhasil disimpan! ${msg}`,
          data.summary?.sisa_saldo
        );
      } else {
        alert(data.error || 'Gagal menyimpan data.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Pengeluaran
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseNominal || !expenseKeterangan.trim()) {
      alert('Nominal dan Keterangan wajib diisi.');
      return;
    }

    setIsSaving(true);
    const nominal = parseRupiahInput(expenseNominal);

    try {
      const res = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_expense',
          tahun: selectedYear,
          id: expenseId,
          tanggal: expenseTanggal,
          jumlah: nominal,
          keterangan: expenseKeterangan.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchData(false);
        setExpenseId(null);
        setExpenseNominal('');
        setExpenseKeterangan('');
        showNotification(
          `✅ Pengeluaran "${expenseKeterangan}" sebesar ${formatRupiah(nominal)} berhasil disimpan!`,
          data.summary?.sisa_saldo
        );
      } else {
        alert(data.error || 'Gagal menyimpan pengeluaran.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Pengeluaran
  const handleDeleteExpense = async (id, keterangan) => {
    if (!window.confirm(`Yakin ingin menghapus pengeluaran "${keterangan}"?`)) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_expense',
          tahun: selectedYear,
          id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchData(false);
        showNotification(
          `✅ Pengeluaran "${keterangan}" berhasil dihapus.`,
          data.summary?.sisa_saldo
        );
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus data.');
    } finally {
      setIsSaving(false);
    }
  };

  // Edit Pengeluaran (Populate form)
  const handleEditExpense = (item) => {
    setExpenseId(item.id);
    setExpenseTanggal(item.tanggal ? item.tanggal.split('T')[0] : '');
    setExpenseNominal(formatInputRupiah(String(item.jumlah)));
    setExpenseKeterangan(item.keterangan);
    setActiveTab('expense');
  };

  // Submit Saldo Awal Modal
  const handleSaveSaldoAwal = async () => {
    setIsSaving(true);
    const nominal = parseRupiahInput(modalSaldoNominal);

    try {
      const res = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_saldo_awal',
          tahun: selectedYear,
          jumlah: nominal,
          keterangan: modalSaldoKeterangan,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchData(false);
        setIsSaldoModalOpen(false);
        showNotification(
          `✅ Saldo Awal tahun ${selectedYear} diperbarui menjadi ${formatRupiah(nominal)}!`,
          data.summary?.sisa_saldo
        );
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan saldo awal.');
    } finally {
      setIsSaving(false);
    }
  };

  const openSaldoModal = () => {
    setModalSaldoNominal(formatInputRupiah(String(totalSaldoAwal || '')));
    setModalSaldoKeterangan(
      saldoAwalItem?.keterangan || 'Saldo Awal / Akumulasi Sebelumnya'
    );
    setIsSaldoModalOpen(true);
  };

  // Submit Member (Add/Edit)
  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!memberNama.trim()) {
      alert('Nama anggota tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_member',
          id: editingMemberId,
          no_urut: memberNoUrut || undefined,
          nama: memberNama.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchData(false);
        setEditingMemberId(null);
        setMemberNoUrut('');
        setMemberNama('');
        showNotification(
          editingMemberId
            ? '✅ Nama anggota berhasil diperbarui!'
            : '✅ Anggota baru berhasil ditambahkan!'
        );
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan anggota.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditMember = (m) => {
    setEditingMemberId(m.id);
    setMemberNoUrut(m.no_urut);
    setMemberNama(m.nama);
    setActiveTab('members');
  };

  const handleDeleteMember = async (m) => {
    if (
      !window.confirm(
        `Yakin ingin menghapus "${m.nama}"? Seluruh data sumbangannya juga akan terhapus!`
      )
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_member',
          id: m.id,
          tahun: selectedYear,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchData(false);
        showNotification(`✅ Anggota "${m.nama}" berhasil dihapus.`);
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus anggota.');
    } finally {
      setIsSaving(false);
    }
  };

  // Export to Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const wsData = [];

    // Title Header
    wsData.push([`CATATAN KEUANGAN V2 - LAPORAN TAHUNAN ${selectedYear}`]);
    wsData.push([
      `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`,
    ]);
    wsData.push([]); // blank row

    // Table Header
    const headers = [
      'No.',
      'Nama Anggota',
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
      'TOTAL',
    ];
    wsData.push(headers);

    // Rows for each member
    for (const m of members) {
      const row = [m.no_urut, m.nama];
      let rowSum = 0;
      for (let b = 1; b <= 12; b++) {
        const val = contributionsMap[m.id]?.[b] || 0;
        row.push(val > 0 ? val : '-');
        rowSum += val;
      }
      row.push(rowSum);
      wsData.push(row);
    }

    // Footer: Jumlah bulanan
    const jumlahRow = ['', 'Jumlah'];
    for (let b = 1; b <= 12; b++) {
      jumlahRow.push(monthlyTotals[b] || 0);
    }
    jumlahRow.push(grandTotalSumbangan);
    wsData.push(jumlahRow);

    // Footer: TOTAL Pemasukan & Pengeluaran
    const totalRow = [
      '',
      'TOTAL',
      totalPemasukan,
      `Pengeluaran ${formatRupiah(totalPengeluaran)} (${pengeluaranKeteranganText})`,
    ];
    wsData.push(totalRow);

    // Footer: SISA SALDO
    const sisaSaldoRow = ['', 'SISA SALDO', sisaSaldoFinal];
    wsData.push(sisaSaldoRow);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column Widths for clean printing
    ws['!cols'] = [
      { wch: 6 }, // No
      { wch: 26 }, // Nama
      { wch: 14 }, // Jan
      { wch: 14 }, // Feb
      { wch: 14 }, // Mar
      { wch: 14 }, // Apr
      { wch: 14 }, // Mei
      { wch: 14 }, // Jun
      { wch: 14 }, // Jul
      { wch: 14 }, // Agu
      { wch: 14 }, // Sep
      { wch: 14 }, // Okt
      { wch: 14 }, // Nov
      { wch: 14 }, // Des
      { wch: 18 }, // Total
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Laporan ${selectedYear}`);
    XLSX.writeFile(wb, `Laporan_Catatan_Keuangan_${selectedYear}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#F3F3F3] text-gray-800 flex flex-col font-sans">
      {/* ======================================================== */}
      {/* 1. WINDOWS 11 TITLE BAR & HEADER */}
      {/* ======================================================== */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#0067C0] text-white flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-gray-900 leading-none">
                  Catatan Keuangan v2
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-[#0067C0] border border-blue-200">
                  WinUI 3
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Laporan Matriks Sumbangan Bulanan & Pengeluaran Kas
              </p>
            </div>
          </div>

          {/* Action Toolbar: Pilih Tahun & Export Excel */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-gray-100 rounded-md border border-gray-300 px-3 py-1.5 shadow-2xs">
              <Calendar className="w-4 h-4 text-[#0067C0] mr-2" />
              <label htmlFor="year-select" className="text-xs font-medium text-gray-600 mr-2">
                Tahun:
              </label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-sm font-bold text-gray-800 focus:outline-hidden cursor-pointer"
              >
                {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportExcel}
              className="win-btn-secondary inline-flex items-center px-3.5 py-1.5 text-sm font-semibold rounded-md shadow-2xs text-emerald-700 hover:text-emerald-800 hover:border-emerald-300 transition-all cursor-pointer"
              title="Download file .xlsx siap print"
            >
              <Download className="w-4 h-4 mr-1.5 text-emerald-600" />
              Export Excel (.xlsx)
            </button>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* REAL-TIME TOAST NOTIFICATION (SISA SALDO) */}
      {/* ======================================================== */}
      {toast && (
        <div className="fixed top-18 right-4 sm:right-8 z-50 max-w-md animate-bounce-short">
          <div className="bg-white border-2 border-[#0067C0] rounded-lg shadow-xl p-4 flex items-start space-x-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 leading-snug">
                {toast.message}
              </p>
              <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Sisa Saldo Terbaru:</span>
                <span className="font-bold text-[#0067C0] text-sm">
                  {formatRupiah(toast.sisaSaldo)}
                </span>
              </div>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        {/* ======================================================== */}
        {/* 2. DASHBOARD SUMMARY CARDS */}
        {/* ======================================================== */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: TOTAL PEMASUKAN */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 tracking-wider uppercase">
                TOTAL PEMASUKAN
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-gray-900">
                {formatRupiah(totalPemasukan)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Saldo Awal ({formatRupiah(totalSaldoAwal)}) + Sumbangan (
                {formatRupiah(grandTotalSumbangan)})
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">Tahun {selectedYear}</span>
              <button
                onClick={openSaldoModal}
                className="text-xs font-semibold text-[#0067C0] hover:underline flex items-center cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 mr-1" />
                Atur Saldo Awal
              </button>
            </div>
          </div>

          {/* Card 2: TOTAL PENGELUARAN */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 tracking-wider uppercase">
                TOTAL PENGELUARAN
              </span>
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-rose-600">
                {formatRupiah(totalPengeluaran)}
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate" title={pengeluaranKeteranganText}>
                {pengeluaranKeteranganText}
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">{pengeluaranList.length} transaksi pengeluaran</span>
              <button
                onClick={() => setActiveTab('expense')}
                className="text-xs font-semibold text-[#0067C0] hover:underline cursor-pointer"
              >
                Lihat Rincian &rarr;
              </button>
            </div>
          </div>

          {/* Card 3: SISA SALDO (Menonjol - Biru Windows) */}
          <div className="bg-[#0067C0] text-white rounded-lg border border-blue-700 p-5 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between text-blue-100">
              <span className="text-xs font-bold tracking-wider uppercase">
                SISA SALDO AKTIF
              </span>
              <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black text-white tracking-tight">
                {formatRupiah(sisaSaldoFinal)}
              </div>
              <p className="text-xs text-blue-100 mt-1">
                Pemasukan ({formatRupiah(totalPemasukan)}) &minus; Pengeluaran (
                {formatRupiah(totalPengeluaran)})
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs text-blue-100">
              <span>Status Kas Tahun {selectedYear}</span>
              <span className="font-semibold text-white bg-white/20 px-2 py-0.5 rounded">
                Aktif
              </span>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 3. FORM INPUT SECTION (3 TABS) */}
        {/* ======================================================== */}
        <section
          ref={formSectionRef}
          className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden"
        >
          {/* Segmented Tab Headers (WinUI Style) */}
          <div className="border-b border-gray-200 bg-gray-50/70 px-4 pt-3 flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('contribution')}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors flex items-center space-x-2 border-t border-x cursor-pointer ${
                activeTab === 'contribution'
                  ? 'bg-white text-[#0067C0] border-gray-200 border-b-transparent shadow-xs'
                  : 'bg-transparent text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Input Sumbangan Bulanan</span>
            </button>

            <button
              onClick={() => setActiveTab('expense')}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors flex items-center space-x-2 border-t border-x cursor-pointer ${
                activeTab === 'expense'
                  ? 'bg-white text-[#0067C0] border-gray-200 border-b-transparent shadow-xs'
                  : 'bg-transparent text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60'
              }`}
            >
              <TrendingDown className="w-4 h-4 text-rose-500" />
              <span>Input Pengeluaran</span>
            </button>

            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors flex items-center space-x-2 border-t border-x cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-white text-[#0067C0] border-gray-200 border-b-transparent shadow-xs'
                  : 'bg-transparent text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100/60'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Tambah / Edit Nama Anggota ({members.length})</span>
            </button>
          </div>

          <div className="p-5">
            {/* ---------------------------------------------------- */}
            {/* TAB 1: INPUT SUMBANGAN BULANAN (DEFAULT) */}
            {/* ---------------------------------------------------- */}
            {activeTab === 'contribution' && (
              <form onSubmit={handleSaveContribution} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Searchable Autocomplete Dropdown Nama */}
                  <div className="relative" ref={dropdownRef}>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      1. Cari & Pilih Nama Anggota
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ketik nama (misal John / Renjaan)..."
                        value={contribMemberSearch}
                        onFocus={() => setIsMemberDropdownOpen(true)}
                        onChange={(e) => {
                          setContribMemberSearch(e.target.value);
                          setIsMemberDropdownOpen(true);
                        }}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-hidden focus:border-[#0067C0] focus:ring-1 focus:ring-[#0067C0]"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      {contribMemberSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setContribMemberSearch('');
                            setContribMemberId('');
                          }}
                          className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown Options */}
                    {isMemberDropdownOpen && (
                      <div className="absolute z-40 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
                        {searchedMembersForInput.length > 0 ? (
                          searchedMembersForInput.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => {
                                setContribMemberId(m.id);
                                setContribMemberSearch(m.nama);
                                setIsMemberDropdownOpen(false);
                                // Set existing value if already present
                                const curr =
                                  contributionsMap[m.id]?.[contribMonth] || 0;
                                setContribNominal(
                                  curr > 0
                                    ? formatInputRupiah(String(curr))
                                    : '100.000'
                                );
                              }}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                                contribMemberId === m.id
                                  ? 'bg-blue-100/60 font-semibold text-[#0067C0]'
                                  : 'text-gray-800'
                              }`}
                            >
                              <span>
                                {m.no_urut}. {m.nama}
                              </span>
                              {contribMemberId === m.id && (
                                <CheckCircle2 className="w-4 h-4 text-[#0067C0]" />
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-gray-400">
                            Nama tidak ditemukan.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Pilih Bulan */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      2. Pilih Bulan
                    </label>
                    <div className="relative">
                      <select
                        value={contribMonth}
                        onChange={(e) => {
                          const m = Number(e.target.value);
                          setContribMonth(m);
                          if (contribMemberId) {
                            const curr =
                              contributionsMap[contribMemberId]?.[m] || 0;
                            setContribNominal(
                              curr > 0
                                ? formatInputRupiah(String(curr))
                                : '100.000'
                            );
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-hidden focus:border-[#0067C0] focus:ring-1 focus:ring-[#0067C0] cursor-pointer"
                      >
                        {MONTH_NAMES.map((name, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            Bulan {idx + 1} &mdash; {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Nominal Input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      3. Nominal Sumbangan (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm font-semibold text-gray-500">
                        Rp
                      </span>
                      <input
                        type="text"
                        placeholder="100.000"
                        value={contribNominal}
                        onChange={(e) =>
                          setContribNominal(formatInputRupiah(e.target.value))
                        }
                        className="w-full pl-10 pr-3 py-2 text-sm font-semibold border border-gray-300 rounded-md bg-white focus:outline-hidden focus:border-[#0067C0] focus:ring-1 focus:ring-[#0067C0]"
                      />
                    </div>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      💡 Ketik 0 untuk menghapus sumbangan bulan ini.
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-gray-500">
                    {contribMemberId ? (
                      <span>
                        Target:{' '}
                        <strong>
                          {
                            members.find((m) => m.id === Number(contribMemberId))
                              ?.nama
                          }
                        </strong>{' '}
                        &bull; {MONTH_NAMES[contribMonth - 1]} {selectedYear}
                      </span>
                    ) : (
                      <span>Pilih nama anggota di atas atau klik sel pada tabel matriks di bawah.</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="win-btn-primary px-5 py-2 text-sm font-semibold rounded-md shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="win-spinner-white" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Simpan Sumbangan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ---------------------------------------------------- */}
            {/* TAB 2: INPUT PENGELUARAN */}
            {/* ---------------------------------------------------- */}
            {activeTab === 'expense' && (
              <div className="space-y-6">
                <form
                  onSubmit={handleSaveExpense}
                  className="bg-gray-50/60 p-4 rounded-lg border border-gray-200 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800">
                      {expenseId ? 'Edit Data Pengeluaran' : 'Tambah Pengeluaran Baru'}
                    </h3>
                    {expenseId && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpenseId(null);
                          setExpenseNominal('');
                          setExpenseKeterangan('');
                        }}
                        className="text-xs text-gray-500 hover:text-gray-800 underline cursor-pointer"
                      >
                        Batal Edit
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Tanggal
                      </label>
                      <input
                        type="date"
                        value={expenseTanggal}
                        onChange={(e) => setExpenseTanggal(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-hidden focus:border-[#0067C0]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Nominal (Rp)
                      </label>
                      <input
                        type="text"
                        placeholder="4.000.000"
                        value={expenseNominal}
                        onChange={(e) =>
                          setExpenseNominal(formatInputRupiah(e.target.value))
                        }
                        className="w-full px-3 py-2 text-sm font-semibold border border-gray-300 rounded-md bg-white focus:outline-hidden focus:border-[#0067C0]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                        Keterangan Pengeluaran
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: beli molen gereja"
                        value={expenseKeterangan}
                        onChange={(e) => setExpenseKeterangan(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-hidden focus:border-[#0067C0]"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="win-btn-primary px-5 py-2 text-sm font-semibold rounded-md shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <div className="win-spinner-white" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{expenseId ? 'Perbarui Pengeluaran' : 'Simpan Pengeluaran'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* List Pengeluaran */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                    Riwayat Pengeluaran Tahun {selectedYear} ({pengeluaranList.length})
                  </h4>

                  {pengeluaranList.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400 bg-gray-50 rounded-md border border-gray-200">
                      Belum ada catatan pengeluaran di tahun {selectedYear}.
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-700 text-xs uppercase font-bold border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2.5">Tanggal</th>
                            <th className="px-4 py-2.5">Keterangan</th>
                            <th className="px-4 py-2.5 text-right">Nominal</th>
                            <th className="px-4 py-2.5 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {pengeluaranList.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                                {new Date(item.tanggal).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-gray-900">
                                {item.keterangan}
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-rose-600 whitespace-nowrap">
                                {formatRupiah(item.jumlah)}
                              </td>
                              <td className="px-4 py-2.5 text-center space-x-2 whitespace-nowrap">
                                <button
                                  onClick={() => handleEditExpense(item)}
                                  className="text-[#0067C0] hover:text-blue-800 p-1 rounded cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4 inline" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteExpense(item.id, item.keterangan)
                                  }
                                  className="text-rose-500 hover:text-rose-700 p-1 rounded cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4 inline" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-rose-50/50 border-t border-gray-200 font-bold text-rose-800">
                          <tr>
                            <td colSpan={2} className="px-4 py-2.5 text-right">
                              Total Pengeluaran:
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              {formatRupiah(totalPengeluaran)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------- */}
            {/* TAB 3: TAMBAH / EDIT NAMA ANGGOTA */}
            {/* ---------------------------------------------------- */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                <form
                  onSubmit={handleSaveMember}
                  className="bg-gray-50/60 p-4 rounded-lg border border-gray-200 flex flex-wrap items-end gap-3"
                >
                  <div className="w-24">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      No. Urut
                    </label>
                    <input
                      type="number"
                      placeholder="Auto"
                      value={memberNoUrut}
                      onChange={(e) => setMemberNoUrut(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-hidden focus:border-[#0067C0]"
                    />
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Nama Anggota
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bpk. John Renyaan"
                      value={memberNama}
                      onChange={(e) => setMemberNama(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-hidden focus:border-[#0067C0]"
                      required
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="win-btn-primary px-4 py-2 text-sm font-semibold rounded-md shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{editingMemberId ? 'Simpan Perubahan' : 'Tambah Anggota'}</span>
                    </button>

                    {editingMemberId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMemberId(null);
                          setMemberNoUrut('');
                          setMemberNama('');
                        }}
                        className="win-btn-secondary px-3 py-2 text-sm rounded-md cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>

                {/* List Anggota */}
                <div className="border border-gray-200 rounded-md overflow-hidden bg-white max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-700 text-xs uppercase font-bold sticky top-0 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5 w-16">No.</th>
                        <th className="px-4 py-2.5">Nama Anggota</th>
                        <th className="px-4 py-2.5 text-center w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {members.map((m) => (
                        <tr key={m.id} className="hover:bg-blue-50/40">
                          <td className="px-4 py-2 text-gray-500 font-semibold">
                            {m.no_urut}
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-900">
                            {m.nama}
                          </td>
                          <td className="px-4 py-2 text-center space-x-2">
                            <button
                              onClick={() => handleEditMember(m)}
                              className="text-[#0067C0] hover:text-blue-800 p-1 rounded cursor-pointer"
                              title="Edit nama"
                            >
                              <Edit2 className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(m)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded cursor-pointer"
                              title="Hapus anggota"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* 4. INTERACTIVE MATRIX TABLE (12 BULAN) */}
        {/* ======================================================== */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-[#0067C0]" />
              <h2 className="text-base font-bold text-gray-900">
                Laporan Matriks Sumbangan Bulanan ({selectedYear})
              </h2>
            </div>

            {/* Quick Search Member */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="🔍 Cari nama di tabel..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:outline-hidden focus:border-[#0067C0]"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Matrix Content */}
          <div className="overflow-x-auto relative">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="win-spinner" />
                <span className="text-sm font-semibold text-gray-500">
                  Memuat data matriks tahun {selectedYear}...
                </span>
              </div>
            ) : (
              <table className="w-full border-collapse text-xs">
                {/* TABLE HEADER: DARK GREEN #2E5A44 */}
                <thead className="bg-[#2E5A44] text-white select-none">
                  <tr>
                    <th className="py-3 px-2 border-r border-[#3d7459] text-center w-10">
                      No.
                    </th>
                    <th className="py-3 px-3 border-r border-[#3d7459] text-left min-w-[170px] sticky left-0 bg-[#2E5A44] z-10 shadow-xs">
                      Nama Anggota
                    </th>
                    {MONTH_SHORT.map((m, idx) => (
                      <th
                        key={idx}
                        className="py-3 px-2 border-r border-[#3d7459] text-center min-w-[76px]"
                      >
                        {m}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-right min-w-[90px] font-bold">
                      TOTAL
                    </th>
                  </tr>
                </thead>

                {/* TABLE BODY */}
                <tbody className="divide-y divide-gray-200">
                  {filteredMembers.map((member, rIdx) => {
                    const rowSum = memberRowTotals[member.id] || 0;
                    const isEven = rIdx % 2 === 0;

                    return (
                      <tr
                        key={member.id}
                        className={`transition-colors hover:bg-blue-50/50 ${
                          isEven ? 'bg-white' : 'bg-gray-50/60'
                        }`}
                      >
                        {/* No. */}
                        <td className="py-2 px-2 text-center text-gray-500 font-semibold border-r border-gray-200">
                          {member.no_urut}
                        </td>

                        {/* Nama (Sticky Left) */}
                        <td
                          className={`py-2 px-3 font-semibold text-gray-900 border-r border-gray-200 sticky left-0 z-10 ${
                            isEven ? 'bg-white' : 'bg-[#FAFAFA]'
                          }`}
                        >
                          {member.nama}
                        </td>

                        {/* 12 Months Cells */}
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((b) => {
                          const val = contributionsMap[member.id]?.[b] || 0;
                          const isSelected =
                            selectedCell?.memberId === member.id &&
                            selectedCell?.bulan === b;

                          return (
                            <td
                              key={b}
                              onClick={() => handleCellClick(member, b)}
                              className={`py-2 px-2 text-center border-r border-gray-200 cursor-pointer select-none transition-all ${
                                isSelected
                                  ? 'bg-blue-100 ring-2 ring-inset ring-[#0067C0] font-bold text-[#0067C0]'
                                  : val > 0
                                  ? 'font-medium text-gray-800 hover:bg-blue-50'
                                  : 'text-gray-300 hover:bg-gray-100/70'
                              }`}
                              title={`Klik untuk edit: ${member.nama} (${MONTH_NAMES[b - 1]})`}
                            >
                              {formatCellRupiah(val)}
                            </td>
                          );
                        })}

                        {/* Row Total */}
                        <td className="py-2 px-3 text-right font-bold text-gray-900 bg-gray-50/80">
                          {formatCellRupiah(rowSum)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* TABLE FOOTER: JUMLAH, TOTAL (YELLOW), SISA SALDO */}
                <tfoot className="border-t-2 border-gray-300 font-bold">
                  {/* Row 1: Jumlah Bulanan */}
                  <tr className="bg-gray-100 text-gray-800">
                    <td className="py-2.5 px-2 text-center border-r border-gray-300"></td>
                    <td className="py-2.5 px-3 border-r border-gray-300 sticky left-0 bg-gray-100 z-10 text-gray-900">
                      Jumlah
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((b) => (
                      <td
                        key={b}
                        className="py-2.5 px-2 text-center border-r border-gray-300 whitespace-nowrap"
                      >
                        {formatCellRupiah(monthlyTotals[b])}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right text-gray-900 bg-gray-200">
                      {formatCellRupiah(grandTotalSumbangan)}
                    </td>
                  </tr>

                  {/* Row 2: TOTAL (Highlight Kuning #FFFF00) */}
                  <tr className="bg-[#FFFF00] text-gray-900 border-t border-b border-yellow-400">
                    <td className="py-3 px-2 text-center border-r border-yellow-300"></td>
                    <td className="py-3 px-3 border-r border-yellow-300 sticky left-0 bg-[#FFFF00] z-10 font-extrabold text-sm">
                      TOTAL
                    </td>
                    {/* Nilai Total Pemasukan */}
                    <td
                      colSpan={4}
                      className="py-3 px-3 text-left font-black text-sm border-r border-yellow-300 whitespace-nowrap"
                    >
                      {formatRupiah(totalPemasukan)}
                    </td>
                    {/* Teks Rincian Pengeluaran */}
                    <td
                      colSpan={9}
                      className="py-3 px-3 text-left font-semibold text-gray-800 truncate"
                      title={pengeluaranKeteranganText}
                    >
                      Pengeluaran {formatRupiah(totalPengeluaran)} (
                      {pengeluaranKeteranganText})
                    </td>
                  </tr>

                  {/* Row 3: SISA SALDO (Highlight Kuning/Hijau Muda) */}
                  <tr className="bg-[#FFFF00] text-gray-900">
                    <td className="py-3 px-2 text-center border-r border-yellow-300"></td>
                    <td className="py-3 px-3 border-r border-yellow-300 sticky left-0 bg-[#FFFF00] z-10 font-extrabold text-sm text-[#0067C0]">
                      SISA SALDO
                    </td>
                    <td
                      colSpan={13}
                      className="py-3 px-3 text-left font-black text-base text-gray-900"
                    >
                      {formatRupiah(sisaSaldoFinal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </section>
      </main>

      {/* ======================================================== */}
      {/* 5. MODAL DIALOG: ATUR SALDO AWAL */}
      {/* ======================================================== */}
      {isSaldoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="bg-[#0067C0] text-white px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <Sliders className="w-4 h-4" />
                <span>Atur Saldo Awal Tahun {selectedYear}</span>
              </h3>
              <button
                onClick={() => setIsSaldoModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-600">
                Saldo awal adalah akumulasi dana kas dari tahun sebelumnya yang menjadi modal awal kas tahun {selectedYear}.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Nominal Saldo Awal (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-semibold text-gray-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={modalSaldoNominal}
                    onChange={(e) =>
                      setModalSaldoNominal(formatInputRupiah(e.target.value))
                    }
                    className="w-full pl-10 pr-3 py-2 text-sm font-semibold border border-gray-300 rounded-md focus:outline-hidden focus:border-[#0067C0]"
                    placeholder="29.050.000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={modalSaldoKeterangan}
                  onChange={(e) => setModalSaldoKeterangan(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:border-[#0067C0]"
                  placeholder="Saldo Awal / Akumulasi Sebelumnya"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSaldoModalOpen(false)}
                  className="win-btn-secondary px-4 py-2 text-sm rounded-md cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveSaldoAwal}
                  disabled={isSaving}
                  className="win-btn-primary px-4 py-2 text-sm font-semibold rounded-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="win-spinner-white" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Saldo Awal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-gray-200 bg-white py-4 text-center text-xs text-gray-500">
        <p>
          Catatan Keuangan v2 &bull; Bergaya Windows UI (WinUI 3) &bull; Dibuat khusus untuk Mama
        </p>
      </footer>
    </div>
  );
}
