// Modified src/App.tsx

import { useRef, useState } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import SidePanel from "./components/side-panel/SidePanel";
import { Altair } from "./components/altair/Altair";
import ControlTray from "./components/control-tray/ControlTray";
import InterviewEvaluation from "./components/interview-evaluation/interview-system/interview-system";
import cn from "classnames";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [activeTab, setActiveTab] = useState<"interview" | "evaluation">(
    "interview"
  );

  return (
    <div className="App">
      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <div className="streaming-console">
          <SidePanel />
          <main>
            <div className="tab-selector">
              <button
                className={cn("tab-button", {
                  active: activeTab === "interview",
                })}
                onClick={() => setActiveTab("interview")}
              >
                Video
              </button>
              <button
                className={cn("tab-button", {
                  active: activeTab === "evaluation",
                })}
                onClick={() => setActiveTab("evaluation")}
              >
                Interview
              </button>
            </div>

            <div className="main-app-area">
              {activeTab === "interview" ? (
                <>
                  <Altair />
                  <video
                    className={cn("stream", {
                      hidden: !videoRef.current || !videoStream,
                    })}
                    ref={videoRef}
                    autoPlay
                    playsInline
                  />
                </>
              ) : (
                <InterviewEvaluation />
              )}
            </div>

            <ControlTray
              videoRef={videoRef}
              supportsVideo={true}
              onVideoStreamChange={setVideoStream}
            >
              {/* put your own buttons here */}
            </ControlTray>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
