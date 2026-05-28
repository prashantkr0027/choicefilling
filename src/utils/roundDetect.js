/**
 * roundDetect.js
 * Detects round number from a JoSAA filename.
 * Examples:
 *   "JoSAA NIT R1.html"   → "Round 1"
 *   "JoSAA IIT Round2.html" → "Round 2"
 *   "cutoffs_r3.html"     → "Round 3"
 */

export function detectRound(filename) {
  if (!filename) return 'Unknown Round';

  // Match "R1", "R 1", "Round1", "Round 1", "round_1", etc.
  const patterns = [
    /round\s*[_-]?\s*(\d+)/i,
    /\bR\s*(\d+)\b/i,
    /_r(\d+)[._]/i,
    /-r(\d+)[._]/i,
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match) {
      return `Round ${match[1]}`;
    }
  }

  return 'Unknown Round';
}
