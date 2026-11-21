/** Erro HTTP de domínio, traduzido pelo plugin de tratamento de erros. */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message = 'Requisição inválida.', details?: unknown) =>
  new HttpError(400, 'bad_request', message, details);

export const unauthorized = (message = 'Autenticação necessária.') =>
  new HttpError(401, 'unauthorized', message);

export const forbidden = (message = 'Você não tem permissão para esta ação.') =>
  new HttpError(403, 'forbidden', message);

export const notFound = (message = 'Recurso não encontrado.') =>
  new HttpError(404, 'not_found', message);

export const conflict = (message = 'Já existe um registro com estes dados.') =>
  new HttpError(409, 'conflict', message);
