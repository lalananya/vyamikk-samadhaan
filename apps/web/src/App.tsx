import React, { useState } from "react";
import IntroLogoWeb from "./components/IntroLogoWeb";

function App() {
  const [showIntro, setShowIntro] = useState(true);

  const handleIntroDone = () => {
    setShowIntro(false);
  };

  if (showIntro) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative">
        <button
          onClick={handleIntroDone}
          className="absolute top-8 right-8 text-white text-lg font-medium px-4 py-2 hover:bg-white/10 rounded transition-colors"
        >
          Skip
        </button>
        <IntroLogoWeb
          autoplay
          durationMs={3000}
          onDone={handleIntroDone}
          size={400}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Vyamikk Samadhaan
        </h1>
        <p className="text-gray-600 mb-8">
          India's trusted platform for professionals and organisations.
        </p>
        <button
          onClick={() => setShowIntro(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Show Intro Again
        </button>
      </div>
    </div>
  );
}

export default App;
