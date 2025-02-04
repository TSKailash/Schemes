import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Volume2, Loader2, Bot, User, X, Pause, Play, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
const ChatMessage = ({ message, isLast, onSpeak, isSpeaking, onPause }) => {
  const isBot = message.type === 'bot';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div className={`flex max-w-[80%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex items-start space-x-2 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className={`p-2 rounded-full ${isBot ? 'bg-purple-500' : 'bg-blue-500'}`}>
            {isBot ? <Bot className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
          </div>
          <div className={`p-4 rounded-2xl ${isBot ? 'bg-gray-100' : 'bg-blue-500 text-white'}`}>
            <p className="text-sm whitespace-pre-wrap">{message.text}</p>
            {message.applicationLink && (
              <a
                href={message.applicationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 mt-2 text-purple-500 hover:text-purple-700"
              >
                <ExternalLink size={16} />
                <span className="text-sm">Apply Now</span>
              </a>
            )}
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs opacity-50">{message.timestamp}</span>
              {isBot && (
                <div className="flex items-center space-x-2">
                  {isSpeaking ? (
                    <button
                      onClick={onPause}
                      className="text-purple-500 hover:text-purple-600"
                    >
                      <Pause size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => onSpeak(message.text)}
                      className="text-gray-500 hover:text-purple-500"
                    >
                      <Play size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
const Chatbot = () => {
  const [userInput, setUserInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingMessage, setCurrentSpeakingMessage] = useState(null);
  const chatContainerRef = useRef(null);
  const recognition = useRef(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const synth = useRef(window.speechSynthesis);
  const currentUtterance = useRef(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);
  useEffect(() => {
    if (isListening) {
      handleVoiceInput();
    }
    recognition.current = setupSpeechRecognition();
    return () => {
      if (synth.current) {
        synth.current.cancel();
      }
    };
  }, []);
  const pauseSpeech = () => {
    if (synth.current && isSpeaking) {
      synth.current.pause();
      setIsSpeaking(false);
    }
  };
  const speakText = (text) => {
    if (!synth.current) return;
    synth.current.cancel();
    setCurrentSpeakingMessage(text);
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance.current = utterance;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentSpeakingMessage(null);
    };
    utterance.onpause = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
      setCurrentSpeakingMessage(null);
      setError('Text-to-speech failed. Please try again.');
    };

    synth.current.speak(utterance);
  };

  const handleSend = async () => {
    if (userInput.trim() === '' || loading) return;
    setShowWelcome(false);
    const currentInput = userInput;
    setUserInput('');
    
    try {
      setLoading(true);
      setError(null);
      setChatHistory(prev => [...prev, { 
        type: 'user', 
        text: currentInput,
        timestamp: new Date().toLocaleTimeString() 
      }]);

      const response = await fetch('http://localhost:3000/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentInput }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.success) {
        const botResponse = {
          type: 'bot',
          text: data.answer,
          applicationLink: data.applicationLink,
          timestamp: new Date().toLocaleTimeString()
        };
        setChatHistory(prev => [...prev, botResponse]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to get response. Please try again.');
      setChatHistory(prev => [...prev, {
        type: 'bot',
        text: 'Sorry, I encountered an error. Please try again.',
        isError: true,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const setupSpeechRecognition = () => {
    if (recognition.current) {
      recognition.current.stop();
    }
    if (!window.webkitSpeechRecognition && !window.SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return null;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = false;
    
    recognitionInstance.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognitionInstance.onend = () => {
      setIsListening(false);
    };
    
    recognitionInstance.onerror = (event) => {
      setIsListening(false);
      setError('Speech recognition failed. Please try again or type your message.');
      console.error('Speech Recognition Error:', event.error);
    };
    
    recognitionInstance.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setUserInput(transcript);
      setTimeout(() => handleSend(), 500);
    };
    
    return recognitionInstance;
  };

  const handleVoiceInput = () => {
    if (isListening) {
      if (recognition.current) {
        recognition.current.stop();
      }
      setIsListening(false);
    } else {
      recognition.current = setupSpeechRecognition();
      recognition.current.start();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 flex items-center gap-3">
            <Bot className="w-10 h-10" /> Government Schemes Assistant
          </h1>
        </div>
        
        <AnimatePresence>
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-r-lg flex justify-between items-center">
              <p>{error}</p>
              <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
                <X size={20} />
              </button>
            </div>
          )}
        </AnimatePresence>
        
        <div 
          ref={chatContainerRef}
          className="bg-gray-50/50 rounded-xl p-4 h-[500px] overflow-y-auto mb-4 space-y-4 scroll-smooth"
        >
          <AnimatePresence>
            {showWelcome ? (
              <div className="flex justify-center items-center h-full">
                <div className="text-center text-gray-500">
                  <Bot size={48} className="mx-auto mb-4 text-purple-500" />
                  <h2 className="text-xl font-semibold mb-2">Welcome to Government Schemes Assistant!</h2>
                  <p>Ask me anything about government schemes and policies. I can help you find information about:</p>
                  <ul className="mt-4 space-y-2 text-left list-disc list-inside">
                    <li>Eligibility criteria</li>
                    <li>Application process</li>
                    <li>Required documents</li>
                    <li>Benefits and features</li>
                    <li>Important deadlines</li>
                  </ul>
                </div>
              </div>
            ) : (
              chatHistory.map((message, index) => (
                <ChatMessage 
                  key={index} 
                  message={message} 
                  isLast={index === chatHistory.length - 1}
                  onSpeak={speakText}
                  onPause={pauseSpeech}
                  isSpeaking={isSpeaking && currentSpeakingMessage === message.text}
                />
              ))
            )}
          </AnimatePresence>
        </div>
        <div className="flex gap-3">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about any government scheme..."
            className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 bg-white transition-all resize-none"
            rows="2"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleVoiceInput}
            className={`p-4 rounded-xl ${isListening ? 'bg-red-500' : 'bg-green-500'} text-white`}
          >
            <Mic className="w-6 h-6" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={loading}
            className="p-4 bg-purple-500 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;