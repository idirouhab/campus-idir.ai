import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/session';
import type { AppRole } from '@/lib/roles/app-role';

function deriveInstructorRole(roles: AppRole[]): 'admin' | 'instructor' | null {
  if (roles.includes('super_admin') || roles.includes('billing_admin')) return 'admin';
  if (roles.includes('instructor')) return 'instructor';
  return null;
}

export async function GET() {
  try {
    await requireSuperAdmin();
    const sql = getDb();

    const rows = await sql`
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(ur.role), NULL),
          ARRAY[]::app_role[]
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `;

    return NextResponse.json({ users: rows });
  } catch (error: any) {
    console.error('[Admin Users] GET error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const { email, firstName, lastName, password, roles } = body as {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
      roles: AppRole[];
    };

    if (!email || !firstName || !lastName || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const sql = getDb();
    const passwordHash = await bcrypt.hash(password, 12);

    const instructorRole = deriveInstructorRole(roles || []);

    const users = await sql`
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        is_active,
        email_verified,
        role
      ) VALUES (
        ${normalizedEmail},
        ${passwordHash},
        ${firstName},
        ${lastName},
        true,
        true,
        ${instructorRole}
      )
      RETURNING id, email, first_name, last_name, is_active, created_at, updated_at
    `;

    const user = users[0];

    if (Array.isArray(roles) && roles.length > 0) {
      const values = roles.map((role) => ({ user_id: user.id, role }));
      await sql`
        INSERT INTO user_roles ${sql(values, 'user_id', 'role')}
        ON CONFLICT (user_id, role) DO NOTHING
      `;
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('[Admin Users] POST error:', error);
    const message = error?.code === '23505' ? 'Email already exists' : 'Failed to create user';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireSuperAdmin();
    const body = await request.json();
    const { id, email, firstName, lastName, isActive, roles } = body as {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
      roles: AppRole[];
    };

    if (!id || !email || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const sql = getDb();
    const instructorRole = deriveInstructorRole(roles || []);

    const updated = await sql`
      UPDATE users
      SET email = ${normalizedEmail},
          first_name = ${firstName},
          last_name = ${lastName},
          is_active = ${!!isActive},
          role = ${instructorRole},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, email, first_name, last_name, is_active, updated_at
    `;

    await sql`DELETE FROM user_roles WHERE user_id = ${id}`;

    if (Array.isArray(roles) && roles.length > 0) {
      const values = roles.map((role) => ({ user_id: id, role }));
      await sql`
        INSERT INTO user_roles ${sql(values, 'user_id', 'role')}
        ON CONFLICT (user_id, role) DO NOTHING
      `;
    }

    return NextResponse.json({ user: updated[0] });
  } catch (error: any) {
    console.error('[Admin Users] PUT error:', error);
    const message = error?.code === '23505' ? 'Email already exists' : 'Failed to update user';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
