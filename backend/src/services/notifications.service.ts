import { prisma } from '../config/database';
import type { MarkNotificationsReadBody } from '../schemas/notifications.schema';
import type { AuthenticatedUser } from '../types/fastify';
import {
  assignmentScopeWhere,
  classScopeWhere,
  eventScopeWhere
} from './scope.service';

interface NotificationItem {
  id: string;
  icon: string;
  tone: string;
  title: string;
  text: string;
  time: string;
  href: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysUntil(dateStr: string): number {
  const due = parseISODate(dateStr);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function dueMeta(dateStr: string, status: string) {
  if (status === 'done') return { label: 'Concluído', tone: 'success' };
  const diff = daysUntil(dateStr);
  if (diff < 0) return { label: `${Math.abs(diff)}d atrasado`, tone: 'danger' };
  if (diff === 0) return { label: 'Entrega hoje', tone: 'warning' };
  if (diff === 1) return { label: 'Amanhã', tone: 'warning' };
  if (diff <= 3) return { label: `Em ${diff} dias`, tone: 'warning' };
  if (diff <= 7) return { label: `Em ${diff} dias`, tone: 'info' };
  return { label: dateStr, tone: 'neutral' };
}

async function deriveNotifications(viewer: AuthenticatedUser): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];

  const assignments = await prisma.assignment.findMany({
    where: { AND: [assignmentScopeWhere(viewer), { status: { not: 'done' } }] },
    select: { id: true, title: true, dueDate: true, status: true, class: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
    take: 3
  });
  assignments.forEach((assignment) => {
    const dueDate = assignment.dueDate.toISOString().slice(0, 10);
    const meta = dueMeta(dueDate, assignment.status);
    if (meta.tone !== 'danger' && meta.tone !== 'warning') return;
    items.push({
      id: `due-${assignment.id}-${dueDate}`,
      icon: meta.tone === 'danger' ? 'alert-circle' : 'clock',
      tone: meta.tone,
      title: meta.tone === 'danger' ? 'Entrega atrasada' : 'Prazo se aproximando',
      text: `${assignment.title} — ${meta.label.toLowerCase()}`,
      time: assignment.class.name,
      href: 'assignments.html'
    });
  });

  const todayClasses = await prisma.class.findMany({
    where: { AND: [classScopeWhere(viewer), { dayOfWeek: new Date().getDay() }] },
    select: { timeStart: true },
    orderBy: { timeStart: 'asc' }
  });
  if (todayClasses.length) {
    items.push({
      id: `today-classes-${todayISO()}`,
      icon: 'book-open',
      tone: 'info',
      title: 'Sua rotina de hoje',
      text: `${todayClasses.length} ${todayClasses.length === 1 ? 'aula no cronograma' : 'aulas no cronograma'}. A primeira começa às ${todayClasses[0].timeStart}.`,
      time: 'Hoje',
      href: 'dashboard.html'
    });
  }

  const today = new Date(`${todayISO()}T00:00:00.000Z`);
  const events = await prisma.event.findMany({
    where: { AND: [eventScopeWhere(viewer), { date: { gte: today } }] },
    select: { id: true, title: true, date: true, location: true },
    orderBy: [{ date: 'asc' }, { timeStart: 'asc' }],
    take: 4
  });
  events.forEach((event) => {
    const date = event.date.toISOString().slice(0, 10);
    const diff = daysUntil(date);
    if (diff > 7) return;
    items.push({
      id: `event-${event.id}-${date}`,
      icon: 'calendar-days',
      tone: diff <= 2 ? 'warning' : 'success',
      title: diff === 0 ? 'Evento hoje' : 'Evento próximo',
      text: `${event.title} — ${diff === 0 ? 'hoje' : `em ${diff} ${diff === 1 ? 'dia' : 'dias'}`}`,
      time: event.location || 'Escola',
      href: 'events.html'
    });
  });

  if (!items.length) {
    items.push({
      id: 'all-clear',
      icon: 'check-circle',
      tone: 'success',
      title: 'Tudo em dia',
      text: 'Nenhum prazo ou evento urgente por aqui. Aproveite para adiantar seus estudos.',
      time: 'Agora',
      href: 'dashboard.html'
    });
  }

  return items;
}

export async function getNotifications(viewer: AuthenticatedUser) {
  const [items, reads] = await Promise.all([
    deriveNotifications(viewer),
    prisma.notificationRead.findMany({
      where: { userId: viewer.id },
      select: { key: true }
    })
  ]);
  const readKeys = new Set(reads.map((read) => read.key));
  const enriched = items.map((item) => ({ ...item, read: readKeys.has(item.id) }));
  return { items: enriched, unread: enriched.filter((item) => !item.read).length };
}

export async function markNotificationsRead(
  viewer: AuthenticatedUser,
  body: MarkNotificationsReadBody
) {
  const known = new Set((await deriveNotifications(viewer)).map((item) => item.id));
  const keys = [...new Set(body.keys)].filter((key) => known.has(key));
  if (!keys.length) return { marked: 0 };

  const result = await prisma.notificationRead.createMany({
    data: keys.map((key) => ({ userId: viewer.id, key })),
    skipDuplicates: true
  });
  return { marked: result.count };
}
