// Modified src/App.tsx

import { useRef, useState, Suspense, lazy } from "react";
import "./App.scss";
import { LiveAPIProvider } from "./contexts/LiveAPIContext";
import ControlTray from "./components/control-tray/ControlTray";
import InterviewEvaluation from "./components/interview-evaluation/interview-system/interview-system";
import { RiSidebarUnfoldLine } from "react-icons/ri";

// Lazy load SidePanel component
const SidePanel = lazy(() => import("./components/side-panel/SidePanel"));

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY as string;
if (typeof API_KEY !== "string") {
  throw new Error("set REACT_APP_GEMINI_API_KEY in .env");
}

const host = "generativelanguage.googleapis.com";
const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showSidePanel, setShowSidePanel] = useState(false);

  return (
    <div className="App">
      <LiveAPIProvider url={uri} apiKey={API_KEY}>
        <div className="streaming-console">
          {/* Toggle button - always visible */}
          {!showSidePanel && (
            <button
              className="side-panel-toggle-button"
              onClick={() => setShowSidePanel(true)}
              aria-label="Open console panel"
            >
              <RiSidebarUnfoldLine color="#b4b8bb" />
            </button>
          )}
          
          {/* Lazy loaded SidePanel - only rendered when showSidePanel is true */}
          {showSidePanel && (
            <Suspense fallback={<div className="side-panel-loading">Loading console...</div>}>
              <SidePanel onClose={() => setShowSidePanel(false)} />
            </Suspense>
          )}
          
          <main>
            <div className="main-app-area">
              <InterviewEvaluation />
            </div>

            <ControlTray
              videoRef={videoRef}
              supportsVideo={false}
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
