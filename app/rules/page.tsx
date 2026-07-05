'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/site-header';
import { ScrollText, BookOpen, ShieldCheck, Ban, Upload, Key } from 'lucide-react';
import Link from 'next/link';

const RULES = [
  {
    icon: Upload,
    title: 'Only upload scripts you own or may share',
    body: 'Do not re-upload paid, leaked, or stolen scripts. Credit the original author. Repeated violations remove your upload access and forfeit pending earnings.',
  },
  {
    icon: Ban,
    title: 'No malicious code',
    body: 'Backdoors, token/cookie loggers, crypto miners, remote self-spreaders, or anything that harms the executor user are banned and result in an immediate ban.',
  },
  {
    icon: Key,
    title: 'Don’t bypass or fake the key system',
    body: 'Key completions are verified server-side. Automating, spoofing, or farming completions to inflate earnings voids your balance and closes your account.',
  },
  {
    icon: ShieldCheck,
    title: 'Keep descriptions accurate',
    body: 'Describe what your script does and which games it supports. Misleading titles, fake “free” tags on locked content, or spam listings will be unpublished.',
  },
];

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader active="/rules" />

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <ScrollText className="h-7 w-7 text-red-500" />
          <h1 className="text-3xl font-bold text-foreground">Rules</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Apocalypse Hub is a shared marketplace. These rules keep it safe for players and fair for creators.
          Breaking them can unpublish your scripts, void earnings, or ban your account.
        </p>

        <div className="space-y-4">
          {RULES.map((r) => (
            <Card key={r.title} className="bg-card border-border">
              <CardContent className="p-5 flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
                  <r.icon className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground mb-1">{r.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Docs callout */}
        <Card className="bg-card border-border mt-8">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
                <BookOpen className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground mb-1">Documentation</h2>
                <p className="text-sm text-muted-foreground">
                  Setting up the key system, loadstrings, obfuscation, and earnings — it&apos;s all in the docs.
                </p>
              </div>
            </div>
            <a href="/docs/index.html" className="shrink-0">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                <BookOpen className="mr-2 h-4 w-4" /> Open Docs
              </Button>
            </a>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to catalog</Link>
        </div>
      </div>
    </div>
  );
}
