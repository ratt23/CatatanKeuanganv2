import { neon } from '@neondatabase/serverless';

const getDB = () => {
  const sql = neon(process.env.DATABASE_URL);
  return sql;
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const sql = getDB();

  try {
    // ========== GET: Ambil semua transaksi ==========
    if (event.httpMethod === 'GET') {
      const rows = await sql`
        SELECT id, tanggal, jenis, jumlah, keterangan, created_at
        FROM transactions_v2
        ORDER BY tanggal ASC, id ASC
      `;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(rows),
      };
    }

    // ========== POST: Simpan transaksi baru ==========
    if (event.httpMethod === 'POST') {
      const { tanggal, jenis, jumlah, keterangan } = JSON.parse(event.body);

      // Validasi input
      if (!tanggal || !jenis || !jumlah || !keterangan) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Semua field wajib diisi.' }),
        };
      }

      if (!['saldo_awal', 'pemasukan', 'pengeluaran'].includes(jenis)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Jenis transaksi tidak valid.' }),
        };
      }

      if (Number(jumlah) <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Jumlah harus lebih dari 0.' }),
        };
      }

      // Jika jenis = saldo_awal, cek apakah sudah ada di bulan yang sama
      if (jenis === 'saldo_awal') {
        const dateObj = new Date(tanggal);
        const month = dateObj.getMonth() + 1;
        const year = dateObj.getFullYear();

        const existing = await sql`
          SELECT id FROM transactions_v2
          WHERE jenis = 'saldo_awal'
            AND EXTRACT(MONTH FROM tanggal) = ${month}
            AND EXTRACT(YEAR FROM tanggal) = ${year}
          LIMIT 1
        `;

        if (existing.length > 0) {
          // Update saldo_awal yang sudah ada di bulan ini
          const updated = await sql`
            UPDATE transactions_v2
            SET jumlah = ${Number(jumlah)}, keterangan = ${keterangan}, tanggal = ${tanggal}
            WHERE id = ${existing[0].id}
            RETURNING *
          `;
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Saldo awal bulan ini berhasil diperbarui.', data: updated[0] }),
          };
        }
      }

      // Insert transaksi baru
      const result = await sql`
        INSERT INTO transactions_v2 (tanggal, jenis, jumlah, keterangan)
        VALUES (${tanggal}, ${jenis}, ${Number(jumlah)}, ${keterangan})
        RETURNING *
      `;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ message: 'Data berhasil disimpan.', data: result[0] }),
      };
    }

    // ========== DELETE: Hapus transaksi berdasarkan ID ==========
    if (event.httpMethod === 'DELETE') {
      // Ambil ID dari path atau query string
      const path = event.path || '';
      const segments = path.split('/');
      const idFromPath = segments[segments.length - 1];
      const id = event.queryStringParameters?.id || idFromPath;

      if (!id || isNaN(Number(id))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'ID transaksi tidak valid.' }),
        };
      }

      const result = await sql`
        DELETE FROM transactions_v2 WHERE id = ${Number(id)} RETURNING *
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Transaksi tidak ditemukan.' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Data berhasil dihapus.', data: result[0] }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method tidak didukung.' }),
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Terjadi kesalahan server. Silakan coba lagi.' }),
    };
  }
};
