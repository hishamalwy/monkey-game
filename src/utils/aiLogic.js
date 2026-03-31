

// Normalize arabic text to ignore variations of Alef, etc. (optional but good for robustness)
export const normalizeArabic = (text) => {
  return text.replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ي/g, 'ى');
};

export const playAiTurn = (currentWord, difficultyErrorRate = 0.1, categoryWords = []) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!currentWord) {
        // First turn, pick a random starting letter of any word
        const randomWord = categoryWords[Math.floor(Math.random() * categoryWords.length)];
        resolve({ action: 'letter', letter: randomWord[0] });
        return;
      }

      // Check if current word is already a full word, but wait, if it is a full word it should act differently?
      // Actually, if it's EXACTLY a full word without challenge, the rule is the sequence is completed automatically!
      // But if the human typed a non-existent prefix
      const validContinuations = categoryWords.filter(c => 
        c.startsWith(currentWord) && c.length > currentWord.length
      );

      const isValidPrefix = categoryWords.some(c => c.startsWith(currentWord));

      // If the human typed something invalid, AI challenges immediately.
      if (!isValidPrefix) {
        resolve({ action: 'challenge' });
        return;
      }

      // Decide whether to bluff/make a mistake based on error rate
      const shouldBluff = Math.random() < difficultyErrorRate;

      if (shouldBluff || validContinuations.length === 0) {
        // AI bluffs! Add a random Arabic letter (allowing space for multi-word categories)
        const arabicAlphabet = "ابتثجحخدذرزسشصضطظعغفقكلمنهوي ";
        const randomChar = arabicAlphabet[Math.floor(Math.random() * arabicAlphabet.length)];
        resolve({ action: 'letter', letter: randomChar });
      } else {
        // AI plays correctly
        const chosenWord = validContinuations[Math.floor(Math.random() * validContinuations.length)];
        const nextLetter = chosenWord[currentWord.length];
        resolve({ action: 'letter', letter: nextLetter });
      }
    }, 1500 + Math.random() * 2000); // 1.5s to 3.5s "thinking" delay
  });
};
