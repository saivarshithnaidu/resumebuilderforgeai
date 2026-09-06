# SYSTEM INTEGRATION SPECIFICATION: ResumeForge AI Company Data API

> **Notice for Integration Agent / Developer:**  
> This specification outlines the authentication, endpoints, data schemas, and synchronization logic required to ingest **Users**, **Payments**, and **Invoices** from ResumeForge AI into your company's internal data warehouse, ERP, or accounting system.

---

## 1. Quick Connection Details

| Configuration | Value |
| :--- | :--- |
| **Base URL** | `https://resumeforgeai.in` |
| **Authentication Protocol** | Bearer Token Header |
| **Required Header** | `Authorization: Bearer <COMPANY_API_KEY>` |
| **Alternative Header** | `x-api-key: <COMPANY_API_KEY>` |
| **Data Format** | JSON (`application/json`) |
| **Transport Security** | TLS 1.3 / HTTPS Only |

> **Security Note:**  
> The `<COMPANY_API_KEY>` is a 256-bit cryptographically secure secret key (`rf_comp_live_...`) issued exclusively by the ResumeForge AI administrator. Store this token securely in environment variables (`RESUMEFORGE_COMPANY_KEY`). Never expose this token in client-side code.

---

## 2. API Endpoints & Data Schemas

### A. Invoices API (`GET /api/v1/company/invoices`)
Retrieves customer invoices, billing details, GST/tax information, and direct links to generated PDF receipts.

#### Request Parameters (Query String):
- `page` *(optional, integer, default: 1)*: Page number for pagination.
- `limit` *(optional, integer, default: 50, max: 100)*: Number of records per page.
- `status` *(optional, string)*: Filter by invoice payment status (e.g. `paid`, `pending`).

#### Sample Response:
```json
{
  "success": true,
  "total_count": 142,
  "page": 1,
  "limit": 50,
  "total_pages": 3,
  "invoices": [
    {
      "id": "c71a39d8-bf88-4f2a-b73a-42b7811e5124",
      "invoice_number": "INV-2026-0042",
      "plan_purchased": "PRO",
      "amount": 999,
      "currency": "INR",
      "status": "paid",
      "payment_method": "Razorpay",
      "transaction_id": "pay_P88a7b9c1d2e",
      "order_id": "order_O99x8y7z6w5v",
      "customer": {
        "email": "candidate@example.com",
        "name": "Jane Doe",
        "phone": "+91 9876543210",
        "city": "Bengaluru",
        "state": "Karnataka",
        "country": "IN"
      },
      "coupon_applied": "LAUNCH20",
      "receipt_url": "https://resumeforgeai.in/invoices/INV-2026-0042.pdf",
      "created_at": "2026-09-01T10:15:30.000Z"
    }
  ]
}
```

---

### B. Payments API (`GET /api/v1/company/payments`)
Retrieves payment transaction history and gateway capture records.

#### Request Parameters (Query String):
- `page` *(optional, integer, default: 1)*: Page number.
- `limit` *(optional, integer, default: 50, max: 100)*: Records per page.

#### Sample Response:
```json
{
  "success": true,
  "total_count": 142,
  "page": 1,
  "limit": 50,
  "total_pages": 3,
  "payments": [
    {
      "payment_id": "pay_P88a7b9c1d2e",
      "order_id": "order_O99x8y7z6w5v",
      "invoice_number": "INV-2026-0042",
      "amount": 999,
      "currency": "INR",
      "status": "captured",
      "payment_gateway": "Razorpay",
      "plan": "PRO",
      "customer_email": "candidate@example.com",
      "customer_name": "Jane Doe",
      "paid_at": "2026-09-01T10:15:30.000Z"
    }
  ]
}
```

---

### C. Users API (`GET /api/v1/company/users`)
Retrieves sanitized user registration records, active plans, and usage metrics.  
*(Note: Passwords, password hashes, and sensitive authentication secrets are strictly excluded).*

#### Request Parameters (Query String):
- `page` *(optional, integer, default: 1)*: Page number.
- `limit` *(optional, integer, default: 50, max: 100)*: Records per page.
- `plan` *(optional, string)*: Filter by plan tier (`free`, `monthly`, `pro`).

#### Sample Response:
```json
{
  "success": true,
  "total_count": 1781,
  "page": 1,
  "limit": 50,
  "total_pages": 36,
  "users": [
    {
      "id": "521e34ca-b964-418d-b42f-58d548f67c9e",
      "email": "user@example.com",
      "full_name": "Alex Smith",
      "name": "Alex Smith",
      "role": "user",
      "subscription_plan": "PRO",
      "plan_type": "PRO",
      "is_pro": true,
      "plan_expiry": "2026-10-01T00:00:00.000Z",
      "credits_used_today": 12,
      "registered_at": "2026-08-15T08:30:00.000Z",
      "created_at": "2026-08-15T08:30:00.000Z"
    }
  ]
}
```

---

## 3. HTTP Status Codes & Error Handling

| Status Code | Meaning | Agent Action |
| :--- | :--- | :--- |
| **`200 OK`** | Success | Ingest and process payload. |
| **`400 Bad Request`** | Invalid parameters | Check query string parameters (`page`, `limit`). |
| **`401 Unauthorized`** | Missing or invalid API key | Verify that the `Authorization` header has a valid `rf_comp_live_...` key. |
| **`403 Forbidden`** | Key revoked | The administrator has deactivated this API key. Halt sync and contact the admin. |
| **`500 Internal Server Error`** | Server error | Retry with exponential backoff (e.g. 2s, 5s, 10s). |

---

## 4. Ready-to-Run Code Implementations

### Python Implementation (`sync_resumeforge.py`):
```python
import os
import requests
import json

API_KEY = os.getenv("RESUMEFORGE_COMPANY_KEY", "YOUR_rf_comp_live_KEY_HERE")
BASE_URL = "https://resumeforgeai.in/api/v1/company"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

def sync_invoices():
    page = 1
    total_synced = 0
    
    print("Starting ResumeForge AI invoice sync...")
    while True:
        url = f"{BASE_URL}/invoices?page={page}&limit=50"
        res = requests.get(url, headers=HEADERS, timeout=15)
        
        if res.status_code == 401:
            raise PermissionError("Invalid API key provided.")
        elif res.status_code == 403:
            raise PermissionError("API key has been revoked by admin.")
        elif res.status_code != 200:
            raise RuntimeError(f"HTTP {res.status_code}: {res.text}")
            
        data = res.json()
        invoices = data.get("invoices", [])
        if not invoices:
            break
            
        for inv in invoices:
            # Insert or update your internal database record here
            print(f"[{inv['invoice_number']}] {inv['customer']['email']} - INR {inv['amount']} ({inv['status']})")
            total_synced += 1
            
        if page >= data.get("total_pages", 1):
            break
            
        page += 1

    print(f"Sync complete. Total invoices processed: {total_synced}")

if __name__ == "__main__":
    sync_invoices()
```

---

### Node.js / TypeScript Implementation (`sync_resumeforge.ts`):
```typescript
interface InvoiceRecord {
    id: string;
    invoice_number: string;
    plan_purchased: string;
    amount: number;
    currency: string;
    status: string;
    receipt_url: string | null;
    customer: {
        email: string | null;
        name: string | null;
    };
    created_at: string;
}

const API_KEY = process.env.RESUMEFORGE_COMPANY_KEY || "YOUR_rf_comp_live_KEY_HERE";
const BASE_URL = "https://resumeforgeai.in/api/v1/company";

async function fetchCompanyInvoices(): Promise<InvoiceRecord[]> {
    let page = 1;
    const allInvoices: InvoiceRecord[] = [];

    while (true) {
        const response = await fetch(`${BASE_URL}/invoices?page=${page}&limit=50`, {
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Sync Failed (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        const invoices: InvoiceRecord[] = data.invoices || [];
        if (invoices.length === 0) break;

        allInvoices.push(...invoices);

        if (page >= (data.total_pages || 1)) break;
        page++;
    }

    console.log(`Synced ${allInvoices.length} invoices successfully.`);
    return allInvoices;
}
```

---

### Quick cURL Test Command:
```bash
curl -X GET "https://resumeforgeai.in/api/v1/company/invoices?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_rf_comp_live_KEY_HERE"
```
