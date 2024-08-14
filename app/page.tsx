"use client";
import React, { useState } from "react";
import ChatModal from "../components/ChatModal";


export default function Home() {
  const [iframeUrl, setIframeUrl] = useState("https://gumroad.com");

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
      <iframe
        src={iframeUrl}
        sandbox="allow-same-origin allow-scripts allow-forms"
        style={{ height: '100%', width: '100%', border: 'none' }}
      ></iframe>
      {/* Fixed position chat window */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '30px',
        zIndex: 1000
      }}>
        <ChatModal setIframeUrl={setIframeUrl} />
      </div>

    </div>
  );
}
