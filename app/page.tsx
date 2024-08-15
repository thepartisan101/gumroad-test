"use client";
import React, { useState } from "react";
import ChatModal from "../components/ChatModal";
import Chat from "@/components/ChatDrawer";


export default function Home() {
  const [iframeUrl, setIframeUrl] = useState("https://gumroad.com");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  }

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
        bottom: '50vh',
        right: '30px',
        zIndex: 1000
      }}>
        {/* <ChatDrawer onClick /> */}
        <button
          onClick={toggleDrawer}
          className="bg-[#f1f333] px-4 py-2 border-[1px] border-black dark:bg-white dark:text-black text-black flex justify-center rounded hover:-translate-y-0.5 shadow-[1px_1px_rgba(0,0,0),2px_2px_rgba(0,0,0),3px_3px_rgba(0,0,0),4px_4px_rgba(0,0,0),5px_5px_0px_0px_rgba(0,0,0)] dark:shadow-[1px_1px_rgba(255,255,255),2px_2px_rgba(255,255,255),3px_3px_rgba(255,255,255),4px_4px_rgba(255,255,255),5px_5px_0px_0px_rgba(255,255,255)]">
            <span className="group-hover/modal-btn:translate-x-40 text-center transition duration-500 font-semibold">
              Ask Gummy
            </span>
        </button>
        <Chat
          isOpen={isDrawerOpen}
          onClose={toggleDrawer}
          />
      </div>

    </div>
  );
}
