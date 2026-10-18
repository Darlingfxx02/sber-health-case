import { useCallback, useEffect, useRef, useState } from "react";
import { makeChats, demoReply } from "../data.js";

const initialChat = () =>
  makeChats().find((chat) => chat.id === "chat-current");

// The prototype has one available conversation. Pending replies belong to it and
// are cancelled when the case restores a scene or the user resets the prototype.
export function useChat() {
  const [chat, setChat] = useState(initialChat);
  const timers = useRef(new Set());
  const cancelReplies = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);
  useEffect(() => cancelReplies, [cancelReplies]);
  const update = useCallback(
    (patch) => setChat((chat) => ({ ...chat, ...patch })),
    [],
  );
  function sendMessage(value) {
    const prompt = value.trim();
    if (!prompt) return false;
    const contexts = chat.contexts.map((item) => ({ ...item }));
    setChat((chat) => ({
      ...chat,
      messages: [...chat.messages, { role: "user", text: prompt, contexts }],
      draft: "",
      pending: chat.pending + 1,
    }));
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      setChat((chat) => ({
        ...chat,
        pending: Math.max(0, chat.pending - 1),
        messages: [
          ...chat.messages,
          { role: "assistant", text: demoReply(prompt, contexts) },
        ],
      }));
    }, 650);
    timers.current.add(timer);
    return true;
  }
  function restore(state, metric) {
    cancelReplies();
    const next = {
      ...initialChat(),
      messages: [],
      contexts: [],
      draft: "",
      pending: 0,
    };
    if (state === "chat-context")
      next.contexts = [
        { ...metric, title: "Пульс · 15 октября", meta: "Выбранный день" },
      ];
    if (state === "chat-answer")
      next.messages = [
        {
          role: "user",
          text: "Помоги подготовить вопросы о пульсе",
          contexts: [],
        },
        {
          role: "assistant",
          text: "Соберём вопросы для обсуждения: как менялся пульс, что происходило в это время и какие измерения стоит показать врачу.",
        },
      ];
    setChat(next);
  }
  return {
    chat,
    sendMessage,
    restore,
    reset() {
      cancelReplies();
      setChat(initialChat());
    },
    setDraft: (draft) => update({ draft }),
    removeContext: (id) =>
      setChat((chat) => ({
        ...chat,
        contexts: chat.contexts.filter((item) => item.id !== id),
      })),
    clearContext: () => update({ contexts: [] }),
  };
}
