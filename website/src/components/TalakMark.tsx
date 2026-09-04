import logoUrl from "@/assets/talak-logo.png";

type Props = { className?: string };

export function TalakMark({ className }: Props) {
  return (
    <img
      src={logoUrl}
      alt="talak-web3"
      draggable={false}
      className={
        "shrink-0 select-none object-contain " + (className ?? "h-7 w-7")
      }
    />
  );
}

export default TalakMark;
