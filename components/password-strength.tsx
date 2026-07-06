'use client';

import { Check, X } from 'lucide-react';
import { checkPassword, passwordScore, PASSWORD_STRENGTH_LABELS } from '@/lib/password';

const BAR_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-emerald-500'];

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? 'text-emerald-400' : 'text-muted-foreground'}`}>
      {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {children}
    </li>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const c = checkPassword(password);
  const score = passwordScore(password);

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < score ? BAR_COLORS[score] : 'bg-secondary'}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Strength: <span className="text-foreground">{PASSWORD_STRENGTH_LABELS[score]}</span>
      </p>
      <ul className="text-xs space-y-0.5">
        <Rule ok={c.minLength}>At least 8 characters</Rule>
        <Rule ok={c.hasLetter}>Contains a letter</Rule>
        <Rule ok={c.hasNumber}>Contains a number</Rule>
      </ul>
    </div>
  );
}
