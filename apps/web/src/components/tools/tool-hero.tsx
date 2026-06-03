export function ToolHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b bg-navy-900 py-12">
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="font-display text-3xl font-bold text-white md:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-navy-100/70">{subtitle}</p>
      </div>
    </div>
  );
}
