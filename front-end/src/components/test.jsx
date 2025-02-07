import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Volume2, Loader2, Bot, User, X, Pause, Play, ExternalLink, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ChatMessage = ({ message, isLast, onSpeak, isSpeaking, onPause }) => {
  const isBot = message.type === 'bot';
  
  // Enhanced link rendering with better styling
  const renderLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => 
      urlRegex.test(part) ? (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:text-blue-800 underline inline-flex items-center"
        >
          {part.length > 50 ? part.substring(0, 50) + '...' : part}
          <ExternalLink size={12} className="ml-1" />
        </a>
      ) : part
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div className={`flex max-w-[80%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex items-start space-x-2 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
          <div className={`p-2 rounded-full shadow-md ${isBot ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
            {isBot ? <Sparkles className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
          </div>
          <div 
            className={`p-4 rounded-2xl shadow-lg ${
              isBot 
                ? 'bg-gray-100 border border-gray-200' 
                : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">
              {renderLinks(message.text)}
            </p>
            {message.applicationLink && (
              <a
                href={message.applicationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 mt-2 text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <ExternalLink size={16} />
                <span className="text-sm font-semibold">Official Application Portal</span>
              </a>
            )}
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs opacity-50">{message.timestamp}</span>
              {isBot && (
                <div className="flex items-center space-x-2">
                  {isSpeaking ? (
                    <button
                      onClick={onPause}
                      className="text-indigo-500 hover:text-indigo-600 transition-colors"
                    >
                      <Pause size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => onSpeak(message.text)}
                      className="text-gray-500 hover:text-indigo-500 transition-colors"
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

  // ... [Rest of the existing useEffect and handler methods remain the same]
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4 flex items-center justify-center">
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-6 text-white">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8" /> Gov Schemes AI Assistant
          </h1>
          <p className="text-sm text-white/80 mt-2">
            Your intelligent guide to government schemes and policies
          </p>
        </div>
        
        <div className="p-6">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-r-lg flex justify-between items-center"
              >
                <p>{error}</p>
                <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
                  <X size={20} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div 
            ref={chatContainerRef}
            className="bg-gray-50 rounded-xl p-4 h-[500px] overflow-y-auto mb-4 space-y-4 scroll-smooth border border-gray-200"
          >
            <AnimatePresence>
              {showWelcome ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center items-center h-full"
                >
                  <div className="text-center text-gray-600">
                    <Sparkles size={64} className="mx-auto mb-4 text-indigo-500" />
                    <h2 className="text-2xl font-bold mb-2 text-indigo-700">Welcome to Gov Schemes AI</h2>
                    <p className="mb-4">Your intelligent assistant for government scheme information</p>
                    <div className="bg-indigo-50 p-4 rounded-xl inline-block">
                      <p>Try asking about:</p>
                      <ul className="text-left list-disc list-inside mt-2 space-y-1 text-sm">
                        <li>PM Kisan Samman Nidhi Yojana</li>
                        <li>Ayushman Bharat Scheme</li>
                        <li>Student scholarship programs</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
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
              className="w-full p-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 bg-white transition-all resize-none"
              rows="2"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleVoiceInput}
              className={`p-4 rounded-xl ${isListening ? 'bg-red-500' : 'bg-indigo-500'} text-white transition-colors`}
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
    </div>
  );
};

export default Chatbot;