type Props = {
  code: string;
  className?: string;
};

export function CodeBlock({ code, className }: Props) {
  return (
    <pre
      className={`overflow-x-auto rounded-xl border border-slate-400/25 bg-slate-950/55 px-3 py-2 font-mono text-xs text-emerald-100/95 backdrop-blur-sm ${className ?? ""}`}
    >
      {code}
    </pre>
  );
}
