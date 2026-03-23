import 'dotenv/config'
import { Pool } from 'pg'

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
console.log('Connecting to:', url?.replace(/:[^@]+@/, ':***@'))

const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } })

pool.query('SELECT 1 as ok')
  .then(r => console.log('Connected!', r.rows))
  .catch(e => console.error('Error:', e.message))
  .finally(() => pool.end())
