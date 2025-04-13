import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserProfile, ChatMessage } from '@/types';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';

interface AIChatbotProps {
  userProfile?: UserProfile;
}

const AIChatbot = ({ userProfile }: AIChatbotProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch existing chat history
  const { data: chatHistory, isLoading, isError, error } = useQuery({
    queryKey: ['/api/chat/history'],
    enabled: !!userProfile, // Only fetch when user is logged in
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors
      return !(error.status === 401) && failureCount < 3;
    },
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chat/message', { message });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/history'] });
      setIsTyping(false);
    },
    onError: (error: any) => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response. Please try again.'}`
      }]);
    }
  });

  useEffect(() => {
    if (chatHistory) {
      setMessages(chatHistory.messages || []);
    }
  }, [chatHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      role: 'user',
      content: input
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    // Send message to API
    sendMessage.mutate(input);
  };

  // Handle authentication error
  if (isError && (error as any)?.status === 401) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-6">
          <h3 className="text-lg font-heading font-medium flex items-center mb-4">
            <span className="material-icons text-primary mr-2">chat</span>
            Ask about Hanoi's Environment
          </h3>
          
          <div className="flex flex-col h-[400px]">
            <div className="flex-grow bg-neutral-50 rounded-lg p-4 mb-4 overflow-y-auto">
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-6 bg-neutral-100 rounded-lg shadow-sm max-w-md">
                  <span className="material-icons text-4xl text-neutral-500 mb-4">lock</span>
                  <h4 className="text-lg font-medium mb-2">Authentication Required</h4>
                  <p className="text-neutral-600 mb-4">
                    Please sign in to access the AI assistant and personalized recommendations.
                  </p>
                  <Button className="bg-primary text-white hover:bg-primary-dark">
                    Sign In
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <Card className="shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <Skeleton className="h-6 w-6 mr-2 rounded-full" />
            <Skeleton className="h-6 w-48" />
          </div>
          
          <div className="flex flex-col h-[400px]">
            <div className="flex-grow bg-neutral-50 rounded-lg p-4 mb-4">
              <div className="space-y-4">
                <Skeleton className="h-16 w-3/4 ml-auto rounded-lg" />
                <Skeleton className="h-24 w-4/5 rounded-lg" />
                <Skeleton className="h-16 w-3/4 ml-auto rounded-lg" />
                <Skeleton className="h-24 w-4/5 rounded-lg" />
              </div>
            </div>
            
            <div className="flex">
              <Skeleton className="h-10 flex-grow rounded-l-lg" />
              <Skeleton className="h-10 w-10 rounded-r-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardContent className="p-6">
        <h3 className="text-lg font-heading font-medium flex items-center mb-4">
          <span className="material-icons text-primary mr-2">chat</span>
          Ask about Hanoi's Environment
        </h3>
        
        <div className="flex flex-col h-[400px]">
          <div className="flex-grow bg-neutral-50 rounded-lg p-4 mb-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.length === 0 && (
                <p className="text-center text-neutral-500 my-4">
                  Ask a question about Hanoi's weather, environment, or get personalized recommendations.
                </p>
              )}
              
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`${
                      message.role === 'user' 
                        ? 'bg-primary text-white' 
                        : 'bg-neutral-200'
                    } rounded-lg py-2 px-4 max-w-[80%]`}
                  >
                    {message.content.split('\n').map((text, i) => (
                      <p key={i} className={i > 0 ? 'mt-2' : ''}>
                        {text}
                      </p>
                    ))}
                    
                    {message.role === 'assistant' && message.content.includes('list') && (
                      <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                        <li>Follow relevant points from the assistant's message</li>
                      </ul>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-neutral-200 rounded-lg py-2 px-4">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          <form onSubmit={handleSendMessage} className="flex">
            <Input
              type="text"
              placeholder="Ask about weather, air quality, or health recommendations..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-grow rounded-l-lg"
              disabled={isTyping}
            />
            <Button 
              type="submit"
              className="bg-primary text-white rounded-l-none hover:bg-primary-dark" 
              disabled={isTyping}
            >
              <span className="material-icons">send</span>
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIChatbot;
