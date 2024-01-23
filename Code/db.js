const Pool = require('pg').Pool;
const pool = new Pool({
  user: 'tesszitouni',
  host: 'localhost',
  database: 'estoredb',
  password: '',
  port: 5432,
});
module.exports = pool;
