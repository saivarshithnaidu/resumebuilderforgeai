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
        const planParam = searchParams.get('plan') || searchParams.get('tier');
        const searchTerm = searchParams.get('search') || searchParams.get('q');
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
                college,
                experience_level,
                target_role,
                daily_credits_used
            `, { count: 'exact' });

        if (planParam && planParam.toLowerCase() !== 'all' && planParam.toLowerCase() !== 'all plans') {
            query = query.ilike('plan_type', planParam.toLowerCase());
        }

        if (searchTerm) {
            query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
        }

        const { data: users, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sanitizedUsers = (users || []).map((u: any) => {
            const rawPlan = (u.plan_type || 'free').toUpperCase();
            return {
                id: u.id,
                email: u.email,
                full_name: u.full_name || null,
                name: u.full_name || u.email?.split('@')[0] || 'Member',
                role: u.role || 'user',
                subscription_plan: rawPlan,
                plan_type: rawPlan,
                plan: rawPlan,
                is_pro: ['PRO', 'MONTHLY', 'PROFESSIONAL', 'WEEKLY'].includes(rawPlan),
                plan_expiry: u.plan_end || null,
                college: u.college || null,
                experience_level: u.experience_level || null,
                target_role: u.target_role || null,
                credits_used_today: u.daily_credits_used || 0,
                created_at: u.created_at,
                registered_at: u.created_at,
            };
        });

        return NextResponse.json({
            success: true,
            total_count: count || 0,
            count: count || 0,
            total: count || 0,
            page,
            limit,
            total_pages: count ? Math.ceil(count / limit) : 0,
            users: sanitizedUsers,
            data: sanitizedUsers,
        });

    } catch (err: any) {
        console.error('[Company API /users] Error:', err);
        return NextResponse.json({ error: 'Failed to retrieve users', detail: err.message }, { status: 500 });
    }
}
