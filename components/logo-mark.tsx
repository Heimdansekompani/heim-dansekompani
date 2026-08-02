import Image from "next/image";

export function LogoMark({
  className,
  src = "/images/logos/logo-main-white-circle.png",
  width = 128,
  height = 128,
}: {
  className?: string;
  src?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      src={src}
      alt="Heim Dansekompani"
      width={width}
      height={height}
      priority
      className={className}
    />
  );
}
