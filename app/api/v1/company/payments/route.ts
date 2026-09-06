export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { authenticateCompanyRequest } from '@/lib/company-api/auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/v1/company/payments
 * Secure endpoint for company accounting/finance teams to retrieve payment transaction history.
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
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const admin = createAdminClient();
        const { data: invoices, count, error } = await admin
            .from('invoices')
            .select(`
                id,
                invoice_number,
                amount,
                currency,
                payment_method,
                razorpay_payment_id,
                razorpay_order_id,
                status,
                plan,
                created_at,
                billing_email,
                users:user_id ( email, full_name )
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payments = (invoices || []).map((inv: any) => {
            const userObj = Array.isArray(inv.users) ? inv.users[0] : inv.users;
            return {
                payment_id: inv.razorpay_payment_id || inv.id,
                order_id: inv.razorpay_order_id || null,
                invoice_number: inv.invoice_number,
                amount: inv.amount,
                currency: inv.currency || 'INR',
                status: inv.status || 'captured',
                payment_gateway: inv.payment_method || 'Razorpay',
                plan: inv.plan,
                customer_email: userObj?.email || inv.billing_email || null,
                customer_name: userObj?.full_name || null,
                paid_at: inv.created_at,
            };
        });

        return NextResponse.json({
            success: true,
            total_count: count || 0,
            page,
            limit,
            total_pages: count ? Math.ceil(count / limit) : 0,
            payments,
        });

    } catch (err: any) {
        console.error('[Company API /payments] Error:', err);
        return NextResponse.json({ error: 'Failed to retrieve payments', detail: err.message }, { status: 500 });
    }
}
