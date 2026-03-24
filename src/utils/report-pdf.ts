const money = (value: number | string | undefined | null) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const num = (value: number | string | undefined | null) =>
  Number(value || 0).toLocaleString("en-IN");

const text = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value?: string) => {
  if (!value) return "All Time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

type MetaRow = { label: string; value: string };
type Overview = {
  sales?: {
    totalSales?: number;
    totalPaid?: number;
    totalDue?: number;
    refundedAmount?: number;
    profit?: number;
  };
  inventory?: {
    totalPlantsAvailable?: number;
    plantsSold?: number;
    plantsReturned?: number;
    plantsDiscarded?: number;
  };
  customers?: {
    totalCustomers?: number;
    customersWithDues?: number;
    customersWithCompletedPayments?: number;
  };
  staff?: {
    analytics?: Array<{
      staff?: string;
      staffName?: string;
      salesCount?: number;
      salesMade?: number;
      collections?: number;
      expenses?: number;
      expensesRecorded?: number;
    }>;
  };
};

type StructuredReport = {
  reportType: string;
  metaRows: MetaRow[];
  overview: Overview;
  tables: {
    sales: Array<Record<string, any>>;
    payments: Array<Record<string, any>>;
    inventory: Array<Record<string, any>>;
    staff: Array<Record<string, any>>;
  };
};

const tableRows = (rows: Array<Record<string, any>>, columns: Array<{ key: string; label: string; align?: "left" | "right" }>, formatters?: Record<string, (value: any) => string>) => {
  if (!rows.length) {
    return `<tr><td colspan="${columns.length}" class="empty">No records available</td></tr>`;
  }

  return rows
    .map(
      (row, index) => `
      <tr>
        ${columns
          .map((column) => {
            const raw = row?.[column.key];
            const formatted = formatters?.[column.key] ? formatters[column.key](raw) : String(raw ?? "-");
            return `<td class="${column.align === "right" ? "right" : ""}">${index === -1 ? "" : text(formatted)}</td>`;
          })
          .join("")}
      </tr>`,
    )
    .join("");
};

export const formatReportHtml = (report: StructuredReport) => {
  const meta = Object.fromEntries((report.metaRows || []).map((row) => [row.label, row.value]));
  const overview = report.overview || {};
  const sales = overview.sales || {};
  const inventory = overview.inventory || {};
  const customers = overview.customers || {};
  const topStaff = (report.tables.staff || []).slice(0, 5);

  const salesRows = tableRows(
    report.tables.sales || [],
    [
      { key: "saleId", label: "Sale ID" },
      { key: "customer", label: "Customer" },
      { key: "items", label: "Items", align: "right" },
      { key: "total", label: "Total", align: "right" },
      { key: "paid", label: "Paid", align: "right" },
      { key: "due", label: "Due", align: "right" },
      { key: "status", label: "Status" },
    ],
    { total: money, paid: money, due: money, items: num },
  );

  const paymentRows = tableRows(
    report.tables.payments || [],
    [
      { key: "paymentId", label: "Payment ID" },
      { key: "sale", label: "Sale Ref" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "mode", label: "Mode" },
      { key: "status", label: "Status" },
      { key: "date", label: "Date" },
    ],
    { amount: money, date: formatDate },
  );

  const inventoryRows = tableRows(
    report.tables.inventory || [],
    [
      { key: "plantType", label: "Plant Type" },
      { key: "available", label: "Available", align: "right" },
      { key: "sold", label: "Sold", align: "right" },
      { key: "returned", label: "Returned", align: "right" },
    ],
    { available: num, sold: num, returned: num },
  );

  const staffRows = tableRows(
    report.tables.staff || [],
    [
      { key: "staff", label: "Staff" },
      { key: "salesCount", label: "Sales", align: "right" },
      { key: "collections", label: "Collections", align: "right" },
      { key: "expenses", label: "Expenses", align: "right" },
    ],
    { salesCount: num, collections: money, expenses: money },
  );

  const topStaffCards = topStaff.length
    ? topStaff
        .map(
          (row) => `
          <div class="mini-card">
            <div class="mini-title">${text(row.staff || "Staff")}</div>
            <div class="mini-value">${money(row.collections)}</div>
            <div class="mini-sub">Sales ${num(row.salesCount)} • Expense ${money(row.expenses)}</div>
          </div>`,
        )
        .join("")
    : `<div class="empty-panel">No staff activity available for this period.</div>`;

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { margin: 24px; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #10233b; margin: 0; font-size: 12px; background: #ffffff; }
        .sheet { padding: 10px 8px 24px; }
        .hero { background: linear-gradient(135deg, #0f4c81, #1e6aa8); color: #fff; border-radius: 18px; padding: 24px; display: flex; justify-content: space-between; gap: 18px; }
        .hero-title { font-size: 26px; font-weight: 800; letter-spacing: 0.4px; }
        .hero-sub { font-size: 12px; color: #dbeafe; margin-top: 6px; line-height: 1.5; }
        .hero-tag { text-align: right; }
        .hero-tag .type { font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #dbeafe; }
        .hero-tag .name { font-size: 22px; font-weight: 700; margin-top: 8px; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0 18px; }
        .meta-card { border: 1px solid #d7e6f5; border-radius: 12px; padding: 12px 14px; background: #f8fbff; }
        .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.7px; color: #5b728a; margin-bottom: 6px; }
        .meta-value { font-size: 14px; font-weight: 700; color: #10233b; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
        .stat-card { border-radius: 14px; padding: 14px; color: #fff; min-height: 84px; }
        .stat-card.blue { background: linear-gradient(135deg, #1d4ed8, #2563eb); }
        .stat-card.green { background: linear-gradient(135deg, #047857, #059669); }
        .stat-card.red { background: linear-gradient(135deg, #b91c1c, #dc2626); }
        .stat-card.amber { background: linear-gradient(135deg, #92400e, #d97706); }
        .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.7px; color: rgba(255,255,255,0.78); }
        .stat-value { font-size: 21px; font-weight: 800; margin-top: 10px; }
        .grid-two { display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px; margin-bottom: 18px; }
        .panel { border: 1px solid #d7e6f5; border-radius: 14px; padding: 16px; background: #fff; }
        .panel-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.7px; color: #36526e; margin-bottom: 12px; }
        .metric-stack { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .metric { background: #f8fbff; border: 1px solid #e1edf8; border-radius: 10px; padding: 12px; }
        .metric .k { font-size: 10px; text-transform: uppercase; letter-spacing: 0.7px; color: #69839e; }
        .metric .v { font-size: 17px; font-weight: 800; margin-top: 6px; color: #10233b; }
        .mini-list { display: grid; gap: 10px; }
        .mini-card { border: 1px solid #e1edf8; border-radius: 10px; padding: 12px; background: #f8fbff; }
        .mini-title { font-weight: 700; font-size: 13px; color: #10233b; }
        .mini-value { margin-top: 6px; font-size: 16px; font-weight: 800; color: #0f4c81; }
        .mini-sub { margin-top: 4px; font-size: 11px; color: #5b728a; }
        .section { margin-top: 18px; }
        .section-title { font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #36526e; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; border: 1px solid #d7e6f5; border-radius: 14px; overflow: hidden; }
        th, td { padding: 10px 12px; border-bottom: 1px solid #e5edf6; font-size: 11px; vertical-align: top; }
        th { background: #edf5fc; text-transform: uppercase; letter-spacing: 0.5px; color: #46627e; text-align: left; }
        tbody tr:nth-child(even) td { background: #fbfdff; }
        .right { text-align: right; }
        .empty { text-align: center; color: #6b7f92; padding: 18px; }
        .empty-panel { border: 1px dashed #c8d7e7; border-radius: 10px; padding: 16px; color: #6b7f92; background: #fbfdff; }
        .footer { margin-top: 20px; display: flex; justify-content: space-between; color: #6b7f92; font-size: 11px; border-top: 1px solid #e5edf6; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="hero">
          <div>
            <div class="hero-title">PNMS Analytics Report</div>
            <div class="hero-sub">
              Professional operating snapshot for nursery sales, collections, inventory and staff performance.
            </div>
          </div>
          <div class="hero-tag">
            <div class="type">Report Type</div>
            <div class="name">${text(String(report.reportType || "Sales").replace(/_/g, " "))}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-card">
            <div class="meta-label">Nursery</div>
            <div class="meta-value">${text(meta.Nursery || "-")}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Generated By</div>
            <div class="meta-value">${text(meta["Generated By"] || "-")}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Date Range</div>
            <div class="meta-value">${text(meta["Date Range"] || "-")}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Report Focus</div>
            <div class="meta-value">${text(report.reportType || "-")}</div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card blue"><div class="stat-label">Total Sales</div><div class="stat-value">${money(sales.totalSales)}</div></div>
          <div class="stat-card green"><div class="stat-label">Collections</div><div class="stat-value">${money(sales.totalPaid)}</div></div>
          <div class="stat-card red"><div class="stat-label">Outstanding Due</div><div class="stat-value">${money(sales.totalDue)}</div></div>
          <div class="stat-card amber"><div class="stat-label">Profit</div><div class="stat-value">${money(sales.profit)}</div></div>
        </div>

        <div class="grid-two">
          <div class="panel">
            <div class="panel-title">Operational Snapshot</div>
            <div class="metric-stack">
              <div class="metric"><div class="k">Plants Available</div><div class="v">${num(inventory.totalPlantsAvailable)}</div></div>
              <div class="metric"><div class="k">Plants Sold</div><div class="v">${num(inventory.plantsSold)}</div></div>
              <div class="metric"><div class="k">Plants Returned</div><div class="v">${num(inventory.plantsReturned)}</div></div>
              <div class="metric"><div class="k">Plants Discarded</div><div class="v">${num(inventory.plantsDiscarded)}</div></div>
              <div class="metric"><div class="k">Customers</div><div class="v">${num(customers.totalCustomers)}</div></div>
              <div class="metric"><div class="k">Customers With Dues</div><div class="v">${num(customers.customersWithDues)}</div></div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-title">Top Staff Collections</div>
            <div class="mini-list">${topStaffCards}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Sales Register</div>
          <table>
            <thead>
              <tr><th>Sale ID</th><th>Customer</th><th class="right">Items</th><th class="right">Total</th><th class="right">Paid</th><th class="right">Due</th><th>Status</th></tr>
            </thead>
            <tbody>${salesRows}</tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Payment Register</div>
          <table>
            <thead>
              <tr><th>Payment ID</th><th>Sale Ref</th><th class="right">Amount</th><th>Mode</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Inventory Summary</div>
          <table>
            <thead>
              <tr><th>Plant Type</th><th class="right">Available</th><th class="right">Sold</th><th class="right">Returned</th></tr>
            </thead>
            <tbody>${inventoryRows}</tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Staff Performance</div>
          <table>
            <thead>
              <tr><th>Staff</th><th class="right">Sales</th><th class="right">Collections</th><th class="right">Expenses</th></tr>
            </thead>
            <tbody>${staffRows}</tbody>
          </table>
        </div>

        <div class="footer">
          <div>System generated PNMS dashboard report</div>
          <div>${text(meta["Generated By"] || "PNMS")}</div>
        </div>
      </div>
    </body>
  </html>`;
};
