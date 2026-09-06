import { createAdminClient } from '@/lib/supabase/admin';

export interface CompanyAuthResult {
    authenticated: boolean;
    keyId?: string;
    keyName?: string;
    error?: string;
    status: number;
}

/**
 * Validates incoming Company API requests.
 * Accepts API key via:
 * 1. Authorization: Bearer <api_key>
 * 2. x-api-key: <api_key>
 * 3. x-company-key: <api_key>
 */
export async function authenticateCompanyRequest(req: Request): Promise<CompanyAuthResult> {
    const authHeader = req.headers.get('authorization');
    const xApiKey = req.headers.get('x-api-key');
    const xCompanyKey = req.headers.get('x-company-key');

    let providedKey = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
        providedKey = authHeader.slice(7).trim();
    } else if (xApiKey) {
        providedKey = xApiKey.trim();
    } else if (xCompanyKey) {
        providedKey = xCompanyKey.trim();
    }

    if (!providedKey) {
        return {
            authenticated: false,
            error: 'Missing API key. Provide your key via "Authorization: Bearer <key>" header.',
            status: 401,
        };
    }

    // Check environment-level master secret if set
    const envSecret = process.env.COMPANY_API_SECRET;
    if (envSecret && providedKey === envSecret) {
        return {
            authenticated: true,
            keyName: 'Master Environment Key',
            status: 200,
        };
    }

    // Check database-stored company API keys
    try {
        const admin = createAdminClient();
        const { data: keyRecord, error } = await admin
            .from('api_keys')
            .select('id, name, status, usage_count')
            .eq('api_key', providedKey)
            .single();

        if (error || !keyRecord) {
            return {
                authenticated: false,
                error: 'Invalid API key. Access denied.',
                status: 401,
            };
        }

        if (keyRecord.status === 'revoked') {
            return {
                authenticated: false,
                error: 'This API key has been revoked by the administrator.',
                status: 403,
            };
        }

        // Update usage count and timestamp asynchronously
        void admin
            .from('api_keys')
            .update({
                usage_count: (keyRecord.usage_count || 0) + 1,
                last_used_at: new Date().toISOString(),
            })
            .eq('id', keyRecord.id);

        return {
            authenticated: true,
            keyId: keyRecord.id,
            keyName: keyRecord.name || 'Company Integration',
            status: 200,
        };
    } catch (err) {
        console.error('[Company API Auth] Error verifying key:', err);
        return {
            authenticated: false,
            error: 'Internal authorization error.',
            status: 500,
        };
    }
}
