const SIZES = {
  28: "size-7 text-[11px]",
  32: "size-8 text-[12px]",
  40: "size-10 text-[14px]",
  52: "size-[52px] text-[17px]",
} as const;

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Tinted initials avatar (#EDF2EF / #3E6B58) per README list rows. */
export function AvatarInitials({ name, size = 28 }: { name: string; size?: keyof typeof SIZES }) {
  return (
    <span
      aria-hidden
      className={`flex flex-none items-center justify-center rounded-full bg-[#EDF2EF] font-bold text-[#3E6B58] ${SIZES[size]}`}
    >
      {initialsOf(name)}
    </span>
  );
}
