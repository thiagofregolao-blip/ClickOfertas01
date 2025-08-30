import { useState, useEffect } from 'react';

interface UseTypewriterProps {
  phrases: string[];
  speed?: number;
  pauseTime?: number;
  backspaceSpeed?: number;
}

export function useTypewriter({ 
  phrases, 
  speed = 100, 
  pauseTime = 2000,
  backspaceSpeed = 50 
}: UseTypewriterProps) {
  const [currentText, setCurrentText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (phrases.length === 0) return;

    const currentPhrase = phrases[phraseIndex];

    const timeout = setTimeout(() => {
      if (isDeleting) {
        // Apagando texto
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1));
        } else {
          // Terminou de apagar, vai para próxima frase
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      } else {
        // Digitando texto
        if (currentText.length < currentPhrase.length) {
          setCurrentText(currentPhrase.slice(0, currentText.length + 1));
        } else {
          // Terminou de digitar, pausa e depois começa a apagar
          setTimeout(() => {
            setIsDeleting(true);
          }, pauseTime);
        }
      }
    }, isDeleting ? backspaceSpeed : speed);

    return () => clearTimeout(timeout);
  }, [currentText, phraseIndex, isDeleting, phrases, speed, pauseTime, backspaceSpeed]);

  return { currentText, isTyping: !isDeleting };
}