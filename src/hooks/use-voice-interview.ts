/**
 * Hook for managing voice-based interview interactions with Gemini Live API
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useLiveAPIContext } from "../contexts/LiveAPIContext";
import { Part } from "@google/generative-ai";
import { ServerContent, isModelTurn } from "../multimodal-live-types";

export interface UseVoiceInterviewResult {
  isListening: boolean;
  transcription: string;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  clearTranscription: () => void;
}

export function useVoiceInterview(): UseVoiceInterviewResult {
  const { client, connected, setConfig, connect, disconnect } = useLiveAPIContext();
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const transcriptionRef = useRef<string>("");
  const isSpeakingRef = useRef<boolean>(false);

  // Listen for content (text responses) from Gemini
  useEffect(() => {
    const onContent = (data: ServerContent) => {
      // Only process ModelTurn events (actual content)
      if (isModelTurn(data)) {
        // Extract text from model response
        const textParts = data.modelTurn.parts
          .filter((part: Part) => part.text)
          .map((part: Part) => part.text)
          .join(" ");

        if (textParts) {
          // If we're listening, this is likely a transcription of user's speech
          if (isListening) {
            setTranscription((prev) => {
              const newTranscription = prev + " " + textParts;
              transcriptionRef.current = newTranscription;
              return newTranscription;
            });
          }
        }
      }
    };

    const onTurnComplete = () => {
      // Turn complete - model finished speaking
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    };

    const onInterrupted = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    };

    if (client) {
      client.on("content", onContent);
      client.on("turncomplete", onTurnComplete);
      client.on("interrupted", onInterrupted);

      return () => {
        client.off("content", onContent);
        client.off("turncomplete", onTurnComplete);
        client.off("interrupted", onInterrupted);
      };
    }
  }, [client, isListening]);

  // Configure Gemini for interview mode
  useEffect(() => {
    if (connected) {
      setConfig({
        model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
        generationConfig: {
          responseModalities: "audio",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: `You are a helpful interview assistant. Your role is to:
1. Read questions clearly when asked
2. Listen to candidate answers and provide brief acknowledgments
3. Be concise and professional
4. Only speak when spoken to or when reading a question

When the user says "read question" or similar, read the question text provided.
When listening to answers, you may provide brief acknowledgments like "I understand" or "Thank you" but keep them minimal.`,
            },
          ],
        },
      });
    }
  }, [connected, setConfig]);

  const startListening = useCallback(() => {
    if (!connected) {
      // Connect first, then start listening
      // The connection will trigger audio recorder setup in ControlTray
      connect()
        .then(() => {
          // Wait for audio worklet to be initialized
          // The AudioRecorder in ControlTray will handle this
          setTimeout(() => {
            setIsListening(true);
          }, 1000);
        })
        .catch((err) => {
          console.error("Failed to connect for voice:", err);
        });
    } else {
      // Even if connected, wait a bit to ensure audio is ready
      setTimeout(() => {
        setIsListening(true);
      }, 300);
    }
  }, [connected, connect]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    // Send a turn complete signal to indicate we're done speaking
    if (client && connected && client.ws && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.send([{ text: "" }], true);
      } catch (err) {
        console.error("Failed to send stop signal:", err);
      }
    }
  }, [client, connected]);

  const speak = useCallback(
    async (text: string) => {
      try {
        // Ensure we're connected first
        if (!connected) {
          await connect();
          // Wait a bit for WebSocket to be fully ready
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Double-check client is available and connected
        if (!client || !client.ws || client.ws.readyState !== WebSocket.OPEN) {
          console.warn("Client not ready, waiting...");
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try connecting again if still not ready
          if (!connected) {
            await connect();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Now send the message
        if (client && client.ws && client.ws.readyState === WebSocket.OPEN) {
          setIsSpeaking(true);
          isSpeakingRef.current = true;
          client.send([{ text }], true);
        } else {
          console.error("Cannot send message: WebSocket not connected");
        }
      } catch (err) {
        console.error("Failed to speak:", err);
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      }
    },
    [client, connected, connect]
  );

  const clearTranscription = useCallback(() => {
    setTranscription("");
    transcriptionRef.current = "";
  }, []);

  return {
    isListening,
    transcription,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    clearTranscription,
  };
}

