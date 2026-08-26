export const Logo = ({
  outer = "w-7 h-7",
  inner = "w-2.5 h-2.5",
  className = "",
}: {
  outer?: string;
  inner?: string;
  className?: string;
}) => (
  <span className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
    <span
      className={`${outer} rounded-full border-2 border-white flex items-center justify-center transition-all`}
    >
      <span className={`${inner} rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]`} />
    </span>
  </span>
);

