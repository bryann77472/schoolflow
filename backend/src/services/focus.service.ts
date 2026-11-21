import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import type { CreateFocusBody, FocusQuery } from '../schemas/focus.schema';
import type { AuthenticatedUser } from '../types/fastify';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shiftDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function serialize(record: { date: Date; minutes: number; sessions: number }) {
  return {
    date: record.date.toISOString().slice(0, 10),
    minutes: record.minutes,
    sessions: record.sessions
  };
}

export async function listFocus(viewer: AuthenticatedUser, query: FocusQuery) {
  const where: Prisma.FocusRecordWhereInput = { userId: viewer.id };
  if (query.from || query.to) {
    where.date = {
      ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
      ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {})
    };
  }

  const records = await prisma.focusRecord.findMany({
    where,
    orderBy: { date: 'asc' }
  });
  const byDate = new Map(records.map((record) => [record.date.toISOString().slice(0, 10), record]));

  // Sequência de dias consecutivos (equivalente a getFocusStreak do frontend).
  let streak = 0;
  const today = new Date();
  let cursor = byDate.has(isoDate(today)) ? today : shiftDays(today, -1);
  while (true) {
    const key = isoDate(cursor);
    const record = byDate.get(key);
    if (!record || record.minutes <= 0) break;
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }

  // Semana atual (segunda a domingo), equivalente a getWeekFocus.
  const day = today.getDay();
  const startOfWeek = shiftDays(today, day === 0 ? -6 : 1 - day);
  startOfWeek.setHours(0, 0, 0, 0);
  const week = Array.from({ length: 7 }, (_, index) => {
    const key = isoDate(shiftDays(startOfWeek, index));
    return { date: key, minutes: byDate.get(key)?.minutes ?? 0 };
  });

  return { records: records.map(serialize), streak, week };
}

export async function registerFocus(body: CreateFocusBody, viewer: AuthenticatedUser) {
  const date = body.date ?? isoDate(new Date());
  const dateValue = new Date(`${date}T00:00:00.000Z`);

  const record = await prisma.focusRecord.upsert({
    where: { userId_date: { userId: viewer.id, date: dateValue } },
    create: {
      userId: viewer.id,
      date: dateValue,
      minutes: body.minutes,
      sessions: body.sessions
    },
    update: {
      minutes: { increment: body.minutes },
      sessions: { increment: body.sessions }
    }
  });

  return serialize(record);
}
