import Image from "next/image";

export function BecLogo({ size, className = "" }: { size: number; className?: string }) {
  return (
    <Image
      src="/bec-logo.png"
      alt="Bethesda English Course Sidoarjo"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
