import { checkDatabaseConnection } from '../config/database';

/** Executa uma consulta real (SELECT 1) para validar a conexão com o PostgreSQL. */
export async function checkDatabase(): Promise<void> {
  await checkDatabaseConnection();
}
