'use client';

import React, { useState, useEffect } from 'react';
import { 
    Key, 
    ShieldCheck, 
    Copy, 
    Check, 
    Trash2, 
    Plus, 
    RefreshCw, 
    Terminal, 
    Receipt, 
    Users, 
    CreditCard, 
    AlertTriangle,
    Lock
} from 'lucide-react';

interface CompanyKey {
    id: string;
    name: string;
    masked_key: string;
    status: 'active' | 'revoked';
    usage_count: number;
    last_used_at: string | null;
    created_at: string;
}

export default function CompanyAPIClient({ locale }: { locale: string }) {
    const [keys, setKeys] = useState<CompanyKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchKeys = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/company-keys');
            const data = await res.json();
            if (data.success) {
                setKeys(data.keys || []);
            } else {
                setError(data.error || 'Failed to fetch company keys');
            }
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleGenerateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        setGenerating(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/company-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_name: companyName || 'Company Integration' }),
            });
            const data = await res.json();
            if (data.success && data.apiKey) {
                setGeneratedKey(data.apiKey);
                setCompanyName('');
                fetchKeys();
            } else {
                setError(data.error || 'Failed to generate key');
            }
        } catch (err: any) {
            setError(err.message || 'Error generating key');
        } finally {
            setGenerating(false);
        }
    };

    const handleRevoke = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to revoke the key for "${name}"? Access will be shut down immediately.`)) {
            return;
        }
        try {
            const res = await fetch(`/api/admin/company-keys?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchKeys();
            } else {
                alert('Failed to revoke: ' + data.error);
            }
        } catch (err: any) {
            alert('Error revoking key: ' + err.message);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EBEBEB] pb-6">
                <div>
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#8F8F8F] mb-1">
                        <Lock className="w-3.5 h-3.5 text-[#171717]" /> Enterprise Data Sharing
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717]">
                        Company Data API
                    </h1>
                    <p className="text-[#666666] text-sm mt-1">
                        Generate and manage secure, encrypted API keys to share live users, payments, and invoices data with your company.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchKeys()}
                        className="p-2.5 rounded-xl border border-[#EBEBEB] bg-white hover:bg-[#FAFAFA] text-[#4D4D4D] transition-colors"
                        title="Refresh Keys"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => {
                            setGeneratedKey(null);
                            setShowModal(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#171717] hover:bg-[#2b2b2b] text-white font-medium text-sm transition-all shadow-sm active:scale-95"
                    >
                        <Plus className="w-4 h-4" /> Generate Company Key
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Generated Key Alert / Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-2xl max-w-lg w-full p-6 md:p-8 space-y-6">
                        {!generatedKey ? (
                            <form onSubmit={handleGenerateKey} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                        <Key className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[#171717]">Generate Company Key</h3>
                                        <p className="text-xs text-[#666666]">Only admins can issue keys for company integrations.</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-[#171717]">Company / Team Label</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Finance Team, ERP System, Headquarters"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBEBEB] text-sm text-[#171717] focus:outline-none focus:border-[#171717] transition-all"
                                        required
                                    />
                                </div>

                                <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-xl p-3 text-xs text-[#666666] leading-relaxed">
                                    <span className="font-semibold text-[#171717]">Zero-Trust Security:</span> This key grants read-only access to company invoice, payment, and user records. Keep it confidential.
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-sm text-[#666666] hover:text-[#171717] rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={generating}
                                        className="px-5 py-2 text-sm font-semibold rounded-xl bg-[#171717] text-white hover:bg-[#2e2e2e] transition-all disabled:opacity-50"
                                    >
                                        {generating ? 'Generating...' : 'Create Key'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                                    <ShieldCheck className="w-5 h-5" /> Key Successfully Created!
                                </div>

                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                                    <strong>Important:</strong> Copy this secret key now. For your security, this key will <strong>never be shown again</strong> in full.
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-mono text-[#8F8F8F] uppercase">Company Secret API Key</label>
                                    <div className="flex items-center gap-2 bg-[#FAFAFA] border border-[#EBEBEB] p-2.5 rounded-xl">
                                        <code className="text-xs font-mono text-[#171717] break-all flex-1 select-all">
                                            {generatedKey}
                                        </code>
                                        <button
                                            onClick={() => copyToClipboard(generatedKey)}
                                            className="px-3 py-1.5 bg-[#171717] hover:bg-[#2b2b2b] text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1.5 transition-all"
                                        >
                                            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            setGeneratedKey(null);
                                        }}
                                        className="w-full py-2.5 bg-[#171717] text-white text-sm font-semibold rounded-xl hover:bg-[#2b2b2b] transition-all"
                                    >
                                        Done & Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Active Keys Table */}
            <div className="bg-white border border-[#EBEBEB] rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#EBEBEB] flex items-center justify-between">
                    <h2 className="text-base font-bold text-[#171717] flex items-center gap-2">
                        <Key className="w-4 h-4 text-[#171717]" /> Active & Issued Company Keys
                    </h2>
                    <span className="text-xs text-[#8F8F8F] font-mono">
                        {keys.length} {keys.length === 1 ? 'key' : 'keys'} issued
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#FAFAFA] border-b border-[#EBEBEB] text-[#666666] text-xs font-mono uppercase">
                            <tr>
                                <th className="py-3.5 px-6">Company / Name</th>
                                <th className="py-3.5 px-6">API Key</th>
                                <th className="py-3.5 px-6">Status</th>
                                <th className="py-3.5 px-6">Requests</th>
                                <th className="py-3.5 px-6">Last Accessed</th>
                                <th className="py-3.5 px-6">Created Date</th>
                                <th className="py-3.5 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EBEBEB]">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-[#8F8F8F]">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className="w-4 h-4 animate-spin" /> Loading keys...
                                        </div>
                                    </td>
                                </tr>
                            ) : keys.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-[#8F8F8F]">
                                        No company API keys generated yet. Click <strong>"Generate Company Key"</strong> to create one for your company.
                                    </td>
                                </tr>
                            ) : (
                                keys.map((k) => (
                                    <tr key={k.id} className="hover:bg-[#FAFAFA]/70 transition-colors">
                                        <td className="py-4 px-6 font-semibold text-[#171717]">
                                            {k.name}
                                        </td>
                                        <td className="py-4 px-6 font-mono text-xs text-[#4D4D4D]">
                                            {k.masked_key}
                                        </td>
                                        <td className="py-4 px-6">
                                            {k.status === 'active' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 border border-rose-200 text-rose-700">
                                                    Revoked
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 font-mono text-xs text-[#171717]">
                                            {k.usage_count.toLocaleString()}
                                        </td>
                                        <td className="py-4 px-6 text-xs text-[#666666]">
                                            {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                                        </td>
                                        <td className="py-4 px-6 text-xs text-[#666666]">
                                            {new Date(k.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            {k.status === 'active' ? (
                                                <button
                                                    onClick={() => handleRevoke(k.id, k.name)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                                                    title="Revoke Key"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Revoke
                                                </button>
                                            ) : (
                                                <span className="text-xs text-[#8F8F8F]">Deactivated</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Company Integration Guide & API Documentation */}
            <div className="space-y-4">
                <div className="border-b border-[#EBEBEB] pb-2">
                    <h2 className="text-lg font-bold text-[#171717] flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-indigo-600" /> Company Integration Endpoints
                    </h2>
                    <p className="text-xs text-[#666666]">
                        Share these endpoints with your company's developers or finance team along with their generated API key.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Invoices Card */}
                    <div className="bg-white border border-[#EBEBEB] p-5 rounded-2xl shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                                <Receipt className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#171717]">Invoices Endpoint</h3>
                                <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-semibold">GET</span>
                            </div>
                        </div>
                        <p className="text-xs text-[#666666] leading-relaxed">
                            Returns invoice numbers, customer emails, GST/tax, amounts, and direct links to generated PDF receipts.
                        </p>
                        <code className="text-[11px] block font-mono bg-[#FAFAFA] border border-[#EBEBEB] p-2 rounded-lg text-[#171717] truncate">
                            /api/v1/company/invoices
                        </code>
                    </div>

                    {/* Payments Card */}
                    <div className="bg-white border border-[#EBEBEB] p-5 rounded-2xl shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                <CreditCard className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#171717]">Payments Endpoint</h3>
                                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">GET</span>
                            </div>
                        </div>
                        <p className="text-xs text-[#666666] leading-relaxed">
                            Returns transaction IDs, amounts, currencies, payment methods (UPI/Cards), and captured timestamps.
                        </p>
                        <code className="text-[11px] block font-mono bg-[#FAFAFA] border border-[#EBEBEB] p-2 rounded-lg text-[#171717] truncate">
                            /api/v1/company/payments
                        </code>
                    </div>

                    {/* Users Card */}
                    <div className="bg-white border border-[#EBEBEB] p-5 rounded-2xl shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                                <Users className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#171717]">Users Endpoint</h3>
                                <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-semibold">GET</span>
                            </div>
                        </div>
                        <p className="text-xs text-[#666666] leading-relaxed">
                            Returns sanitized user demographics, plan tiers (Free/Pro), signup timestamps, and credit usage statistics.
                        </p>
                        <code className="text-[11px] block font-mono bg-[#FAFAFA] border border-[#EBEBEB] p-2 rounded-lg text-[#171717] truncate">
                            /api/v1/company/users
                        </code>
                    </div>
                </div>

                {/* Example Request Card */}
                <div className="bg-[#171717] text-white p-6 rounded-2xl shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-400">
                            <Terminal className="w-4 h-4 text-emerald-400" /> Example cURL Request for Company Developers
                        </div>
                        <button
                            onClick={() => copyToClipboard(`curl https://resumeforgeai.in/api/v1/company/invoices \\\n  -H "Authorization: Bearer <YOUR_COMPANY_API_KEY>"`)}
                            className="text-xs text-neutral-300 hover:text-white flex items-center gap-1"
                        >
                            <Copy className="w-3.5 h-3.5" /> Copy cURL
                        </button>
                    </div>
                    <pre className="text-xs font-mono bg-black/40 p-4 rounded-xl text-neutral-200 overflow-x-auto">
{`curl https://resumeforgeai.in/api/v1/company/invoices \\
  -H "Authorization: Bearer rf_comp_live_YOUR_KEY"`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
