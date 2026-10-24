import Image from "next/image";
export default function Brand() {
  return (
    <div className="brand">
      <Image
        className="brand-logo"
        src="/brand/rojbey-wordmark.png"
        alt="ROJBEY — Wedding Dress"
        width={2172}
        height={724}
        sizes="(max-width: 700px) 180px, 240px"
        loading="eager"
      />
    </div>
  );
}
