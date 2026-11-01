import { neon } from '@neondatabase/serverless';

const getDB = () => {
  const sql = neon(process.env.DATABASE_URL);
  return sql;
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

async function getSummary(sql, tahun) {
  const [sumContributions, sumSaldoAwal, sumPengeluaran] = await Promise.all([
    sql`SELECT COALESCE(SUM(jumlah), 0) as total FROM contributions WHERE tahun = ${tahun}`,
    sql`SELECT COALESCE(SUM(jumlah), 0) as total FROM expenses WHERE tahun = ${tahun} AND jenis = 'saldo_awal'`,
    sql`SELECT COALESCE(SUM(jumlah), 0) as total FROM expenses WHERE tahun = ${tahun} AND jenis = 'pengeluaran'`,
  ]);

  const total_sumbangan = Number(sumContributions[0]?.total || 0);
  const total_saldo_awal = Number(sumSaldoAwal[0]?.total || 0);
  const total_pengeluaran = Number(sumPengeluaran[0]?.total || 0);
  const total_pemasukan = total_saldo_awal + total_sumbangan;
  const sisa_saldo = total_pemasukan - total_pengeluaran;

  return {
    total_saldo_awal,
    total_sumbangan,
    total_pemasukan,
    total_pengeluaran,
    sisa_saldo,
  };
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const sql = getDB();

  try {
    const params = event.queryStringParameters || {};
    const path = event.path || '';

    // ========================================================
    // GET: Ambil seluruh data tahun tertentu
    // ========================================================
    if (event.httpMethod === 'GET') {
      const tahun = Number(params.tahun) || 2026;

      const [members, contributions, expenses, summary] = await Promise.all([
        sql`SELECT id, no_urut, nama FROM members ORDER BY no_urut ASC, id ASC`,
        sql`SELECT id, member_id, tahun, bulan, jumlah FROM contributions WHERE tahun = ${tahun} ORDER BY member_id ASC, bulan ASC`,
        sql`SELECT id, tahun, tanggal, jenis, jumlah, keterangan, created_at FROM expenses WHERE tahun = ${tahun} ORDER BY tanggal ASC, id ASC`,
        getSummary(sql, tahun),
      ]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          tahun,
          members,
          contributions,
          expenses,
          summary,
        }),
      };
    }

    // ========================================================
    // POST: Simpan sumbangan, pengeluaran, saldo awal, anggota
    // ========================================================
    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const action = body.action || '';
      const tahun = Number(body.tahun) || 2026;

      // 1. Simpan / Hapus Sumbangan Bulanan
      if (action === 'save_contribution' || path.endsWith('/contribution')) {
        const { member_id, bulan, jumlah } = body;
        if (!member_id || !bulan) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'member_id dan bulan wajib diisi.' }),
          };
        }

        const nominal = Number(jumlah) || 0;

        if (nominal <= 0) {
          // Hapus jika 0
          await sql`
            DELETE FROM contributions
            WHERE member_id = ${Number(member_id)}
              AND tahun = ${tahun}
              AND bulan = ${Number(bulan)}
          `;
        } else {
          // Upsert
          await sql`
            INSERT INTO contributions (member_id, tahun, bulan, jumlah)
            VALUES (${Number(member_id)}, ${tahun}, ${Number(bulan)}, ${nominal})
            ON CONFLICT (member_id, tahun, bulan)
            DO UPDATE SET jumlah = EXCLUDED.jumlah
          `;
        }

        const summary = await getSummary(sql, tahun);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: nominal <= 0 ? 'Data sumbangan berhasil dihapus.' : 'Data sumbangan berhasil disimpan.',
            summary,
          }),
        };
      }

      // 2. Simpan / Edit Pengeluaran
      if (action === 'save_expense' || path.endsWith('/expense')) {
        const { id, tanggal, jenis = 'pengeluaran', jumlah, keterangan } = body;

        if (!tanggal || !jumlah || !keterangan) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Tanggal, nominal, dan keterangan wajib diisi.' }),
          };
        }

        const nominal = Number(jumlah);
        if (nominal <= 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Nominal harus lebih besar dari 0.' }),
          };
        }

        if (id) {
          await sql`
            UPDATE expenses
            SET tanggal = ${tanggal}, jenis = ${jenis}, jumlah = ${nominal}, keterangan = ${keterangan}, tahun = ${tahun}
            WHERE id = ${Number(id)}
          `;
        } else {
          await sql`
            INSERT INTO expenses (tahun, tanggal, jenis, jumlah, keterangan)
            VALUES (${tahun}, ${tanggal}, ${jenis}, ${nominal}, ${keterangan})
          `;
        }

        const summary = await getSummary(sql, tahun);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Data pengeluaran berhasil disimpan.',
            summary,
          }),
        };
      }

      // 3. Hapus Pengeluaran
      if (action === 'delete_expense') {
        const { id } = body;
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID pengeluaran diperlukan.' }),
          };
        }

        await sql`DELETE FROM expenses WHERE id = ${Number(id)}`;
        const summary = await getSummary(sql, tahun);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Pengeluaran berhasil dihapus.',
            summary,
          }),
        };
      }

      // 4. Update / Simpan Saldo Awal Tahun
      if (action === 'save_saldo_awal' || path.endsWith('/saldo-awal')) {
        const { jumlah, keterangan = 'Saldo Awal / Akumulasi Sebelumnya' } = body;
        const nominal = Number(jumlah) || 0;

        const existing = await sql`
          SELECT id FROM expenses
          WHERE tahun = ${tahun} AND jenis = 'saldo_awal'
          LIMIT 1
        `;

        if (existing.length > 0) {
          await sql`
            UPDATE expenses
            SET jumlah = ${nominal}, keterangan = ${keterangan}
            WHERE id = ${existing[0].id}
          `;
        } else {
          await sql`
            INSERT INTO expenses (tahun, tanggal, jenis, jumlah, keterangan)
            VALUES (${tahun}, ${`${tahun}-01-01`}, 'saldo_awal', ${nominal}, ${keterangan})
          `;
        }

        const summary = await getSummary(sql, tahun);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Saldo awal berhasil diperbarui.',
            summary,
          }),
        };
      }

      // 5. Tambah / Edit Anggota
      if (action === 'save_member' || path.endsWith('/member')) {
        const { id, no_urut, nama } = body;
        if (!nama || !nama.trim()) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Nama anggota wajib diisi.' }),
          };
        }

        if (id) {
          await sql`
            UPDATE members
            SET nama = ${nama.trim()}, no_urut = ${Number(no_urut) || 1}
            WHERE id = ${Number(id)}
          `;
        } else {
          let urut = Number(no_urut);
          if (!urut) {
            const max = await sql`SELECT COALESCE(MAX(no_urut), 0) + 1 AS next_no FROM members`;
            urut = Number(max[0]?.next_no || 1);
          }
          await sql`
            INSERT INTO members (no_urut, nama)
            VALUES (${urut}, ${nama.trim()})
          `;
        }

        const members = await sql`SELECT id, no_urut, nama FROM members ORDER BY no_urut ASC, id ASC`;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Data anggota berhasil disimpan.',
            members,
          }),
        };
      }

      // 6. Hapus Anggota
      if (action === 'delete_member') {
        const { id } = body;
        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'ID anggota diperlukan.' }),
          };
        }

        await sql`DELETE FROM members WHERE id = ${Number(id)}`;
        const members = await sql`SELECT id, no_urut, nama FROM members ORDER BY no_urut ASC, id ASC`;
        const summary = await getSummary(sql, tahun);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Anggota berhasil dihapus.',
            members,
            summary,
          }),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Action tidak dikenali.' }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method tidak didukung.' }),
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Terjadi kesalahan pada server.' }),
    };
  }
};
