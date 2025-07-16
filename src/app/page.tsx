'use client';

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Declare global for PDF.js from CDN
declare const pdfjsLib: any;

type Message = {
  id: string;
  sender: 'user' | 'ai';
  content: string;
};

const API_URL = '/api/gemini';

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pdfContent, setPdfContent] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Load PDF.js CDN script only once
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
    script.async = true;
    script.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        const pdfText: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const textItems = textContent.items as Array<{ str: string }>;
          pdfText.push(textItems.map(item => item.str).join(' '));
        }
        const parsedText = pdfText.join('\n');
        console.log('Parsed PDF Content:', parsedText);
        setPdfContent(parsedText);
        setMessages(prev => [...prev, { id: uuidv4(), sender: 'user', content: '1 file uploaded' }]);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Please upload a valid PDF file.');
    }
  };

  const sendMessage = async () => {
    const combinedContent = input.trim() + (pdfContent ? `\n${pdfContent}` : '');
    if (!input.trim() && !pdfContent) return;

    const userMessage: Message = {
      id: uuidv4(),
      sender: 'user',
      content: input.trim() || 'Uploaded PDF content.',
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setPdfContent(null);
    setIsTyping(true);

    const contents = updatedMessages.map((msg) => ({
      parts: [{ text: msg.content }],
      role: msg.sender === 'user' ? 'user' : 'model',
    }));

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: pdfContent
            ? contents.concat([{ parts: [{ text: pdfContent }], role: 'user' }])
            : contents,
          generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 512,
            candidateCount: 1,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch AI response');
      }

      const data = await response.json();
      const aiMessage: Message = {
        id: uuidv4(),
        sender: 'ai',
        content: data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I didn't get that.",
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: uuidv4(),
        sender: 'ai',
        content: `Error: Could not get a response. ${error instanceof Error ? error.message : ''}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isTyping) {
      sendMessage();
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-blue-800 to-purple-800 h-screen flex flex-col">
      {/* Header section */}
      <div className="flex justify-between items-center px-12 py-6">
        <h1 className="text-4xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-fuchsia-400 drop-shadow-lg">
          ALPHA
        </h1>
        <button className="bg-gradient-to-r from-fuchsia-500 to-indigo-400 text-white px-5 py-2 rounded-xl shadow font-semibold hover:opacity-80 transition">
          Login
        </button>
      </div>
      {/* Main content section */}
      <div className="flex grow w-full h-full">
        {/* Sidebar */}
        <nav className="w-64 py-8 px-6 bg-black/40 hidden md:block">
          <div className="mb-10 flex flex-col items-center">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-tr from-fuchsia-500 to-indigo-600 shadow-lg flex items-center justify-center text-white text-3xl font-bold">
              α
            </div>
            <span className="text-gray-300 mt-2 font-semibold tracking-wider">Navigation</span>
          </div>
          <ul className="space-y-3 font-medium">
            <li className="py-2 px-3 rounded-lg text-fuchsia-400 bg-fuchsia-900/20">New Chat</li>
            <li className="py-2 px-3 rounded-lg text-gray-200 hover:bg-indigo-900/30 hover:text-fuchsia-200 transition">History</li>
            <li className="py-2 px-3 rounded-lg text-gray-200 hover:bg-indigo-900/30 hover:text-fuchsia-200 transition">Search</li>
            <li className="py-2 px-3 rounded-lg text-gray-200 hover:bg-indigo-900/30 hover:text-fuchsia-200 transition">Settings</li>
            <li className="py-2 px-3 rounded-lg text-gray-200 hover:bg-indigo-900/30 hover:text-fuchsia-200 transition">About</li>
          </ul>
          <div className="absolute bottom-6 left-6 flex items-center space-x-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-fuchsia-400 to-indigo-600 flex items-center justify-center text-white text-lg font-bold">
              U
            </div>
            <span className="text-gray-200 font-medium">User</span>
          </div>
        </nav>

        {/* Chat Section */}
        <div className="flex-1 flex flex-col justify-center items-center md:items-start py-8">
          <div className="w-full max-w-3xl bg-black/60 rounded-2xl border-2 border-fuchsia-900 shadow-xl flex flex-col py-8 px-6 min-h-[600px]">
            {/* Chat messages area */}
            <div className="flex-1 overflow-y-auto mb-6" style={{ minHeight: '300px', maxHeight: '62vh' }}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
                >
                  <div className={`py-2 px-4 rounded-lg max-w-[70%] break-words shadow ${msg.sender === 'user'
                      ? 'bg-fuchsia-700 text-white'
                      : 'bg-gray-800 text-fuchsia-200'
                    }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start mb-2">
                  <div className="bg-gray-700 text-gray-300 py-2 px-4 rounded-lg max-w-[80%] italic">
                    AI is typing...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            {/* Input controls */}
            <div className="flex flex-col md:flex-row items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer bg-fuchsia-600 hover:bg-fuchsia-700 transition text-white font-medium py-2 px-4 rounded-xl shadow">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 4v16m8-8H4" />
                </svg>
                Choose PDF
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  />
              </label>
              <input
                type="text"
                placeholder="Type your message and press Enter..."
                className="flex-1 px-4 py-2 rounded-xl border border-fuchsia-500 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400 transition"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleEnter}
                disabled={isTyping}
                style={{ minWidth: '150px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}