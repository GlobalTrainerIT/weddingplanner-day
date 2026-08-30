import { Lock, Check, X } from 'lucide-react';
import { PASSWORD_RULES, passwordStrength, type PasswordRule } from '../lib/authHelpers';

interface Props {
  password: string;
  onValidityChange?: (valid: boolean) => void;
}

export default function PasswordStrengthMeter({ password, onValidityChange }: Props) {
  if (!password) return null;
  const { score, failed } = passwordStrength(password);
  const allPassed = failed.length === 0;
  const segments = [
    { threshold: 1, label: 'Very weak', color: 'bg-rose-400' },
    { threshold: 2, label: 'Weak', color: 'bg-orange-400' },
    { threshold: 3, label: 'Fair', color: 'bg-amber-400' },
    { threshold: 4, label: 'Good', color: 'bg-lime-500' },
    { threshold: 5, label: 'Strong', color: 'bg-emerald-500' },
  ];
  const current = segments.find(s => s.threshold === score) ?? segments[0];
  const visibleRules: PasswordRule[] = password.length > 0 ? PASSWORD_RULES : [];

  if (onValidityChange) {
    queueMicrotask(() => onValidityChange(allPassed));
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {segments.map((s, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? s.color : 'bg-stone-200'}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <Lock size={11} className="text-[#6b5d4f]" />
        <span className="text-xs text-[#6b5d4f]">{current.label}</span>
      </div>
      <ul className="grid grid-cols-1 gap-0.5">
        {visibleRules.map(rule => {
          const passed = rule.test(password);
          return (
            <li key={rule.key} className="flex items-center gap-1.5 text-xs">
              {passed ? (
                <Check size={11} className="text-emerald-600 flex-shrink-0" />
              ) : (
                <X size={11} className="text-stone-400 flex-shrink-0" />
              )}
              <span className={passed ? 'text-emerald-700' : 'text-[#6b5d4f]'}>{rule.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
