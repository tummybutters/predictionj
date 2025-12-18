type LandingShellProps = {
  children: React.ReactNode;
};

export function LandingShell({ children }: LandingShellProps) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#f7f1e9] text-black">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_520px_at_25%_0%,rgba(255,255,255,0.75)_0%,transparent_55%),radial-gradient(880px_560px_at_80%_-10%,rgba(255,165,120,0.18)_0%,transparent_60%)]" />

      {children}
    </div>
  );
}
