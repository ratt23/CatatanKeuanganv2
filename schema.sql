-- ============================================
-- Catatan Keuangan - Database Schema
-- Jalankan query ini di SQL Editor Neon
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
    id            SERIAL PRIMARY KEY,
    tanggal       DATE NOT NULL,
    jenis         VARCHAR(20) NOT NULL CHECK (jenis IN ('saldo_awal', 'pemasukan', 'pengeluaran')),
    jumlah        BIGINT NOT NULL CHECK (jumlah > 0),
    keterangan    TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk mempercepat query berdasarkan tanggal
CREATE INDEX IF NOT EXISTS idx_transactions_tanggal ON transactions (tanggal ASC, id ASC);

-- Index untuk mempercepat pencarian saldo_awal per bulan
CREATE INDEX IF NOT EXISTS idx_transactions_jenis ON transactions (jenis);
