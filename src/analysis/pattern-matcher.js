export class PatternMatcher {
  static matchKeywords(text, keywords) {
    if (!text || !keywords || !Array.isArray(keywords)) return false;
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  static matchPatterns(text, patterns) {
    if (!text || !patterns || !Array.isArray(patterns)) return false;
    return patterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(text);
    });
  }

  static hasRepeatedChars(text, threshold = 5) {
    if (!text) return false;
    const regex = new RegExp(`(.)\\1{${threshold - 1},}`, 'g');
    return regex.test(text);
  }
}
