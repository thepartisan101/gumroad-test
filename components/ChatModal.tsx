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

export default function ChatModal() {

    return (
      <div className="py-40  flex items-center justify-center">
        <Modal>
          <ModalTrigger className="bg-[#f1f333] border-[1px] border-black dark:bg-white dark:text-black text-black flex justify-center rounded hover:-translate-y-0.5 shadow-[1px_1px_rgba(0,0,0),2px_2px_rgba(0,0,0),3px_3px_rgba(0,0,0),4px_4px_rgba(0,0,0),5px_5px_0px_0px_rgba(0,0,0)] dark:shadow-[1px_1px_rgba(255,255,255),2px_2px_rgba(255,255,255),3px_3px_rgba(255,255,255),4px_4px_rgba(255,255,255),5px_5px_0px_0px_rgba(255,255,255)]">
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