export const YenshiaLogo = ({ className = "" }: { className?: string }) => {
  return (
    <span className={`inline-flex items-center gap-2 text-[var(--navy)] ${className}`} aria-label="Yenshia">
      <svg
        className="h-full w-auto shrink-0"
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
      >
        <rect x="1" y="1" width="46" height="46" rx="18" fill="white" stroke="#D7E7FE" strokeWidth="2" />
        <path
          d="M16 14.5C19.8 20.4 22.7 23.2 24 23.2C25.3 23.2 28.2 20.4 32 14.5"
          stroke="#002259"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M24 23V34" stroke="#2670DC" strokeWidth="4" strokeLinecap="round" />
        <path
          d="M33.5 30.5C36.1 30.5 38.2 28.4 38.2 25.8C38.2 23.2 36.1 21.1 33.5 21.1C30.9 21.1 28.8 23.2 28.8 25.8"
          stroke="#79ADF8"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <circle cx="35.4" cy="18" r="3.2" fill="#0DDE53" stroke="white" strokeWidth="1.5" />
      </svg>
      <span className="font-serif text-[1.72rem] leading-none text-[var(--navy)] antialiased sm:text-[1.92rem]">
        Yenshia
      </span>
    </span>
  );
};
