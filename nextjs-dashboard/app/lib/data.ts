import postgres from 'postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import { users, customers, invoices, revenue } from './placeholder-data';

const sql = process.env.POSTGRES_URL 
  ? postgres(process.env.POSTGRES_URL, { ssl: 'require' })
  : null;

export async function fetchRevenue() {
  try {
    if (!sql) {
      return revenue;
    }

    const data = await sql<Revenue[]>`SELECT * FROM revenue`;
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    return revenue;
  }
}

export async function fetchLatestInvoices() {
  try {
    if (!sql) {
      const latestInvoices = invoices.slice(0, 5).map((invoice) => {
        const customer = customers.find(c => c.id === invoice.customer_id);
        return {
          id: invoice.customer_id,
          name: customer?.name || 'Unknown',
          image_url: customer?.image_url || '',
          email: customer?.email || '',
          amount: formatCurrency(invoice.amount),
        };
      });
      return latestInvoices;
    }

    const data = await sql<LatestInvoiceRaw[]>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const latestInvoices = data.map((invoice: LatestInvoiceRaw) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    const latestInvoices = invoices.slice(0, 5).map((invoice) => {
      const customer = customers.find(c => c.id === invoice.customer_id);
      return {
        id: invoice.customer_id,
        name: customer?.name || 'Unknown',
        image_url: customer?.image_url || '',
        email: customer?.email || '',
        amount: formatCurrency(invoice.amount),
      };
    });
    return latestInvoices;
  }
}

export async function fetchCardData() {
  try {
    if (!sql) {
      const numberOfInvoices = invoices.length;
      const numberOfCustomers = customers.length;
      const totalPaidInvoices = formatCurrency(
        invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)
      );
      const totalPendingInvoices = formatCurrency(
        invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0)
      );
      return {
        numberOfCustomers,
        numberOfInvoices,
        totalPaidInvoices,
        totalPendingInvoices,
      };
    }

    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0][0].count ?? '0');
    const numberOfCustomers = Number(data[1][0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2][0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    const numberOfInvoices = invoices.length;
    const numberOfCustomers = customers.length;
    const totalPaidInvoices = formatCurrency(
      invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)
    );
    const totalPendingInvoices = formatCurrency(
      invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.amount, 0)
    );
    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    if (!sql) {
      const filtered = invoices.filter((invoice) => {
        const customer = customers.find(c => c.id === invoice.customer_id);
        const name = customer?.name.toLowerCase() || '';
        const email = customer?.email.toLowerCase() || '';
        const amount = invoice.amount.toString();
        const date = invoice.date;
        const status = invoice.status.toLowerCase();
        const q = query.toLowerCase();
        return name.includes(q) || email.includes(q) || amount.includes(q) || date.includes(q) || status.includes(q);
      });
      return filtered.slice(offset, offset + ITEMS_PER_PAGE).map((invoice) => {
        const customer = customers.find(c => c.id === invoice.customer_id);
        return {
          id: invoice.customer_id,
          amount: invoice.amount,
          date: invoice.date,
          status: invoice.status,
          name: customer?.name || 'Unknown',
          email: customer?.email || '',
          image_url: customer?.image_url || '',
        };
      });
    }

    const invoicesData = await sql<InvoicesTable[]>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;

    return invoicesData;
  } catch (error) {
    console.error('Database Error:', error);
    const filtered = invoices.filter((invoice) => {
      const customer = customers.find(c => c.id === invoice.customer_id);
      const name = customer?.name.toLowerCase() || '';
      const email = customer?.email.toLowerCase() || '';
      const amount = invoice.amount.toString();
      const date = invoice.date;
      const status = invoice.status.toLowerCase();
      const q = query.toLowerCase();
      return name.includes(q) || email.includes(q) || amount.includes(q) || date.includes(q) || status.includes(q);
    });
    return filtered.slice(offset, offset + ITEMS_PER_PAGE).map((invoice) => {
      const customer = customers.find(c => c.id === invoice.customer_id);
      return {
        id: invoice.customer_id,
        amount: invoice.amount,
        date: invoice.date,
        status: invoice.status,
        name: customer?.name || 'Unknown',
        email: customer?.email || '',
        image_url: customer?.image_url || '',
      };
    });
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    if (!sql) {
      const filtered = invoices.filter((invoice) => {
        const customer = customers.find(c => c.id === invoice.customer_id);
        const name = customer?.name.toLowerCase() || '';
        const email = customer?.email.toLowerCase() || '';
        const amount = invoice.amount.toString();
        const date = invoice.date;
        const status = invoice.status.toLowerCase();
        const q = query.toLowerCase();
        return name.includes(q) || email.includes(q) || amount.includes(q) || date.includes(q) || status.includes(q);
      });
      const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
      return totalPages;
    }

    const data = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    const filtered = invoices.filter((invoice) => {
      const customer = customers.find(c => c.id === invoice.customer_id);
      const name = customer?.name.toLowerCase() || '';
      const email = customer?.email.toLowerCase() || '';
      const amount = invoice.amount.toString();
      const date = invoice.date;
      const status = invoice.status.toLowerCase();
      const q = query.toLowerCase();
      return name.includes(q) || email.includes(q) || amount.includes(q) || date.includes(q) || status.includes(q);
    });
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    return totalPages;
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    if (!sql) {
      const invoice = invoices.find(i => i.customer_id === id);
      if (!invoice) return null;
      return {
        id: invoice.customer_id,
        customer_id: invoice.customer_id,
        amount: invoice.amount / 100,
        status: invoice.status,
      };
    }

    const data = await sql<InvoiceForm[]>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.map((invoice: InvoiceForm) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    const invoice = invoices.find(i => i.customer_id === id);
    if (!invoice) return null;
    return {
      id: invoice.customer_id,
      customer_id: invoice.customer_id,
      amount: invoice.amount / 100,
      status: invoice.status,
    };
  }
}

export async function fetchCustomers() {
  try {
    if (!sql) {
      return customers.map(c => ({ id: c.id, name: c.name }));
    }

    const customersData = await sql<CustomerField[]>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    return customersData;
  } catch (err) {
    console.error('Database Error:', err);
    return customers.map(c => ({ id: c.id, name: c.name }));
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    if (!sql) {
      const filtered = customers.filter((customer) => {
        const name = customer.name.toLowerCase();
        const email = customer.email.toLowerCase();
        const q = query.toLowerCase();
        return name.includes(q) || email.includes(q);
      });
      return filtered.map((customer) => {
        const customerInvoices = invoices.filter((i: any) => i.customer_id === customer.id);
        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          image_url: customer.image_url,
          total_invoices: customerInvoices.length,
          total_pending: formatCurrency(
            customerInvoices.filter((i: any) => i.status === 'pending').reduce((sum: any, i: any) => sum + i.amount, 0)
          ),
          total_paid: formatCurrency(
            customerInvoices.filter((i: any) => i.status === 'paid').reduce((sum: any, i: any) => sum + i.amount, 0)
          ),
        };
      });
    }

    const data = await sql<CustomersTableType[]>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customersData = data.map((customer: CustomersTableType) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customersData;
  } catch (err) {
    console.error('Database Error:', err);
    const filtered = customers.filter((customer) => {
      const name = customer.name.toLowerCase();
      const email = customer.email.toLowerCase();
      const q = query.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
    return filtered.map((customer) => {
      const customerInvoices = invoices.filter((i: any) => i.customer_id === customer.id);
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        image_url: customer.image_url,
        total_invoices: customerInvoices.length,
        total_pending: formatCurrency(
          customerInvoices.filter((i: any) => i.status === 'pending').reduce((sum: any, i: any) => sum + i.amount, 0)
        ),
        total_paid: formatCurrency(
          customerInvoices.filter((i: any) => i.status === 'paid').reduce((sum: any, i: any) => sum + i.amount, 0)
        ),
      };
    });
  }
}
