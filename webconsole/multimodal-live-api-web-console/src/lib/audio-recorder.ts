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

import { audioContext, isAudioWorkletSupported } from "./utils";
import AudioRecordingWorklet from "./worklets/audio-processing";
import VolMeterWorket from "./worklets/vol-meter";

import { createWorketFromSrc } from "./audioworklet-registry";
import EventEmitter from "eventemitter3";

function arrayBufferToBase64(buffer: ArrayBuffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export class AudioRecorder extends EventEmitter {
  stream: MediaStream | undefined;
  audioContext: AudioContext | undefined;
  source: MediaStreamAudioSourceNode | undefined;
  recording: boolean = false;
  // Can be an AudioWorkletNode (modern browsers) or a ScriptProcessorNode (fallback)
  recordingWorklet: AudioNode | undefined;
  vuWorklet: AudioNode | undefined;

  private starting: Promise<void> | null = null;

  constructor(public sampleRate = 16000) {
    super();
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Could not request user media");
    }

    this.starting = new Promise(async (resolve, reject) => {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = await audioContext({ sampleRate: this.sampleRate });
        this.source = this.audioContext.createMediaStreamSource(this.stream);

        if (isAudioWorkletSupported()) {
          // High‑fidelity path: use AudioWorklet for recording + VU meter
          const workletName = "audio-recorder-worklet";
          const src = createWorketFromSrc(workletName, AudioRecordingWorklet);

          await this.audioContext.audioWorklet.addModule(src);
          this.recordingWorklet = new AudioWorkletNode(
            this.audioContext,
            workletName,
          );

          (this.recordingWorklet as AudioWorkletNode).port.onmessage = async (
            ev: MessageEvent,
          ) => {
            // worklet processes recording floats and messages converted buffer
            const arrayBuffer = ev.data.data.int16arrayBuffer;

            if (arrayBuffer) {
              const arrayBufferString = arrayBufferToBase64(arrayBuffer);
              this.emit("data", arrayBufferString);
            }
          };
          this.source.connect(this.recordingWorklet);

          // vu meter worklet
          const vuWorkletName = "vu-meter";
          await this.audioContext.audioWorklet.addModule(
            createWorketFromSrc(vuWorkletName, VolMeterWorket),
          );
          this.vuWorklet = new AudioWorkletNode(
            this.audioContext,
            vuWorkletName,
          );
          (this.vuWorklet as AudioWorkletNode).port.onmessage = (
            ev: MessageEvent,
          ) => {
            this.emit("volume", ev.data.volume);
          };

          this.source.connect(this.vuWorklet);
        } else {
          // Fallback path: use ScriptProcessorNode for recording + VU meter.
          // Note: ScriptProcessorNode is deprecated but widely supported,
          // including on older iOS Safari where AudioWorklet is unavailable.
          const bufferSize = 4096;
          const processor = this.audioContext.createScriptProcessor(
            bufferSize,
            1,
            1,
          );
          this.recordingWorklet = processor;

          processor.onaudioprocess = (event: AudioProcessingEvent) => {
            const input = event.inputBuffer.getChannelData(0);
            const len = input.length;
            if (!len) return;

            // Convert floats (-1..1) to PCM16
            const int16Buffer = new ArrayBuffer(len * 2);
            const view = new DataView(int16Buffer);
            let sumSquares = 0;
            for (let i = 0; i < len; i++) {
              let s = input[i];
              // clamp
              if (s > 1) s = 1;
              else if (s < -1) s = -1;
              const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
              view.setInt16(i * 2, int16, true);
              sumSquares += s * s;
            }

            const arrayBufferString = arrayBufferToBase64(int16Buffer);
            this.emit("data", arrayBufferString);

            // Simple RMS volume estimate for VU meter
            const rms = Math.sqrt(sumSquares / len);
            this.emit("volume", rms);
          };

          this.source.connect(processor);
          processor.connect(this.audioContext.destination);
        }

        this.recording = true;
        resolve();
      } catch (err) {
        this.starting = null;
        reject(err);
      }
      this.starting = null;
    });
  }

  stop() {
    // its plausible that stop would be called before start completes
    // such as if the websocket immediately hangs up
    const handleStop = () => {
      this.source?.disconnect();
      this.stream?.getTracks().forEach((track) => track.stop());
      this.stream = undefined;
      this.recordingWorklet = undefined;
      this.vuWorklet = undefined;
    };
    if (this.starting) {
      this.starting.then(handleStop);
      return;
    }
    handleStop();
  }
}
