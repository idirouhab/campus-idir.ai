import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/session';

export async function DELETE(request: Request) {
  try {
    const session = await requireSuperAdmin();
    const pathname = new URL(request.url).pathname;
    const segments = pathname.split('/').filter(Boolean);
    const userId = segments[segments.length - 1];

    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    if (session.id === userId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const sql = getDb();

    await sql`DELETE FROM user_roles WHERE user_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Admin Users] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 400 });
  }
}
