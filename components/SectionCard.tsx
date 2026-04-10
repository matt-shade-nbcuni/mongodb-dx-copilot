import { cn } from "@/lib/utils";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "warning" | "risk";
};

export function SectionCard({
  title,
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
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300/90">
        {title}
      </h3>
      <div className="mt-3 text-sm text-slate-100/95">{children}</div>
    </section>
  );
}
