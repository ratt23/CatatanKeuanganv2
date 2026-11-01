-- ============================================================
-- Catatan Keuangan v2 - Database Schema & Seed Data
-- Database: Neon Serverless PostgreSQL
-- ============================================================

-- 1. TABEL ANGGOTA (members)
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    no_urut INT NOT NULL,
    nama VARCHAR(100) NOT NULL
);

-- 2. TABEL SUMBANGAN BULANAN (contributions)
CREATE TABLE IF NOT EXISTS contributions (
    id SERIAL PRIMARY KEY,
    member_id INT REFERENCES members(id) ON DELETE CASCADE,
    tahun INT NOT NULL,
    bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
    jumlah BIGINT NOT NULL CHECK (jumlah >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(member_id, tahun, bulan)
);

-- 3. TABEL PENGELUARAN & SALDO AWAL (expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    tahun INT NOT NULL,
    tanggal DATE NOT NULL,
    jenis VARCHAR(30) NOT NULL CHECK (jenis IN ('saldo_awal', 'pengeluaran')),
    jumlah BIGINT NOT NULL CHECK (jumlah > 0),
    keterangan TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index performa query
CREATE INDEX IF NOT EXISTS idx_contributions_tahun ON contributions(tahun);
CREATE INDEX IF NOT EXISTS idx_expenses_tahun ON expenses(tahun);
CREATE INDEX IF NOT EXISTS idx_members_no_urut ON members(no_urut);

-- ============================================================
-- SEED DATA TAHUN 2026
-- ============================================================

-- Bersihkan data lama jika ingin reset (opsional)
TRUNCATE TABLE contributions, expenses, members RESTART IDENTITY CASCADE;

-- A. Insert 24 Anggota
INSERT INTO members (no_urut, nama) VALUES
(1, 'Bp. Cau Ubyaan'),
(2, 'Bp. John Renyaan'),
(3, 'Kel. Egen Ohoiwirin'),
(4, 'Ibu Kim Ubyaan'),
(5, 'Vivi Silooy'),
(6, 'Denis Silooy'),
(7, 'Ibu Yolan Ohoiwirin'),
(8, 'Ibu Sipora Rumheng'),
(9, 'Ibu Luly Ubyaan'),
(10, 'Bp. Yusak Ubyaan'),
(11, 'Ibu Ita Metwaan'),
(12, 'Bp. Boy Metwaan'),
(13, 'Bernie Metwaan'),
(14, 'Ferdy Metwaan'),
(15, 'Ibu Erny Renjaan'),
(16, 'Daniel Renjaan'),
(17, 'Samuel Renjaan'),
(18, 'Maria Renjaan'),
(19, 'Ibu Tin Ubyaan'),
(20, 'Bp. Yopi Ubyaan'),
(21, 'Ibu Adol Ubyaan'),
(22, 'Kel. Bpk. Jan Renjaan'),
(23, 'Bpk. Eli Renjaan'),
(24, 'Ibu Ema Renjaan');

-- B. Insert Sumbangan Bulanan 2026
-- No 2: Bp. John Renyaan (Jan=100k, Feb=100k, Mar=100k, Mei=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(2, 2026, 1, 100000), (2, 2026, 2, 100000), (2, 2026, 3, 100000), (2, 2026, 5, 100000);

-- No 4: Ibu Kim Ubyaan (Jan-Agu=100k, Okt=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(4, 2026, 1, 100000), (4, 2026, 2, 100000), (4, 2026, 3, 100000), (4, 2026, 4, 100000),
(4, 2026, 5, 100000), (4, 2026, 6, 100000), (4, 2026, 7, 100000), (4, 2026, 8, 100000), (4, 2026, 10, 100000);

-- No 5: Vivi Silooy (Jan-Agu=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(5, 2026, 1, 100000), (5, 2026, 2, 100000), (5, 2026, 3, 100000), (5, 2026, 4, 100000),
(5, 2026, 5, 100000), (5, 2026, 6, 100000), (5, 2026, 7, 100000), (5, 2026, 8, 100000);

-- No 6: Denis Silooy (Jan-Agu=100k, Okt=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(6, 2026, 1, 100000), (6, 2026, 2, 100000), (6, 2026, 3, 100000), (6, 2026, 4, 100000),
(6, 2026, 5, 100000), (6, 2026, 6, 100000), (6, 2026, 7, 100000), (6, 2026, 8, 100000), (6, 2026, 10, 100000);

-- No 8: Ibu Sipora Rumheng (Jan-Jul=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(8, 2026, 1, 100000), (8, 2026, 2, 100000), (8, 2026, 3, 100000), (8, 2026, 4, 100000),
(8, 2026, 5, 100000), (8, 2026, 6, 100000), (8, 2026, 7, 100000);

-- No 9: Ibu Luly Ubyaan (Jan=500k, Feb=500k, Mar=500k, Apr=200k, Mei=200k, Jun=250k, Jul=250k, Agu=250k, Sep=200k, Okt=150k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(9, 2026, 1, 500000), (9, 2026, 2, 500000), (9, 2026, 3, 500000), (9, 2026, 4, 200000),
(9, 2026, 5, 200000), (9, 2026, 6, 250000), (9, 2026, 7, 250000), (9, 2026, 8, 250000),
(9, 2026, 9, 200000), (9, 2026, 10, 150000);

-- No 10: Bp. Yusak Ubyaan (Jan=500k, Feb=500k, Mar=500k, Apr=250k, Mei=250k, Jun=250k, Jul=250k, Agu=250k, Sep=200k, Okt=150k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(10, 2026, 1, 500000), (10, 2026, 2, 500000), (10, 2026, 3, 500000), (10, 2026, 4, 250000),
(10, 2026, 5, 250000), (10, 2026, 6, 250000), (10, 2026, 7, 250000), (10, 2026, 8, 250000),
(10, 2026, 9, 200000), (10, 2026, 10, 150000);

-- No 11: Ibu Ita Metwaan (Jan-Agu=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(11, 2026, 1, 100000), (11, 2026, 2, 100000), (11, 2026, 3, 100000), (11, 2026, 4, 100000),
(11, 2026, 5, 100000), (11, 2026, 6, 100000), (11, 2026, 7, 100000), (11, 2026, 8, 100000);

-- No 12: Bp. Boy Metwaan (Jan=100k, Feb=100k, Mar=500k, Apr-Agu=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(12, 2026, 1, 100000), (12, 2026, 2, 100000), (12, 2026, 3, 500000), (12, 2026, 4, 100000),
(12, 2026, 5, 100000), (12, 2026, 6, 100000), (12, 2026, 7, 100000), (12, 2026, 8, 100000);

-- No 13: Bernie Metwaan (Jan-Jul=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(13, 2026, 1, 100000), (13, 2026, 2, 100000), (13, 2026, 3, 100000), (13, 2026, 4, 100000),
(13, 2026, 5, 100000), (13, 2026, 6, 100000), (13, 2026, 7, 100000);

-- No 14: Ferdy Metwaan (Jan-Jul=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(14, 2026, 1, 100000), (14, 2026, 2, 100000), (14, 2026, 3, 100000), (14, 2026, 4, 100000),
(14, 2026, 5, 100000), (14, 2026, 6, 100000), (14, 2026, 7, 100000);

-- No 15: Ibu Erny Renjaan (Jan-Okt=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(15, 2026, 1, 100000), (15, 2026, 2, 100000), (15, 2026, 3, 100000), (15, 2026, 4, 100000),
(15, 2026, 5, 100000), (15, 2026, 6, 100000), (15, 2026, 7, 100000), (15, 2026, 8, 100000),
(15, 2026, 9, 100000), (15, 2026, 10, 100000);

-- No 16: Daniel Renjaan (Jan-Jul=100k, Agu-Des=200k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(16, 2026, 1, 100000), (16, 2026, 2, 100000), (16, 2026, 3, 100000), (16, 2026, 4, 100000),
(16, 2026, 5, 100000), (16, 2026, 6, 100000), (16, 2026, 7, 100000),
(16, 2026, 8, 200000), (16, 2026, 9, 200000), (16, 2026, 10, 200000), (16, 2026, 11, 200000), (16, 2026, 12, 200000);

-- No 17: Samuel Renjaan (Jan-Okt=300k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(17, 2026, 1, 300000), (17, 2026, 2, 300000), (17, 2026, 3, 300000), (17, 2026, 4, 300000),
(17, 2026, 5, 300000), (17, 2026, 6, 300000), (17, 2026, 7, 300000), (17, 2026, 8, 300000),
(17, 2026, 9, 300000), (17, 2026, 10, 300000);

-- No 18: Maria Renjaan (Jan=500k, Feb-Okt=300k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(18, 2026, 1, 500000), (18, 2026, 2, 300000), (18, 2026, 3, 300000), (18, 2026, 4, 300000),
(18, 2026, 5, 300000), (18, 2026, 6, 300000), (18, 2026, 7, 300000), (18, 2026, 8, 300000),
(18, 2026, 9, 300000), (18, 2026, 10, 300000);

-- No 19: Ibu Tin Ubyaan (Jan-Okt=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(19, 2026, 1, 100000), (19, 2026, 2, 100000), (19, 2026, 3, 100000), (19, 2026, 4, 100000),
(19, 2026, 5, 100000), (19, 2026, 6, 100000), (19, 2026, 7, 100000), (19, 2026, 8, 100000),
(19, 2026, 9, 100000), (19, 2026, 10, 100000);

-- No 20: Bp. Yopi Ubyaan (Jan=500k, Feb-Agu=250k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(20, 2026, 1, 500000), (20, 2026, 2, 250000), (20, 2026, 3, 250000), (20, 2026, 4, 250000),
(20, 2026, 5, 250000), (20, 2026, 6, 250000), (20, 2026, 7, 250000), (20, 2026, 8, 250000);

-- No 21: Ibu Adol Ubyaan (Jan=500k, Feb-Agu=250k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(21, 2026, 1, 500000), (21, 2026, 2, 250000), (21, 2026, 3, 250000), (21, 2026, 4, 250000),
(21, 2026, 5, 250000), (21, 2026, 6, 250000), (21, 2026, 7, 250000), (21, 2026, 8, 250000);

-- No 22: Kel. Bpk. Jan Renjaan (Jan=100k, Feb=200k, Mar=200k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(22, 2026, 1, 100000), (22, 2026, 2, 200000), (22, 2026, 3, 200000);

-- No 23: Bpk. Eli Renjaan (Jan-Nov=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(23, 2026, 1, 100000), (23, 2026, 2, 100000), (23, 2026, 3, 100000), (23, 2026, 4, 100000),
(23, 2026, 5, 100000), (23, 2026, 6, 100000), (23, 2026, 7, 100000), (23, 2026, 8, 100000),
(23, 2026, 9, 100000), (23, 2026, 10, 100000), (23, 2026, 11, 100000);

-- No 24: Ibu Ema Renjaan (Jan-Mei=100k)
INSERT INTO contributions (member_id, tahun, bulan, jumlah) VALUES
(24, 2026, 1, 100000), (24, 2026, 2, 100000), (24, 2026, 3, 100000), (24, 2026, 4, 100000), (24, 2026, 5, 100000);

-- C. Insert Saldo Awal dan Pengeluaran 2026
INSERT INTO expenses (tahun, tanggal, jenis, jumlah, keterangan) VALUES
(2026, '2026-01-01', 'saldo_awal', 29050000, 'Saldo Awal / Akumulasi Sebelumnya'),
(2026, '2026-03-01', 'pengeluaran', 4000000, 'beli molen gereja');
