import Image from "next/image";

type ChromaIconProps = {
  className?: string;
};

export function ChromaIcon({
  className,
}: Readonly<ChromaIconProps>) {
  return (
    <Image
      alt=""
      className={className}
      draggable={false}
      height={256}
      src="/icons/chroma-gem.png"
      width={256}
    />
  );
}
