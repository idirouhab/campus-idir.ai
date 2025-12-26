import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

// Create a singleton postgres connection
let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  // Check for DATABASE_URL at runtime, not at module initialization
  // This allows the build to complete even without environment variables
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  if (!sql) {
    sql = postgres(connectionString, {
      max: 10, // Maximum number of connections
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sql;
}
