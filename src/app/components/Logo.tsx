export const Logo = ({ outer = "w-7 h-7", inner = "w-3 h-3" }: { outer?: string; inner?: string }) => (
  <span className="relative inline-flex items-center justify-center">
    <span
      className={`${outer} rounded-full border-2 border-foreground`}
    />
    <span
      className={`${inner} rounded-full bg-foreground absolute`}
    />
  </span>
);
