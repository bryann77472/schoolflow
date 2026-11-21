import { type Stage, type User } from '@prisma/client';
import { compare, hash, hashSync } from 'bcryptjs';
import { prisma } from '../config/database';
import type { LoginBody, RegisterBody } from '../schemas/auth.schema';
import { badRequest, conflict, notFound, unauthorized } from '../utils/http-error';

const SALT_ROUNDS = 12;

/** Usado para manter o tempo de resposta parecido quando o email não existe. */
const DUMMY_HASH = hashSync('schoolflow-dummy-password', SALT_ROUNDS);

const GRADES: Record<Stage, string[]> = {
  fundamental: ['6º ano', '7º ano', '8º ano', '9º ano'],
  medio: ['1º ano', '2º ano', '3º ano']
};

const STAGE_LABEL: Record<Stage, string> = {
  fundamental: 'Fundamental II',
  medio: 'Ensino Médio'
};

export type SafeUser = Omit<User, 'passwordHash'>;

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

/** Cadastro de aluno: cria a conta e matricula nas turmas da etapa escolhida. */
export async function register(body: RegisterBody): Promise<SafeUser> {
  if (!GRADES[body.stage].includes(body.grade)) {
    throw badRequest(`Ano/série inválido para ${STAGE_LABEL[body.stage]}.`);
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw conflict('Já existe uma conta com este email.');

  const passwordHash = await hash(body.password, SALT_ROUNDS);
  const classes = await prisma.class.findMany({
    where: { stage: body.stage },
    select: { id: true }
  });

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash,
      role: 'aluno',
      stage: body.stage,
      grade: body.grade,
      subject: `${body.grade} · ${STAGE_LABEL[body.stage]}`,
      avatarTone: body.avatarTone ?? 'indigo',
      enrollments: {
        create: classes.map((schoolClass) => ({ classId: schoolClass.id }))
      }
    }
  });

  return toSafeUser(user);
}

export async function login(body: LoginBody): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const passwordMatches = await compare(body.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordMatches) {
    throw unauthorized('Email ou senha incorretos.');
  }

  return toSafeUser(user);
}

export async function findUserById(id: number): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw notFound('Usuário não encontrado.');
  return toSafeUser(user);
}
