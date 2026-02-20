/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MultimodalLiveAPIClientConnection,
  MultimodalLiveClient,
} from "../lib/multimodal-live-client";
import { LiveConfig } from "../multimodal-live-types";
import { AudioStreamer } from "../lib/audio-streamer";
import { audioContext, isAudioWorkletSupported } from "../lib/utils";
import VolMeterWorket from "../lib/worklets/vol-meter";

export type UseLiveAPIResults = {
  client: MultimodalLiveClient;
  setConfig: (config: LiveConfig) => void;
  config: LiveConfig;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  volume: number;
};

export function useLiveAPI({
  url,
  apiKey,
}: MultimodalLiveAPIClientConnection): UseLiveAPIResults {
  const client = useMemo(
    () => new MultimodalLiveClient({ url, apiKey }),
    [url, apiKey],
  );
  const audioStreamerRef = useRef<AudioStreamer | null>(null);

  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<LiveConfig>({
    model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
    generationConfig: {
      responseModalities: "audio",
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
      },
    },
  });
  const [volume, setVolume] = useState(0);

  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: "audio-out" }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        // Only register the VU‑meter worklet when supported;
        // playback itself does not require AudioWorklet.
        if (isAudioWorkletSupported()) {
          audioStreamerRef.current
            .addWorklet<any>("vumeter-out", VolMeterWorket, (ev: any) => {
              setVolume(ev.data.volume);
            })
            .then(() => {
              // Successfully added worklet
            })
            .catch((err) => {
              console.warn(
                "[useLiveAPI] Failed to add vumeter AudioWorklet; continuing without volume meter.",
                err,
              );
            });
        }
      });
    }
  }, [audioStreamerRef]);

  useEffect(() => {
    const onClose = () => {
      setConnected(false);
    };

    const stopAudioStreamer = () => audioStreamerRef.current?.stop();

    const onAudio = (data: ArrayBuffer) =>
      audioStreamerRef.current?.addPCM16(new Uint8Array(data));

    client
      .on("close", onClose)
      .on("interrupted", stopAudioStreamer)
      .on("audio", onAudio);

    return () => {
      client
        .off("close", onClose)
        .off("interrupted", stopAudioStreamer)
        .off("audio", onAudio);
    };
  }, [client]);

  const connect = useCallback(async () => {
    console.log("🔧 [CONNECT] Connecting with config:", config);
    console.log("🔧 [CONNECT] Config tools:", JSON.stringify(config.tools, null, 2));
    if (!config) {
      throw new Error("config has not been set");
    }
    client.disconnect();
    
    // Wait for both WebSocket connection AND setupComplete before marking as connected
    // This ensures the server is ready to receive audio before we start sending
    // This fixes the bug where first user response isn't registered
    let setupCompleteResolved = false;
    const setupCompletePromise = new Promise<void>((resolve) => {
      const onSetupComplete = () => {
        setupCompleteResolved = true;
        console.log("✅ [CONNECT] setupComplete received, connection is ready");
        client.off("setupcomplete", onSetupComplete);
        resolve();
      };
      // Register listener BEFORE connecting to catch setupComplete if it fires quickly
      client.on("setupcomplete", onSetupComplete);
    });
    
    console.log("🔧 [CONNECT] Calling client.connect()...");
    await client.connect(config);
    console.log("🔧 [CONNECT] WebSocket opened, waiting for setupComplete...");
    
    // Wait for setupComplete with a timeout to prevent hanging
    // If setupComplete already fired, the promise resolves immediately
    await Promise.race([
      setupCompletePromise,
      new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!setupCompleteResolved) {
            console.warn("⚠️ [CONNECT] setupComplete not received within 5 seconds, proceeding anyway");
            resolve();
          }
        }, 5000);
      }),
    ]);
    
    console.log("✅ [CONNECT] Connection fully ready, setting connected=true");
    setConnected(true);
  }, [client, setConnected, config]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    connected,
    connect,
    disconnect,
    volume,
  };
}
