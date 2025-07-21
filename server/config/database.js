import pg from 'pg';
const { Pool } = pg;

let pool;

// Check if database configuration is provided
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
};

// Only create pool if all required DB config is provided
if (dbConfig.user && dbConfig.host && dbConfig.database && dbConfig.password) {
  pool = new Pool(dbConfig);
  
  // Test the connection
  pool.connect((err, client, release) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      console.log('💡 Please ensure PostgreSQL is running and credentials are correct');
      pool = null;
    } else {
      console.log('✅ Database connected successfully');
      release();
    }
  });
} else {
  console.log('⚠️  Database configuration not found. Running in demo mode.');
  console.log('💡 Create a .env file with database credentials to enable full functionality');
  pool = null;
}

export default pool;