import logoUrl from "@/assets/talak-logo.png";

interface Props {
  size?: number;
  className?: string;
}

export const StackedLogo = ({ size = 32, className = "" }: Props) => (
  <img
    src={logoUrl}
    alt="talak-web3"
    draggable={false}
    width={size}
    height={size}
    style={{ width: size, height: size }}
    className={"shrink-0 select-none object-contain " + className}
  />
);

export default StackedLogo;
