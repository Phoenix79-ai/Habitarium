// src/config/db.ts
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Keep this log for debugging if needed
console.log('[db.ts] TOP LEVEL EXECUTION REACHED!');

// Ensure environment variables are loaded *before* reading them
// (Though server.ts also calls this, redundancy here is safe)
dotenv.config();

// Log the database URL being used (censoring password part for security)
// Note: Ensure process.env.DATABASE_URL is correctly set in your backend/.env file!
console.log(`[db.ts] Attempting to connect to DB using process.env.DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:([^:]+)@/, ':****@')}`);

// Create a new connection pool using the DATABASE_URL from the .env file
const pool = new Pool({
  // Read connection string from environment variables
  connectionString: process.env.DATABASE_URL,

  // Optional: Add SSL configuration if required by your database provider
  // ssl: {
  //   rejectUnauthorized: false // Use this setting with caution if needed for some cloud providers
  // }
});

// Test the connection when the module loads (optional but good practice)
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database Connection Failed:', err.stack);
    // Depending on your app's needs, you might want to exit if the DB is critical
    // process.exit(1);
    return; // Exit the callback on error
  }
  if (client) {
     console.log('✅ Database Pool Connected Successfully via pool.connect() test');
     // Perform a simple query to ensure commands work (optional)
     client.query('SELECT NOW()', (err, result) => {
       // IMPORTANT: Release the client back to the pool when done/on error
       release();
       if (err) {
         return console.error('Error executing initial test query', err.stack);
       }
       console.log('   DB Initial Query Test Successful:', result.rows[0]);
     });
  }
});

// Listen for errors on idle clients in the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle database client', err);
  // Consider more robust error handling or process exit if pool errors are critical
  // process.exit(-1);
});

// Export the configured pool so other parts of the application can use it
export default pool;