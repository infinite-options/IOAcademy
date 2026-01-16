// /**
//  * OpenAI Live API Client
//  * Maintains compatibility with MultimodalLiveClient interface
//  */

// import { EventEmitter } from "eventemitter3";
// import OpenAI from "openai";
// import {
//   GenerativeContentBlob,
//   Part,
//   ServerContent,
//   StreamingLog,
//   ToolCall,
//   ToolCallCancellation,
//   LiveConfig,
//   ModelTurn,
//   TurnComplete,
//   Interrupted,
// } from "../multimodal-live-types";
// import { base64ToArrayBuffer } from "./utils";

// /**
//  * the events that this client will emit
//  */
// interface MultimodalLiveClientEventTypes {
//   open: () => void;
//   log: (log: StreamingLog) => void;
//   close: (event: CloseEvent) => void;
//   audio: (data: ArrayBuffer) => void;
//   content: (data: ServerContent) => void;
//   interrupted: () => void;
//   setupcomplete: () => void;
//   turncomplete: () => void;
//   toolcall: (toolCall: ToolCall) => void;
//   toolcallcancellation: (toolcallCancellation: ToolCallCancellation) => void;
// }

// export type MultimodalLiveAPIClientConnection = {
//   url?: string;
//   apiKey: string;
// };

// export class MultimodalLiveClient extends EventEmitter<MultimodalLiveClientEventTypes> {
//   public ws: WebSocket | null = null;
//   protected config: LiveConfig | null = null;
//   public url: string = "";
//   private openai: OpenAI;
//   private abortController: AbortController | null = null;
//   private conversationHistory: Array<{
//     role: "system" | "user" | "assistant";
//     content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
//   }> = [];
//   private pendingAudioChunks: string[] = [];
//   private audioTranscriptionInterval: number | null = null;
//   private isConnected: boolean = false;

//   public getConfig() {
//     return { ...this.config };
//   }

//   constructor({ url, apiKey }: MultimodalLiveAPIClientConnection) {
//     super();
//     this.openai = new OpenAI({
//       apiKey: apiKey,
//       dangerouslyAllowBrowser: true,
//     });
//     this.url = url || "";
//     this.send = this.send.bind(this);
//   }

//   log(type: string, message: StreamingLog["message"]) {
//     const log: StreamingLog = {
//       date: new Date(),
//       type,
//       message,
//     };
//     this.emit("log", log);
//   }

//   async connect(config: LiveConfig): Promise<boolean> {
//     this.config = config;
//     this.isConnected = true;

//     // Initialize conversation history with system instruction
//     if (config.systemInstruction?.parts) {
//       const systemText = config.systemInstruction.parts
//         .map((p: any) => (p.text ? p.text : ""))
//         .join("\n");
//       if (systemText) {
//         this.conversationHistory = [
//           { role: "system", content: systemText },
//         ];
//       }
//     }

//     this.log("client.open", "connected to OpenAI API");
//     this.emit("open");
//     this.emit("setupcomplete");

//     return Promise.resolve(true);
//   }

//   disconnect() {
//     if (this.abortController) {
//       this.abortController.abort();
//       this.abortController = null;
//     }
//     if (this.audioTranscriptionInterval) {
//       clearInterval(this.audioTranscriptionInterval);
//       this.audioTranscriptionInterval = null;
//     }
//     this.isConnected = false;
//     this.log("client.close", "Disconnected");
//     this.emit("close", new CloseEvent("close"));
//     return true;
//   }

//   /**
//    * Send realtime input (audio chunks)
//    * For OpenAI, we'll transcribe audio using Whisper API
//    */
//   async sendRealtimeInput(chunks: GenerativeContentBlob[]) {
//     for (const chunk of chunks) {
//       if (chunk.mimeType.includes("audio")) {
//         // Store audio chunks for transcription
//         this.pendingAudioChunks.push(chunk.data);
//         this.log(`client.realtimeInput`, "audio");
//       }
//     }

//     // Transcribe audio periodically
//     if (!this.audioTranscriptionInterval && this.pendingAudioChunks.length > 0) {
//       this.audioTranscriptionInterval = window.setInterval(async () => {
//         if (this.pendingAudioChunks.length > 0 && this.isConnected) {
//           await this.transcribeAndSendAudio();
//         }
//       }, 2000); // Transcribe every 2 seconds
//     }
//   }

//   private async transcribeAndSendAudio() {
//     if (this.pendingAudioChunks.length === 0) return;

//     try {
//       // Combine audio chunks
//       const audioBase64 = this.pendingAudioChunks.join("");
//       this.pendingAudioChunks = [];

//       // Convert base64 PCM16 to WAV format for Whisper
//       const audioBuffer = base64ToArrayBuffer(audioBase64);
      
//       // Create WAV file from PCM16 data (16kHz, 16-bit, mono)
//       const wavBuffer = this.pcm16ToWav(audioBuffer, 16000);
//       const audioBlob = new Blob([wavBuffer], { type: "audio/wav" });
//       const audioFile = new File([audioBlob], "audio.wav", { type: "audio/wav" });

//       // Transcribe using Whisper
//       const transcription = await this.openai.audio.transcriptions.create({
//         file: audioFile,
//         model: "whisper-1",
//       });

//       if (transcription.text) {
//         // Send transcribed text as a message
//         this.send([{ text: transcription.text }], false);
//       }
//     } catch (error) {
//       console.error("Audio transcription error:", error);
//       this.log("client.error", `Transcription failed: ${error}`);
//     }
//   }

//   private pcm16ToWav(pcmData: ArrayBuffer, sampleRate: number): ArrayBuffer {
//     const length = pcmData.byteLength;
//     const buffer = new ArrayBuffer(44 + length);
//     const view = new DataView(buffer);
//     const samples = new Int16Array(pcmData);

//     // WAV header
//     const writeString = (offset: number, string: string) => {
//       for (let i = 0; i < string.length; i++) {
//         view.setUint8(offset + i, string.charCodeAt(i));
//       }
//     };

//     writeString(0, "RIFF");
//     view.setUint32(4, 36 + length, true);
//     writeString(8, "WAVE");
//     writeString(12, "fmt ");
//     view.setUint32(16, 16, true); // fmt chunk size
//     view.setUint16(20, 1, true); // audio format (PCM)
//     view.setUint16(22, 1, true); // number of channels (mono)
//     view.setUint32(24, sampleRate, true);
//     view.setUint32(28, sampleRate * 2, true); // byte rate
//     view.setUint16(32, 2, true); // block align
//     view.setUint16(34, 16, true); // bits per sample
//     writeString(36, "data");
//     view.setUint32(40, length, true);

//     // Copy PCM data
//     const outputSamples = new Int16Array(buffer, 44);
//     outputSamples.set(samples);

//     return buffer;
//   }

//   /**
//    * Send a response to a function call
//    */
//   async sendToolResponse(toolResponse: { functionResponses: Array<{ response: object; id: string }> }) {
//     // For OpenAI, tool responses are handled in the streaming response
//     // We'll store them and include in the next request
//     this.log(`client.toolResponse`, toolResponse);
    
//     // Continue the conversation with tool responses
//     // This will be handled in the send method when we make the next request
//   }

//   /**
//    * Send normal content parts such as { text }
//    */
//   async send(parts: Part | Part[], turnComplete: boolean = true) {
//     parts = Array.isArray(parts) ? parts : [parts];
    
//     // Extract text from parts
//     const textParts = parts
//       .map((p: any) => p.text || "")
//       .filter((text: string) => text.length > 0)
//       .join("\n");

//     if (!textParts) {
//       return;
//     }

//     // Add user message to conversation history
//     this.conversationHistory.push({
//       role: "user",
//       content: textParts,
//     });

//     this.log(`client.send`, { text: textParts });

//     // Convert tools from Gemini format to OpenAI format
//     const openaiTools = this.config?.tools
//       ?.filter((tool: any) => tool.functionDeclarations)
//       .flatMap((tool: any) =>
//         tool.functionDeclarations.map((decl: any) => ({
//           type: "function" as const,
//           function: {
//             name: decl.name,
//             description: decl.description,
//             parameters: decl.parameters,
//           },
//         }))
//       ) || [];

//     try {
//       this.abortController = new AbortController();
      
//       // Check if we want audio output
//       const wantsAudio = this.config?.generationConfig?.responseModalities === "audio";
//       const voice = this.config?.generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName || "alloy";

//       // Make streaming request
//       const stream = await this.openai.chat.completions.create(
//         {
//           model: this.config?.model || "gpt-4o-mini",
//           messages: this.conversationHistory.map((msg) => ({
//             role: msg.role,
//             content: msg.content,
//           })) as any,
//           tools: openaiTools.length > 0 ? openaiTools : undefined,
//           stream: true,
//         },
//         { signal: this.abortController.signal }
//       );

//       let assistantMessage = "";
//       let toolCalls: any[] = [];

//       // Process stream
//       for await (const chunk of stream) {
//         const choice = chunk.choices[0];
//         if (!choice) continue;

//         // Handle text content
//         if (choice.delta?.content) {
//           assistantMessage += choice.delta.content;
          
//           // Emit content as it streams
//           const content: ModelTurn = {
//             modelTurn: {
//               parts: [{ text: choice.delta.content }],
//             },
//           };
//           this.emit("content", content);
//         }

//         // Handle tool calls
//         if (choice.delta?.tool_calls) {
//           for (const toolCall of choice.delta.tool_calls) {
//             const existingIndex = toolCalls.findIndex((tc) => tc.index === toolCall.index);
//             if (existingIndex >= 0) {
//               // Append to existing tool call
//               if (toolCall.function?.name) {
//                 toolCalls[existingIndex].function.name = toolCall.function.name;
//               }
//               if (toolCall.function?.arguments) {
//                 toolCalls[existingIndex].function.arguments += toolCall.function.arguments;
//               }
//             } else {
//               // New tool call
//               toolCalls.push({
//                 id: toolCall.id || `call_${toolCall.index}`,
//                 index: toolCall.index,
//                 function: {
//                   name: toolCall.function?.name || "",
//                   arguments: toolCall.function?.arguments || "",
//                 },
//               });
//             }
//           }
//         }

//         // Check if finished
//         if (choice.finish_reason === "stop" || choice.finish_reason === "tool_calls") {
//           // Emit tool calls if any
//           if (toolCalls.length > 0) {
//             const toolCall: ToolCall = {
//               functionCalls: toolCalls.map((tc) => ({
//                 id: tc.id,
//                 name: tc.function.name,
//                 args: JSON.parse(tc.function.arguments || "{}"),
//               })),
//             };
//             this.emit("toolcall", toolCall);
//           }

//           // Generate audio if requested
//           if (wantsAudio && assistantMessage) {
//             await this.generateAudio(assistantMessage, voice);
//           }

//           // Add assistant message to history
//           if (assistantMessage) {
//             this.conversationHistory.push({
//               role: "assistant",
//               content: assistantMessage,
//             });
//           }

//           // Emit turn complete
//           const turnComplete: TurnComplete = { turnComplete: true };
//           this.emit("turncomplete");
//           this.emit("content", turnComplete);
//         }
//       }
//     } catch (error: any) {
//       if (error.name === "AbortError") {
//         this.emit("interrupted");
//         return;
//       }
//       console.error("OpenAI API error:", error);
//       this.log("client.error", `API error: ${error.message}`);
//     }
//   }

//   private async generateAudio(text: string, voice: string) {
//     try {
//       const mp3 = await this.openai.audio.speech.create({
//         model: "tts-1",
//         voice: voice as any,
//         input: text,
//       });

//       const arrayBuffer = await mp3.arrayBuffer();
//       this.emit("audio", arrayBuffer);
//       this.log(`server.audio`, `buffer (${arrayBuffer.byteLength})`);
//     } catch (error) {
//       console.error("TTS error:", error);
//       this.log("client.error", `TTS failed: ${error}`);
//     }
//   }

//   /**
//    * Used internally to send all messages
//    * Not used for OpenAI (REST API)
//    */
//   _sendDirect(request: object) {
//     // Not applicable for OpenAI REST API
//     console.warn("_sendDirect called but OpenAI uses REST API, not WebSocket");
//   }
// }

