"use client";

import React, { useState, useEffect, useRef } from "react";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import { LoadingDots } from "./LoadingDots";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

const UserMessage = ({ text }: { text: string }) => {
    return (
      <div className="self-end text-white bg-black my-2 p-2 md:p-2 rounded-sm max-w-4/5 break-words">
        {text}
      </div>
    );
  };

const AssistantMessage = ({ text }: { text: string }) => {
  const cleanedText = text.replace(/\n+/g, '\n').trim();
    return (
        <div className="my-2 p-2 md:p-2 self-start bg-gray-100 rounded-sm max-w-4/5 break-words">
            <Markdown
                components={{
                    a: ({ node, ...props }) => (
                        <a
                            {...props}
                            className="text-blue-500 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        />
                    ),
                }}
            >
                {cleanedText}
            </Markdown>
        </div>
    );
};

const CodeMessage = ({ text }: { text: string }) => {
    return (
        <div className="my-2 p-2 md:p-4 bg-gray-300 rounded-lg max-w-4/5 break-words font-mono counter-reset-line">
            {text.split("\n").map((line, index) => (
                <div key={index} className="mt-1">
                <span className="text-gray-500 mr-2">{`${index + 1}. `}</span>
                {line}
                </div>
            ))}
        </div>
    );
};

const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    case "code":
      return <CodeMessage text={text} />;
    default:
      return null;
  }
};

type ChatProps = {
  functionCallHandler?: (
    toolCall: RequiredActionFunctionToolCall
  ) => Promise<string>;
  isOpen?: boolean;
  onClose?: () => void;
};

const Chat = ({
  functionCallHandler = () => Promise.resolve(""), // default to return empty string
  isOpen,
  onClose
}: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // automatically scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // create a new threadID when chat component created
  useEffect(() => {
    const createThread = async () => {
      try {
        const res = await fetch(`/api/assistants/threads`, { method: "POST" });
        if (!res.ok) {
          throw new Error(`Error: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        setThreadId(data.threadId);
      } catch (error) {
        console.error("Failed to create thread:", error);
        // Show an error message to the user or handle it as needed
      }
    };
    createThread();
  }, []);

  const sendMessage = async (text) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content: text,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const submitActionResult = async (runId, toolCallOutputs) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/actions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: runId,
          toolCallOutputs: toolCallOutputs,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    setIsLoading(true);
    sendMessage(userInput);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);
    setUserInput("");
    setInputDisabled(true);
    scrollToBottom();
  };

  /* Stream Event Handlers */

  // textCreated - create new assistant message
  const handleTextCreated = () => {
    setIsLoading(false);
    appendMessage("assistant", "");
  };

  // textDelta - append text to last assistant message
  const handleTextDelta = (delta) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value);
    };
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }
  };

  // imageFileDone - show image in chat
  const handleImageFileDone = (image) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  }

  // toolCallCreated - log new tool call
  const toolCallCreated = (toolCall) => {
    if (toolCall.type != "code_interpreter") return;
    appendMessage("code", "");
  };

  // toolCallDelta - log delta and snapshot for the tool call
  const toolCallDelta = (delta, snapshot) => {
    if (delta.type != "code_interpreter") return;
    if (!delta.code_interpreter.input) return;
    appendToLastMessage(delta.code_interpreter.input);
  };

  // handleRequiresAction - handle function call
  const handleRequiresAction = async (
    event: AssistantStreamEvent.ThreadRunRequiresAction
  ) => {
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
    // loop over tool calls and call function handler
    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const result = await functionCallHandler(toolCall);
        return { output: result, tool_call_id: toolCall.id };
      })
    );
    setInputDisabled(true);
    submitActionResult(runId, toolCallOutputs);
  };

  // handleRunCompleted - re-enable the input form
  const handleRunCompleted = () => {
    setInputDisabled(false);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    // messages
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);

    // image
    stream.on("imageFileDone", handleImageFileDone);

    // code interpreter
    stream.on("toolCallCreated", toolCallCreated);
    stream.on("toolCallDelta", toolCallDelta);

    // events without helpers yet (e.g. requires_action and run.done)
    stream.on("event", (event) => {
      if (event.event === "thread.run.requires_action")
        handleRequiresAction(event);
      if (event.event === "thread.run.completed") handleRunCompleted();
    });
  };

  /*
    =======================
    === Utility Helpers ===
    =======================
  */

  const appendToLastMessage = (text) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
        text: lastMessage.text + text,
      };
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  const appendMessage = (role, text) => {
    setMessages((prevMessages) => [...prevMessages, { role, text }]);
  };

  const annotateLastMessage = (annotations) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
      };
      annotations.forEach((annotation) => {
        if (annotation.type === 'file_path') {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      })
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });

  }

  return (
      <>
        {/* Overlay */}
        <div
          className={`fixed inset-0 pb-2 bg-black bg-opacity-50 transition-opacity duration-300 ${
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
        ></div>

        {/* Drawer */}
        <div
          className={`fixed top-0 right-0 h-full border-black border-[1px] bg-white transform ${
            isOpen ? 'translate-x-0' : 'translate-x-full'
          } transition-transform duration-300 ease-in-out w-5/6 sm:w-4/6 md:w-1/3 shadow-[-1px_1px_rgba(0,0,0),-2px_2px_rgba(0,0,0),-3px_3px_rgba(0,0,0),-4px_4px_rgba(0,0,0),-5px_5px_0px_0px_rgba(0,0,0)]`}
        >
          <div className="p-1 sm:p-4">
            <div className="flex align-middle justify-between p-2 sm:p-1">
              <div className="flex justify-start">
                <p className="text-gray-700 hover:text-gray-900 text-lg">
                  What do you want to make today?
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  className="text-gray-700 hover:text-gray-900 text-xl font-bold"
                  onClick={onClose}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-6 sm:mt-4">
              <div className="flex flex-col-reverse l w-full relative mb-2">
                <div className="flex-grow overflow-y-auto scrollbar p-2 sm:p-4 flex flex-col order-2 whitespace-pre-wrap max-h-[calc(100vh-150px)]">
                  {messages.map((msg, index) => (
                    <Message key={index} role={msg.role} text={msg.text} />
                  ))}
                  {/* {isLoading && (!messages || messages.length === 0) && <Loadin gDots />} */}
                  {isLoading && <LoadingDots />}
                  <div ref={messagesEndRef} />
                </div>
                <form
                  onSubmit={handleSubmit}
                  className={`flex w-full p-2 md:p-4 pb-5 ${
                    messages.length === 0
                      ? 'absolute top-2/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
                      : ''
                  }`}
                >
                  <input
                    type="text"
                    className="flex-grow p-4 md:p-2 mr-2 md:mr-4 rounded border-2 border-black focus:outline-none focus:border-black focus:bg-white text-base bg-gray-100"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Describe what you want to learn, build or achieve"
                  />
                  <button
                    type="submit"
                    className="p-2 md:p-4 bg-black text-white border-none text-base rounded disabled:bg-gray-300"
                    disabled={inputDisabled}
                  >
                    Ask
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </>
  );
};

export default Chat;
