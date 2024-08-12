import Image from "next/image";

export default function Home() {
  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
      <iframe
        src="https://gumroad.com"
        style={{ height: '100%', width: '100%', border: 'none' }}
      ></iframe>

    </div>
  );
}
