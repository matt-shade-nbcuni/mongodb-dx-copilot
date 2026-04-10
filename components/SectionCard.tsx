import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** Short, plain-language line under the title */
  hint?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "warning" | "risk";
};

export function SectionCard({
  title,
  hint,
  children,
  className,
  variant = "default",
}: Props) {
  return (
    <section
      className={cn(
        "glass-panel rounded-2xl p-5",
        variant === "default" && "border-[var(--card-border)]",
        variant === "warning" &&
          "border-[var(--warning-border)] bg-[var(--warning-bg)]",
        variant === "risk" && "border-[var(--risk-border)] bg-[var(--risk-bg)]",
        className
      )}
    >
      <h3 className="text-sm font-semibold tracking-tight text-slate-50">
        {title}
      </h3>
      {hint ? (
        <p className="mt-1 text-xs leading-relaxed text-slate-400">{hint}</p>
      ) : null}
      <div className="mt-3 text-sm text-slate-100/95">{children}</div>
    </section>
  );
}
