export const Logo = ({ outer = "w-7 h-7", inner = "w-3 h-3" }) => (
  <span className="relative inline-flex items-center justify-center">
    <span
      className={`${outer} rounded-full border-2 border-foreground/60 flex items-center justify-center`}
    >
      <span className={`${inner} rounded-full border border-foreground/60`} />
    </span>
  </span>
);
