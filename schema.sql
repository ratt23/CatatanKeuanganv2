-- ============================================
-- Catatan Keuangan V2 - Database Schema
-- Table: transactions_v2
-- Jalankan query ini di SQL Editor Neon jika diperlukan
-- ============================================

CREATE TABLE IF NOT EXISTS transactions_v2 (
    id            SERIAL PRIMARY KEY,
    tanggal       DATE NOT NULL,
    jenis         VARCHAR(20) NOT NULL CHECK (jenis IN ('saldo_awal', 'pemasukan', 'pengeluaran')),
    jumlah        BIGINT NOT NULL CHECK (jumlah > 0),
    keterangan    TEXT NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk mempercepat query berdasarkan tanggal
CREATE INDEX IF NOT EXISTS idx_transactions_v2_tanggal ON transactions_v2 (tanggal ASC, id ASC);

-- Index untuk mempercepat pencarian saldo_awal per bulan
CREATE INDEX IF NOT EXISTS idx_transactions_v2_jenis ON transactions_v2 (jenis);

-- Views/Aliases (opsional, agar query dengan "transaction v2" atau transaction_v2 juga bisa jalan)
CREATE OR REPLACE VIEW transaction_v2 AS SELECT * FROM transactions_v2;
CREATE OR REPLACE VIEW "transaction v2" AS SELECT * FROM transactions_v2;
