export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { authenticateCompanyRequest } from '@/lib/company-api/auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/v1/company/users
 * Secure endpoint for company data teams to retrieve user demographics and plan counts.
 */
export async function GET(req: Request) {
    const auth = await authenticateCompanyRequest(req);
    if (!auth.authenticated) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
        const plan = searchParams.get('plan');
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const admin = createAdminClient();
        let query = admin
            .from('users')
            .select(`
                id,
                email,
                full_name,
                role,
                plan_type,
                plan_end,
                created_at,
                is_student,
                daily_credits_used
            `, { count: 'exact' });

        if (plan) {
            query = query.eq('plan_type', plan.toLowerCase());
        }

        const { data: users, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sanitizedUsers = (users || []).map((u: any) => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name || null,
            role: u.role || 'user',
            subscription_plan: (u.plan_type || 'free').toUpperCase(),
            plan_expiry: u.plan_end || null,
            is_student: Boolean(u.is_student),
            credits_used_today: u.daily_credits_used || 0,
            registered_at: u.created_at,
        }));

        return NextResponse.json({
            success: true,
            total_count: count || 0,
            page,
            limit,
            total_pages: count ? Math.ceil(count / limit) : 0,
            users: sanitizedUsers,
        });

    } catch (err: any) {
        console.error('[Company API /users] Error:', err);
        return NextResponse.json({ error: 'Failed to retrieve users', detail: err.message }, { status: 500 });
    }
}
