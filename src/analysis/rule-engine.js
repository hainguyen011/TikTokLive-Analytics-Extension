import { PatternMatcher } from './pattern-matcher.js';
import { logger } from '../utils/logger.js';

export class RuleEngine {
  constructor(rules) {
    this.rules = rules;
  }

  analyze(text) {
    const results = {
      intent: 'general',
      priority: 'low',
      matches: []
    };

    if (!text) return results;

    for (const [intent, rule] of Object.entries(this.rules)) {
      let isMatch = false;

      if (rule.keywords && PatternMatcher.matchKeywords(text, rule.keywords)) {
        isMatch = true;
      }

      if (!isMatch && rule.patterns && PatternMatcher.matchPatterns(text, rule.patterns)) {
        isMatch = true;
      }

      if (!isMatch && rule.repeatedChars && PatternMatcher.hasRepeatedChars(text)) {
        isMatch = true;
      }

      if (isMatch) {
        // High priority takes precedence
        if (rule.priority === 'high' || results.priority !== 'high') {
          results.intent = intent;
          results.priority = rule.priority;
        }
        results.matches.push(intent);
      }
    }

    return results;
  }
}
