import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Helper to check admin
async function requireAdmin(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return null;
  }
  return session;
}

// GET: List all FAQ entries (ordered)
export async function GET(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const faqs = await prisma.fAQ.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json(faqs);
}

// POST: Create new FAQ entry
export async function POST(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const { question, answer } = await request.json();
  if (!question || !answer) {
    return NextResponse.json({ error: 'Question and answer required' }, { status: 400 });
  }
  // Find max sortOrder
  const maxOrder = await prisma.fAQ.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;
  const faq = await prisma.fAQ.create({ data: { question, answer, sortOrder } });
  return NextResponse.json(faq);
}

// PUT: Update FAQ entry
export async function PUT(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const { id, question, answer } = await request.json();
  if (!id || !question || !answer) {
    return NextResponse.json({ error: 'ID, question, and answer required' }, { status: 400 });
  }
  const faq = await prisma.fAQ.update({ where: { id }, data: { question, answer } });
  return NextResponse.json(faq);
}

// DELETE: Delete FAQ entry
export async function DELETE(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }
  await prisma.fAQ.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// PATCH: Reorder FAQ entries
export async function PATCH(request: NextRequest) {
  const session = await requireAdmin(request);
  if (!session) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  const { order } = await request.json(); // order: [{id, sortOrder}, ...]
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: 'Order array required' }, { status: 400 });
  }
  for (const { id, sortOrder } of order) {
    await prisma.fAQ.update({ where: { id }, data: { sortOrder } });
  }
  return NextResponse.json({ success: true });
} 