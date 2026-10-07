import { useEffect, useState } from 'react';
import { SPEECH_IDLE, SpeechInputController, speechConstructor } from './speechInput';

export function useSpeechInput(value: string, onChange: (value: string) => void, disabled: boolean) {
  const [state, setState] = useState(SPEECH_IDLE);
  const [supported] = useState(() => speechConstructor() !== undefined);
  const [controller] = useState(() => new SpeechInputController(speechConstructor(), onChange, setState));
  useEffect(() => { controller.update(value, onChange); }, [controller, value, onChange]);
  useEffect(() => {
    controller.activate();
    const hide = () => { if (document.hidden) controller.suspend(); };
    const leave = () => controller.suspend();
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', leave);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', leave);
      controller.dispose();
    };
  }, [controller]);
  useEffect(() => { if (disabled) controller.suspend(); }, [controller, disabled]);
  return { ...state, supported, start: () => controller.start(), stop: () => controller.stop() };
}
