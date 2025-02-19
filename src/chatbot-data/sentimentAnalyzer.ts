interface SentimentResult {
  score: number;  // Range from -1 (very negative) to 1 (very positive)
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: {
    anger: number;
    frustration: number;
    satisfaction: number;
    urgency: number;
  };
}

// Word lists for sentiment analysis
const sentimentWords = {
  positive: [
    // General positive
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'happy', 'pleased', 'satisfied', 'thank', 'thanks', 'helpful',
    // Service specific
    'works', 'working', 'solved', 'resolved', 'fixed', 'clear',
    'easy', 'quick', 'fast', 'efficient', 'smooth',
  ],
  negative: [
    // General negative
    'bad', 'poor', 'terrible', 'horrible', 'awful', 'wrong',
    'unhappy', 'disappointed', 'frustrated', 'annoying', 'useless',
    // Service specific
    'broken', 'error', 'issue', 'problem', 'fail', 'failed',
    'slow', 'difficult', 'confusing', 'complicated', 'stuck',
  ],
  anger: [
    'angry', 'furious', 'mad', 'outraged', 'irritated',
    'annoyed', 'frustrated', 'upset', 'terrible', 'horrible',
  ],
  frustration: [
    'confused', 'stuck', 'difficult', 'hard', 'complicated',
    'cannot', "can't", 'impossible', 'trying', 'attempt',
  ],
  satisfaction: [
    'perfect', 'excellent', 'amazing', 'wonderful', 'great',
    'exactly', 'precisely', 'perfect', 'brilliant', 'outstanding',
  ],
  urgency: [
    'urgent', 'asap', 'emergency', 'immediately', 'quick',
    'fast', 'soon', 'hurry', 'urgent', 'critical',
  ],
};

// Modifiers that can intensify or diminish sentiment
const modifiers = {
  intensifiers: ['very', 'really', 'extremely', 'absolutely', 'completely', 'totally'],
  diminishers: ['somewhat', 'slightly', 'kind of', 'sort of', 'a bit', 'barely'],
  negators: ['not', "n't", 'never', 'no', 'none', 'neither', 'nor'],
};

export const analyzeSentiment = (text: string): SentimentResult => {
  const words = text.toLowerCase().split(/\s+/);
  let sentimentScore = 0;
  let wordCount = 0;
  let lastModifier = '';
  
  // Emotion scores
  const emotions = {
    anger: 0,
    frustration: 0,
    satisfaction: 0,
    urgency: 0,
  };
  
  // Process each word
  words.forEach((word, index) => {
    let multiplier = 1;
    
    // Check for modifiers
    if (modifiers.intensifiers.includes(lastModifier)) {
      multiplier = 1.5;
    } else if (modifiers.diminishers.includes(lastModifier)) {
      multiplier = 0.5;
    } else if (modifiers.negators.includes(lastModifier)) {
      multiplier = -1;
    }
    
    // Update sentiment score
    if (sentimentWords.positive.includes(word)) {
      sentimentScore += (1 * multiplier);
      wordCount++;
    }
    if (sentimentWords.negative.includes(word)) {
      sentimentScore += (-1 * multiplier);
      wordCount++;
    }
    
    // Update emotion scores
    Object.keys(emotions).forEach((emotion) => {
      if (sentimentWords[emotion].includes(word)) {
        emotions[emotion] += (1 * multiplier);
      }
    });
    
    lastModifier = word;
  });
  
  // Normalize scores
  const normalizedScore = wordCount > 0 ? sentimentScore / wordCount : 0;
  const normalizedEmotions = Object.fromEntries(
    Object.entries(emotions).map(([key, value]) => [key, value / (wordCount || 1)])
  ) as typeof emotions;
  
  // Calculate confidence based on word coverage
  const confidence = Math.min(wordCount / words.length, 1);
  
  // Determine sentiment category
  let sentiment: 'positive' | 'negative' | 'neutral';
  if (normalizedScore > 0.2) {
    sentiment = 'positive';
  } else if (normalizedScore < -0.2) {
    sentiment = 'negative';
  } else {
    sentiment = 'neutral';
  }
  
  return {
    score: normalizedScore,
    sentiment,
    confidence,
    emotions: normalizedEmotions,
  };
};

// Helper function to get appropriate response based on sentiment
export const getEmotionallyAwareResponse = (
  intent: string,
  sentiment: SentimentResult,
  responses: string[]
): string => {
  // Define response categories
  const responseTypes = {
    positive: responses.filter(r => r.includes('😊') || r.includes('great') || r.includes('glad')),
    negative: responses.filter(r => r.includes('😔') || r.includes('sorry') || r.includes('apologize')),
    neutral: responses.filter(r => !r.includes('😊') && !r.includes('😔')),
    urgent: responses.filter(r => r.includes('right away') || r.includes('immediately')),
    frustrated: responses.filter(r => r.includes('understand') || r.includes('help you')),
  };
  
  // Select appropriate response based on sentiment and emotions
  if (sentiment.emotions.urgency > 0.5) {
    return responseTypes.urgent[0] || responses[0];
  }
  
  if (sentiment.emotions.frustration > 0.5) {
    return responseTypes.frustrated[0] || responses[0];
  }
  
  switch (sentiment.sentiment) {
    case 'positive':
      return responseTypes.positive[0] || responses[0];
    case 'negative':
      return responseTypes.negative[0] || responses[0];
    default:
      return responseTypes.neutral[0] || responses[0];
  }
};
