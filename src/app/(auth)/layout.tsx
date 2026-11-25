export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen alabaster-canvas alabaster-grid bg-grain flex items-center justify-center p-4 relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-40 -left-32 h-[440px] w-[440px] rounded-full bg-[#B59666]/[0.11] blur-[130px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-40 -right-32 h-[440px] w-[440px] rounded-full bg-[#4A607A]/[0.09] blur-[130px]"
      />
      <div className="w-full max-w-md relative z-10">{children}</div>
    </div>
  );
}
