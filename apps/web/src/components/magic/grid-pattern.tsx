/** Subtle animated dot-grid background (Magic UI style). Pure CSS, SSR-safe. */
export function GridPattern({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)] ${className}`}
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.18) 1px, transparent 0)',
        backgroundSize: '28px 28px',
        animation: 'gridfade 8s ease-in-out infinite',
      }}
    />
  );
}
