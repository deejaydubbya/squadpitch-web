import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-light to-white">
      <div className="flex flex-col items-center gap-6">
        <Image
          src="/logo.png"
          alt="Squadpitch"
          width={180}
          height={120}
          priority
        />
        <h1 className="text-7xl md:text-9xl font-bold tracking-tight text-gray-900">
          Squadpitch
        </h1>
      </div>
    </div>
  );
}
