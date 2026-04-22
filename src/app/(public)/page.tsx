import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Image
        src="/squadpitch-logo.png"
        alt="Squadpitch"
        width={800}
        height={400}
        priority
        className="max-w-[90vw] h-auto"
      />
    </div>
  );
}
