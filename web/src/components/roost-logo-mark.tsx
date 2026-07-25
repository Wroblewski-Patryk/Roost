import roostLogoUrl from "../assets/roost-logo.svg";

type RoostLogoMarkProps = {
  alt?: string;
  className?: string;
};

export function RoostLogoMark({
  alt = "Roost logo",
  className = "h-11 w-11"
}: RoostLogoMarkProps) {
  return (
    <img
      alt={alt}
      className={["block shrink-0 select-none drop-shadow-[0_0_22px_rgb(99_102_241_/_0.2)]", className].filter(Boolean).join(" ")}
      draggable="false"
      src={roostLogoUrl}
    />
  );
}
