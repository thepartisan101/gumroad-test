"use client";
import React, { useEffect } from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTrigger,
} from "../components/ui/animated-modal";
import { motion } from "framer-motion";
import { useChat } from 'ai/react';
import Chat from "./Chat";

// Define the props interface
interface ChatModalProps {
  setIframeUrl: (url: string) => void;
}

export default function ChatModal({ setIframeUrl }: ChatModalProps) {
    const { messages, input, handleInputChange, handleSubmit, isLoading, error, reload } =
        useChat({
            keepLastMessageOnError: true,
        });

    useEffect(() => {
      const handleLinkClick = (event: Event) => {
        event.preventDefault(); // Prevent default navigation behavior
        event.stopPropagation();
        const url = (event.currentTarget as HTMLAnchorElement).href;

        // Debugging statements
        console.log("Link clicked!");
        console.log("Default event prevented.");
        console.log("Navigating iframe to URL:", url);

        setIframeUrl(url); // Update the iframe URL state
      };

      const links = document.querySelectorAll('.py-10 a');
      links.forEach(link => {
        link.addEventListener('click', handleLinkClick as EventListener);
      });

      // Cleanup function to remove event listeners
      return () => {
        links.forEach(link => {
          link.removeEventListener('click', handleLinkClick as EventListener);
        });
      };
    }, [setIframeUrl]);

    return (
      <div className="py-40  flex items-center justify-center">
        <Modal>
          <ModalTrigger className="bg-[#f1f333] border-r-4 border-b-4 border-black dark:bg-white dark:text-black text-black flex justify-center rounded hover:-translate-y-0.5">
            <span className="group-hover/modal-btn:translate-x-40 text-center transition duration-500 font-semibold">
              Ask Gummy
            </span>
            <div className="-translate-x-40 group-hover/modal-btn:translate-x-0 flex items-center justify-center absolute inset-0 transition duration-500 text-white z-20">
                🤖
            </div>
          </ModalTrigger>
          <ModalBody className="pt-4 w-2/3 pb-2">
            <ModalContent className="pt-4">
              <Chat />
            </ModalContent>
            <ModalFooter className="hidden">
              <button className="px-2 py-1 bg-gray-200 text-black dark:bg-black dark:border-black dark:text-white border border-gray-300 rounded-md text-sm w-28">
                Cancel
              </button>
              <button className="bg-black text-white dark:bg-white dark:text-black text-sm px-2 py-1 rounded-md border border-black w-28">
                Book Now
              </button>
            </ModalFooter>
          </ModalBody>
        </Modal>
      </div>
    );
  }