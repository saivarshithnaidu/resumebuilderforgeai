export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { authenticateCompanyRequest } from '@/lib/company-api/auth';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/v1/company/invoices
 * Secure endpoint for company accounting/finance teams to retrieve invoice data.
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
        const status = searchParams.get('status');
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const admin = createAdminClient();
        let query = admin
            .from('invoices')
            .select(`
                id,
                invoice_number,
                user_id,
                plan,
                amount,
                currency,
                payment_method,
                coupon_code,
                razorpay_payment_id,
                razorpay_order_id,
                billing_name,
                billing_email,
                billing_phone,
                billing_city,
                billing_state,
                billing_country,
                status,
                invoice_url,
                created_at,
                users:user_id ( email, full_name )
            `, { count: 'exact' });

        if (status) {
            query = query.eq('status', status);
        }

        const { data: invoices, count, error } = await query
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Clean & format output
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedInvoices = (invoices || []).map((inv: any) => {
            const userObj = Array.isArray(inv.users) ? inv.users[0] : inv.users;
            const numericAmount = Number(inv.amount) || 0;
            return {
                id: inv.id,
                invoice_number: inv.invoice_number,
                plan_purchased: inv.plan,
                plan: inv.plan,
                amount: numericAmount,
                total_amount: numericAmount,
                total: numericAmount,
                currency: inv.currency || 'INR',
                status: inv.status || 'paid',
                payment_method: inv.payment_method || 'Razorpay',
                transaction_id: inv.razorpay_payment_id || null,
                payment_id: inv.razorpay_payment_id || null,
                order_id: inv.razorpay_order_id || null,
                customer: {
                    email: userObj?.email || inv.billing_email || null,
                    name: userObj?.full_name || inv.billing_name || null,
                    phone: inv.billing_phone || null,
                    city: inv.billing_city || null,
                    state: inv.billing_state || null,
                    country: inv.billing_country || 'IN',
                },
                customer_email: userObj?.email || inv.billing_email || null,
                customer_name: userObj?.full_name || inv.billing_name || null,
                coupon_applied: inv.coupon_code || null,
                receipt_url: inv.invoice_url || null,
                invoice_url: inv.invoice_url || null,
                created_at: inv.created_at,
            };
        });

        const totalAmountSum = formattedInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.amount) || 0), 0);

        return NextResponse.json({
            success: true,
            total_count: count || 0,
            count: count || 0,
            total_amount: totalAmountSum,
            total_revenue: totalAmountSum,
            page,
            limit,
            total_pages: count ? Math.ceil(count / limit) : 0,
            invoices: formattedInvoices,
            data: formattedInvoices,
        });

    } catch (err: any) {
        console.error('[Company API /invoices] Error:', err);
        return NextResponse.json({ error: 'Failed to retrieve invoices', detail: err.message }, { status: 500 });
    }
}
