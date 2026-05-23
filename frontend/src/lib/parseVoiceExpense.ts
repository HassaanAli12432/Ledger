/**
 * Voice-to-Expense NLP Parser
 *
 * Extracts structured expense data from a natural-language transcript.
 * E.g. "2000 split between me and Ahmed for dinner"
 *   → { amount: 2000, title: "Dinner", friendNames: ["Ahmed"], category: "FOOD", splitType: "EQUAL" }
 */

export interface ParsedVoiceExpense {
  amount: number | null;
  title: string;
  friendNames: string[];
  category: string;
  splitType: 'EQUAL' | 'EXACT';
  confidence: number; // 0–1
}

// Word-to-number mapping for spoken numbers
const WORD_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
  lakh: 100000, lac: 100000, million: 1000000,
};

// Category keyword map
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  FOOD: ['food', 'dinner', 'lunch', 'breakfast', 'meal', 'eat', 'eating', 'restaurant', 'pizza', 'burger', 'biryani', 'chai', 'coffee', 'snack', 'groceries', 'grocery', 'khana'],
  TRANSPORT: ['uber', 'taxi', 'cab', 'ride', 'fuel', 'petrol', 'gas', 'bus', 'fare', 'careem', 'transport', 'travel', 'metro', 'train', 'flight'],
  ACCOMMODATION: ['rent', 'hotel', 'hostel', 'stay', 'room', 'accommodation', 'apartment', 'flat'],
  ENTERTAINMENT: ['movie', 'movies', 'cinema', 'netflix', 'spotify', 'game', 'gaming', 'concert', 'party', 'fun', 'outing', 'entertainment'],
  UTILITIES: ['bill', 'electricity', 'water', 'internet', 'wifi', 'phone', 'mobile', 'recharge', 'utility', 'gas bill'],
  HEALTHCARE: ['doctor', 'medicine', 'hospital', 'medical', 'pharmacy', 'health', 'clinic'],
  SHOPPING: ['shopping', 'clothes', 'shoes', 'amazon', 'daraz', 'online', 'purchase', 'buy', 'bought'],
  EDUCATION: ['tuition', 'books', 'course', 'class', 'school', 'university', 'education', 'fee', 'fees'],
  TRAVEL: ['trip', 'vacation', 'holiday', 'tour', 'ticket', 'tickets', 'booking'],
};

/**
 * Extract a numeric amount from transcript.
 * Handles: "2000", "2,000", "Rs 2000", "two thousand", "Rs. 500", "1500 rupees"
 */
function extractAmount(text: string): number | null {
  // 1. Direct numeric patterns — order matters! General \d+ first, comma-formatted last
  const numericPatterns = [
    // Match number followed by a keyword (most specific context)
    /(\d+(?:\.\d{1,2})?)\s*(?:rupees?|rs\.?|pkr|split|between|for|with)/gi,
    // Match any standalone number with 2+ digits
    /(?:^|\s)(\d{2,}(?:\.\d{1,2})?)(?:\s|$|,)/g,
    // Match currency prefix + number: "Rs 5000", "Rs.5000", "PKR 5000"
    /(?:rs\.?\s*|rupees?\s*|pkr\s*)(\d+(?:\.\d{1,2})?)/gi,
    // Match comma-formatted: "5,000" or "50,000"
    /(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?)/g,
  ];

  for (const pattern of numericPatterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      if (num > 0 && num < 100_000_000) return num;
    }
  }

  // 2. Word-based numbers: "two thousand", "fifteen hundred"
  const words = text.toLowerCase().split(/\s+/);
  let accumulator = 0;
  let current = 0;
  let foundNumber = false;

  for (const word of words) {
    const val = WORD_NUMBERS[word];
    if (val !== undefined) {
      foundNumber = true;
      if (val === 1000 || val === 100000 || val === 1000000) {
        current = (current === 0 ? 1 : current) * val;
      } else if (val === 100) {
        current = (current === 0 ? 1 : current) * 100;
      } else {
        current += val;
      }
    } else if (foundNumber) {
      accumulator += current;
      current = 0;
      // Don't break — there might be more ("two thousand five hundred")
      // But if next word is also not a number, we're done
      if (accumulator > 0) break;
    }
  }
  accumulator += current;

  return accumulator > 0 ? accumulator : null;
}

/**
 * Extract friend names by fuzzy-matching transcript words against the user's friend list.
 */
function extractFriendNames(text: string, friendNames: string[]): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];

  for (const name of friendNames) {
    const nameLower = name.toLowerCase();
    const firstName = nameLower.split(' ')[0];

    // Exact name match (first name or full name)
    if (lower.includes(nameLower) || lower.includes(firstName)) {
      matched.push(name);
      continue;
    }

    // Fuzzy match: allow 1-char difference for names > 3 chars
    if (firstName.length > 3) {
      const words = lower.split(/\s+/);
      for (const word of words) {
        if (levenshtein(word, firstName) <= 1) {
          matched.push(name);
          break;
        }
      }
    }
  }

  return [...new Set(matched)];
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        matrix[i][j] = j;
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Detect expense category from keywords in the transcript.
 */
function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  let bestCategory = 'OTHER';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Generate a sensible title from the transcript.
 */
function generateTitle(text: string, category: string): string {
  // Try to extract a meaningful phrase after "for" or "on"
  const forMatch = text.match(/(?:for|on)\s+(.+?)(?:\s+(?:with|between|split|and me|equally)|\s*$)/i);
  if (forMatch) {
    const title = forMatch[1].trim();
    if (title.length > 1 && title.length < 60) {
      return title.charAt(0).toUpperCase() + title.slice(1);
    }
  }

  // Fall back to category-based title
  const categoryTitles: Record<string, string> = {
    FOOD: 'Food expense',
    TRANSPORT: 'Transport',
    ACCOMMODATION: 'Accommodation',
    ENTERTAINMENT: 'Entertainment',
    UTILITIES: 'Utility bill',
    HEALTHCARE: 'Medical expense',
    SHOPPING: 'Shopping',
    EDUCATION: 'Education',
    TRAVEL: 'Travel expense',
    OTHER: 'Shared expense',
  };

  return categoryTitles[category] || 'Shared expense';
}

/**
 * Main parser: takes a raw voice transcript and the user's friend list,
 * returns structured expense data.
 */
export function parseVoiceExpense(
  transcript: string,
  friendNames: string[]
): ParsedVoiceExpense {
  const amount = extractAmount(transcript);
  const matchedFriends = extractFriendNames(transcript, friendNames);
  const category = detectCategory(transcript);
  const title = generateTitle(transcript, category);

  // Calculate confidence score
  let confidence = 0;
  if (amount !== null && amount > 0) confidence += 0.4;
  if (matchedFriends.length > 0) confidence += 0.35;
  if (category !== 'OTHER') confidence += 0.15;
  if (title !== 'Shared expense') confidence += 0.1;

  return {
    amount,
    title,
    friendNames: matchedFriends,
    category,
    splitType: 'EQUAL',
    confidence,
  };
}
