import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger";

const styles: Record<Tone, string> = {
  neutral: "bg-[#0b2a35]/70 text-slate-100 border-[#1f4f42]/60",
  success: "bg-emerald-500/18 text-emerald-100 border-emerald-300/45",
  warning: "bg-amber-500/20 text-amber-100 border-amber-300/35",
  danger: "bg-red-500/20 text-red-100 border-red-300/35",
};

type Props = {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
};

export function StatusBadge({ children, tone = "neutral", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm",
        styles[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
