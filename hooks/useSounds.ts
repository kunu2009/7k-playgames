import { useMemo } from 'react';

// Using a module-level cache to ensure Audio objects are created only once per sound source.
const audioCache: { [key: string]: HTMLAudioElement } = {};

interface SoundPlayers {
  [key: string]: () => void;
}

export const useSounds = (soundMap: { [key: string]: string }): SoundPlayers => {
  const players = useMemo(() => {
    const soundPlayers: SoundPlayers = {};
    for (const key in soundMap) {
      if (Object.prototype.hasOwnProperty.call(soundMap, key)) {
        // Cache the Audio object if it doesn't exist.
        if (!audioCache[key]) {
          audioCache[key] = new Audio(soundMap[key]);
          audioCache[key].volume = 0.3; // A subtle volume level
        }
        
        // The function returned will play the cached audio object.
        soundPlayers[key] = () => {
          const audio = audioCache[key];
          if (audio) {
            audio.currentTime = 0;
            audio.play().catch(error => {
              // Autoplay policies can prevent playback until user interaction.
              // We'll log this as a debug message rather than a console error.
              console.debug(`Could not play sound '${key}':`, error);
            });
          }
        };
      }
    }
    return soundPlayers;
  }, [soundMap]);

  return players;
};
