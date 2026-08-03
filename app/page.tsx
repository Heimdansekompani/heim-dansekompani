import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

export default function Home() {
  return (
    <div className="relative -mt-20 flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      <video
        className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover blur-sm"
        src="https://res.cloudinary.com/wmmws9et/video/upload/v1785517769/Heim_Nettside_Video_pyi4ww.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 -z-10 bg-black/40" />
      <LogoMark
        className="h-auto w-35 text-white sm:w-56 lg:w-72"
        src="/images/logos/logo-main-white.png"
        width={900}
        height={450}
      />
      <h1 className="font-serif text-6xl font-semibold tracking-[0.2em] sm:text-8xl lg:text-9xl underline underline-offset-6">
        HEIM
      </h1>
      <p className="mt-2 font-serif text-2xl tracking-[0.2em] sm:text-4xl lg:text-5xl ">Dansekompani</p>
      <p className="mt-8 max-w-xl font-serif text-base leading-relaxed text-white/80 sm:text-lg">
        Et nyetablert dansekompani i skjæringspunktet mellom hip hop og
        samtidsdans.
      </p>
      <Link
        href="/om"
        className="mt-10 font-serif text-sm tracking-wide text-white underline underline-offset-4 hover:text-white/80"
      >
        Les mer om kompaniet
      </Link>
    </div>
  );
}
