"use client";

import React, { useState, useEffect, useRef, useCallback} from "react";
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
            {text}
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
};

const Chat = ({
  functionCallHandler = () => Promise.resolve(""), // default to return empty string
}: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    console.log("Key pressed:", e.key);
    // Ignore if the target is already an input or textarea
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    // Ignore modifier keys
    if (e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }

    // Focus the input if it's a printable character
    if (e.key.length === 1) {
      e.preventDefault();
      inputRef.current?.focus();
      setUserInput(prev => prev + e.key); // Add the pressed key to the input
      console.log("Input focused and key added"); // Debugging line
    }
  }, []);

  useEffect(() => {
    console.log("Adding event listener"); // Debugging line
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      console.log("Removing event listener"); // Debugging line
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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
      const res = await fetch(`/api/assistants/threads`, {
        method: "POST",
      });
      const data = await res.json();
      setThreadId(data.threadId);
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
    <div className="flex flex-col-reverse h-full w-full relative">
      <div className="flex-grow overflow-y-auto scrollbar p-2 md:p-4 flex flex-col order-2 whitespace-pre-wrap max-h-[calc(100vh-150px)]">
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} />
        ))}
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
          ref={inputRef}
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
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
