import { deleteInvoice } from '@/app/lib/actions';

export async function POST(request: Request) {
  const formData = await request.formData();
  const id = formData.get('id') as string;
  await deleteInvoice(id);
  
  return Response.redirect(new URL('/dashboard/invoices', request.url));
}
