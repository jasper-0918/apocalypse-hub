'use client';

import { SupportTicketsPanel } from '@/components/support-tickets-panel';

export default function AdminSupportPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Support Tickets</h1>
        <p className="text-muted-foreground">Claim, respond to, and resolve user support requests</p>
      </div>
      <SupportTicketsPanel />
    </div>
  );
}
