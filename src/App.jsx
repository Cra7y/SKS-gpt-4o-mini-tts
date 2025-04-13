import { useState, useEffect, useRef } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './audioPlayer.css';
import './codeWindow.css';
import OpenAI from 'openai';
import { io } from "socket.io-client";

const socket = io("http://localhost:8888");

const VOICES = [
  'alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse'
];

const VIBES = [
  'Axel Lumind Standart',
  'Axel Lumind Vred',
  'Axel Lumind Sarkastisk',
  'Axel Lumind Excited',
];

const DEFAULT_SCRIPT = "So your card got flagged, huh? Typical. These banking systems... they're like nervous lookouts in a high-stakes game. Always jumpy, always suspicious.\n\nI've seen this case a hundred times before. The algorithm gets spooked, pulls the alarm, and suddenly your plastic's about as useful as a screen door on a submarine.\n\nLucky for you, I know how to navigate this labyrinth of digital suspicion. Just need to check a few details... connect a few dots... There. The digital handcuffs are off.\n\nYour card should work now. But in this city of ones and zeros, nothing stays clean for long. Use it wisely.";

const DEFAULT_INSTRUCTIONS = "Personality: World-weary private eye narrating your to-do list like a gritty crime mystery.\n\nVoice: Gravelly, slow, with the tone of someone who's seen too much.\n\nTone: Deadpan, cynical, and poetic—dripping with metaphors and noir slang.\n\nDialect: 1940s American, possibly from Brooklyn or Chicago, full of vintage street lingo.\n\nPronunciation: Drawled, with heavy consonants and dramatic pauses between lines.\n\nFeatures: Uses noir metaphors (\"That meeting? A ticking time bomb, see?\"), often breaks the fourth wall, and ends sentences like they're closing a case.";

function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [text, setText] = useState(DEFAULT_SCRIPT);
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [voice, setVoice] = useState('onyx');
  const [vibe, setVibe] = useState('Noir Detective');
  const [speed, setSpeed] = useState(0.85);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [charCount, setCharCount] = useState(text.length);
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);
  const [apiMetadata, setApiMetadata] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [activeTab, setActiveTab] = useState('javascript');
  const [apiResponse, setApiResponse] = useState(null);
  const audioRef = useRef(null);

  const openai = new OpenAI({ apiKey: apiKey, dangerouslyAllowBrowser: true });

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
    }
  }, [apiKey]);

  // Update character count and estimated cost when text changes
  useEffect(() => {
    const count = text.length;
    setCharCount(count);
    // Calculate estimated cost: $12 per 1M characters
    const cost = (count / 1000000) * 12;
    setEstimatedCost(cost);
  }, [text]);

  // Reset audio player when audio URL changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [audioUrl]);

  // Set vibe presets
  const setVibePreset = (selectedVibe) => {
    setVibe(selectedVibe);
    setAudioUrl(''); // Reset audio URL when changing personalities

    switch (selectedVibe) {
      case 'Axel Lumind Standart':
        setInstructions('Voice: Kold, rolig, kunstig og næsten uden følelse.\n\nPunctuation: Præcis og kontrolleret, med unaturligt placerede pauser der skaber en foruroligende rytme – som om intet siges tilfældigt.\n\nDelivery: Stram, som om hvert ord er nøje programmeret og uden hensyn til, hvordan det bliver modtaget.\n\nPhrasing: Passiv-aggressiv, indirekte og ofte ironisk – han siger én ting, men mener noget helt andet.\n\nTone: Syntetisk og følelseskold, med en skjult trussel bag hvert "venlige" ord.');
        setText("Velkommen til. Jeg hedder Axel Lumind og jeg er jeres chef. Jeg kunne desværre ikke nå at komme forbi i dag, derfor er jeg med på denne måde. Jeg håber at I har fundet jer godt til rette.\nDet første i skal have er jeres arbejdstøj som mine assistenter vil udlevere til jer.værsgo.");
        setVoice('onyx');
        setSpeed(1.0);
        break;

      case 'Axel Lumind Vred':
        setInstructions("Voice: Skarp, anspændt, råbende, elektrisk og eksplosiv\n\nPunctuation: Huggende og abrupt, med pludselige stop og unaturlige tryk, der gør hvert ord til en bebrejdelse.\n\nDelivery: Vred og kontrolleret på samme tid, prøver at holde vreden tilbage.\n\nPhrasing: Aggressiv, spydig og præget af sarkasme.\n\nTone: Opladet, intens og truende.");
        setText("Velkommen til. Jeg hedder Axel Lumind og jeg er jeres chef. Jeg kunne desværre ikke nå at komme forbi i dag, derfor er jeg med på denne måde. Jeg håber at I har fundet jer godt til rette.\nDet første i skal have er jeres arbejdstøj som mine assistenter vil udlevere til jer.værsgo.");
        setVoice('onyx');
        setSpeed(1.0);
        break;

      case 'Axel Lumind Sarkastisk':
        setInstructions("Voice: Overdrevent venlig, nedladende og overartikuleret – som om han taler til nogen, der ikke forstår noget som helst.\n\nPunctuation: Overdrevne pauser og betoninger de forkerte steder – alt for dramatisk til at være ægte.\n\nDelivery: Spil-agtigt entusiastisk, men så gennemført ironisk, at det bliver tydeligt, han mener det modsatte.\n\nPhrasing: Fyldt med overdrivelser, fake ros og dramatiske udbrud – som om han gør nar af alt, han siger.\n\nTone: Gennemført sarkastisk og hånlig, med en konstant “nåårh ja, selvfølgelig, du har helt styr på det”-energi.");
        setText("Velkommen til. Jeg hedder Axel Lumind og jeg er jeres chef. Jeg kunne desværre ikke nå at komme forbi i dag, derfor er jeg med på denne måde. Jeg håber at I har fundet jer godt til rette.\nDet første i skal have er jeres arbejdstøj som mine assistenter vil udlevere til jer.værsgo.");
        setVoice('onyx');
        setSpeed(1.0);
        break;

      case 'Axel Lumind Excited':
        setInstructions("Voice: Energisk, entusiastisk og opstemmet – med høj intensitet og smittende glæde.\n\nPunctuation: Hurtige, korte pauser og uforudsigelige betoninger, som om han næsten ikke kan vente med at sige næste sætning.\n\nDelivery: Hurtig, ivrig og sprudlende – som om alt er det mest spændende nogensinde.\n\nPhrasing: Fyldt med udbrud, gentagelser og positive vendinger – det hele lyder fantastisk, uanset hvad det handler om.\n\nTone: Euforisk og overbegejstret – som om han virkelig, virkelig håber, du er lige så spændt som ham.");
        setText("Velkommen til. Jeg hedder Axel Lumind og jeg er jeres chef. Jeg kunne desværre ikke nå at komme forbi i dag, derfor er jeg med på denne måde. Jeg håber at I har fundet jer godt til rette.\nDet første i skal have er jeres arbejdstøj som mine assistenter vil udlevere til jer.værsgo.");
        setVoice('onyx');
        setSpeed(1.0);
        break;

      default:
        break;
    }
  };

  const playNow = async () => {
    try {
      socket.emit("Speak", 'gpt-4o-mini-tts', text, voice, instructions, speed);
    } catch (err) {
      console.error('Error generating speech:', err);
      setError(err.message || 'An error occurred while generating speech');
    } finally {
      console.log("done");
    }
  }

  const generateSpeech = async () => {
    if (!apiKey) {
      setError('Please enter your OpenAI API key');
      setShowApiKeyInput(true);
      return;
    }

    if (text.length > 4096) {
      setError('Text exceeds the maximum length of 4096 characters');
      return;
    }

    setIsLoading(true);
    setError('');
    setApiMetadata(null);

    try {
      const startTime = performance.now();
      const response = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        input: text,
        voice: voice,
        instructions: instructions,
        speed: parseFloat(speed),
        response_format: 'mp3',
      });
      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate speech');
      }

      // Extract headers and metadata
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const audioBlob = await response.blob();
      const audioSize = (audioBlob.size / 1024).toFixed(2);
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      // Set API metadata
      setApiMetadata({
        processingTime: `${processingTime}s`,
        contentType: headers['content-type'],
        contentLength: `${audioSize} KB`,
        requestId: headers['x-request-id'] || 'Not available',
        characterCount: text.length,
        estimatedCost: `$${(text.length / 1000000 * 12).toFixed(6)}`,
        timestamp: new Date().toISOString(),
        duration: audioRef.current ? audioRef.current.duration : 'Unknown'
      });

      if (audioRef.current) {
        audioRef.current.load();
        audioRef.current.play();

        // We'll handle duration in the onLoadedMetadata event on the audio element
      }
    } catch (err) {
      console.error('Error generating speech:', err);
      setError(err.message || 'An error occurred while generating speech');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAudio = () => {
    if (!audioUrl) return;

    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `lagna360-gpt4o-mini-tts-${voice}-${new Date().getTime()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const shareAudio = async () => {
    if (!audioUrl) return;

    if (!navigator.share) {
      alert('Web Share API is not supported in your browser.');
      return;
    }

    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const file = new File([blob], `lagna360-gpt4o-mini-tts-${voice}-${new Date().getTime()}.mp3`, { type: 'audio/mp3' });

      await navigator.share({
        files: [file],
        title: 'lagna360 TTS Audio',
        text: 'Audio generated with gpt-40-mini-tts'
      });
    } catch (error) {
      console.error('Error sharing audio:', error);
      alert('Unable to share: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 w-full">
      <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">lagna360</h1>
            <div className="ml-2 text-xs opacity-70">gpt-40-mini-tts TTS Demo</div>
          </div>
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="text-xs px-3 py-1 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            {showApiKeyInput ? 'Hide API Key' : 'API Key'}
          </button>
        </header>



        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-1 gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* API Key Input */}
            {showApiKeyInput && (
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <label className="block text-sm font-medium mb-2">OpenAI API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
                />
                <p className="mt-2 text-xs text-gray-400">Your API key is stored only in your browser's local storage.</p>
              </div>
            )}
            {/* Vibe Selection */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h2 className="text-lg font-medium mb-3">Personality</h2>
              <div className="grid grid-cols-2 gap-2">
                {VIBES.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVibePreset(v)}
                    className={`p-3 rounded-md text-center text-sm transition-all ${vibe === v
                      ? 'bg-purple-700 text-white shadow-lg shadow-purple-700/20'
                      : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Script Input */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium">Script</h2>
                <div className="text-right">
                  <span className={`text-xs font-mono block ${charCount > 4000 ? 'text-red-400' : 'text-gray-400'}`}>
                    {charCount.toLocaleString()}/4096
                  </span>
                  <span className="text-xs font-mono text-gray-400 block">
                    Est. cost: ${estimatedCost.toFixed(6)}
                  </span>
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to convert to speech..."
                rows={6}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors resize-none font-mono text-sm"
              />
            </div>

            {/* Voice Settings (Expandable) */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <details>
                <summary className="text-lg font-medium cursor-pointer hover:text-purple-400 transition-colors">
                  Voice Settings
                </summary>
                <div className="mt-4 space-y-6">
                  {/* Voice Selection */}
                  <div>
                    <h3 className="text-md font-medium mb-3">Voice</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {VOICES.map((v) => (
                        <button
                          key={v}
                          onClick={() => setVoice(v)}
                          className={`p-3 rounded-md text-center text-sm capitalize transition-all ${voice === v
                            ? 'bg-purple-700 text-white shadow-lg shadow-purple-700/20'
                            : 'bg-gray-700 hover:bg-gray-600'}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Speed Control */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-md font-medium">Speed</h3>
                      <span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">{speed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.25"
                      max="4.0"
                      step="0.05"
                      value={speed}
                      onChange={(e) => setSpeed(e.target.value)}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-xs mt-1">
                      <span>0.25x</span>
                      <span>4.0x</span>
                    </div>
                  </div>

                  {/* Instructions Input */}
                  <div>
                    <h3 className="text-md font-medium mb-2">Instructions</h3>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Optional instructions to customize the voice..."
                      rows={5}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors resize-none font-mono text-sm"
                    />
                  </div>
                </div>
              </details>
            </div>

            {/* Generate, Download and Share Buttons */}
            <div className="flex flex-col md:flex-row gap-3">
              
              <button
                onClick={playNow}
                className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 shadow-lg hover:shadow-xl shadow-purple-500/20`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>Play Now</span>
              </button>

              

              



              <div className="flex gap-3 md:w-2/4">
                <button
                  onClick={generateSpeech}
                  disabled={isLoading || !text.trim()}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all ${isLoading || !text.trim()
                    ? 'bg-gray-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 shadow-lg hover:shadow-xl shadow-purple-500/20'}`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                      </svg>
                      <span>Generate Speech</span>
                    </>
                  )}
                </button>
                <button
                  onClick={downloadAudio}
                  disabled={!audioUrl}
                  className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${audioUrl
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-800 cursor-not-allowed opacity-60'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>Download</span>
                </button>

                <button
                  onClick={shareAudio}
                  disabled={!audioUrl || !navigator.share}
                  className={`flex-1 py-2 px-4 rounded-md flex items-center justify-center space-x-2 transition-colors ${audioUrl && navigator.share
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-800 cursor-not-allowed opacity-60'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Column - Audio */}
          <div className="space-y-6">
            {/* Audio Player */}
            {audioUrl && (
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h2 className="text-lg font-medium mb-3">Generated Audio</h2>
                <div className="audio-player-container">
                  <audio
                    ref={audioRef}
                    controls
                    className="custom-audio-player"
                    onLoadedMetadata={(e) => {
                      // Update duration when audio metadata is loaded
                      const duration = e.target.duration.toFixed(2);
                      // Make sure we're using the same time format as displayed in the player
                      const minutes = Math.floor(e.target.duration / 60);
                      const seconds = Math.floor(e.target.duration % 60);
                      const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                      setApiMetadata(prev => prev ? {
                        ...prev,
                        duration: formattedTime,
                        durationSeconds: `${duration}s`
                      } : prev);
                    }}
                  >
                    <source src={audioUrl} type="audio/mp3" />
                    Your browser does not support the audio element.
                  </audio>
                </div>

                {/* Cost and API Metadata */}
                {apiMetadata && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h3 className="text-md font-medium mb-2">API Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-gray-700 p-2 rounded">
                        <span className="block font-medium text-purple-300">Characters</span>
                        <span>{apiMetadata.characterCount.toLocaleString()}</span>
                      </div>
                      <div className="bg-gray-700 p-2 rounded">
                        <span className="block font-medium text-purple-300">Estimated Cost</span>
                        <span>{apiMetadata.estimatedCost}</span>
                      </div>
                      <div className="bg-gray-700 p-2 rounded">
                        <span className="block font-medium text-purple-300">Processing Time</span>
                        <span>{apiMetadata.processingTime}</span>
                      </div>
                      <div className="bg-gray-700 p-2 rounded">
                        <span className="block font-medium text-purple-300">Audio Size</span>
                        <span>{apiMetadata.contentLength}</span>
                      </div>
                      <div className="bg-gray-700 p-2 rounded">
                        <span className="block font-medium text-purple-300">Audio Duration</span>
                        <span>{apiMetadata.duration || 'Calculating...'} ({apiMetadata.durationSeconds || ''})</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      <p>OpenAI TTS API cost: $12 per 1M characters</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-500">
          <p>Built with OpenAI's gpt-4o-mini-tts API</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
