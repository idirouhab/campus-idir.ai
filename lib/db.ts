import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a singleton postgres connection
let sql: ReturnType<typeof postgres>;

export function getDb() {
  if (!sql) {
    // connectionString is guaranteed to be defined due to the check above
    sql = postgres(connectionString!, {
      max: 10, // Maximum number of connections
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}
