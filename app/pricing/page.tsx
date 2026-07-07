'use client';

import { PricingTable } from '@/components/pricing-table';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/logo';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Logo className="h-8 w-8" />
            <span className="text-2xl font-bold text-foreground">Apocalypse Blox Hub</span>
          </div>
          <h1 className="text-4xl font-extrabold text-foreground mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Protect your scripts and manage keys with Apocalypse Blox Hub
          </p>
        </div>

        <PricingTable />

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            All plans include key system protection and script obfuscation.
            <br />
            Cancel anytime. No hidden fees.
          </p>
        </div>
      </div>
    </div>
  );
}
