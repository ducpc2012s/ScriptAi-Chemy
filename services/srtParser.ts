import { SrtSegment } from '../types';

function timeToSeconds(timeString: string): number {
  const parts = timeString.split(':');
  const secondsParts = parts[2].split(',');
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  const seconds = parseInt(secondsParts[0], 10);
  const milliseconds = parseInt(secondsParts[1], 10);

  return (hours * 3600) + (minutes * 60) + seconds + (milliseconds / 1000);
}

export const parseSrt = (data: string): SrtSegment[] => {
  const normalizedData = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalizedData.trim().split('\n\n');
  
  const segments: SrtSegment[] = [];

  blocks.forEach(block => {
    const lines = block.split('\n');
    if (lines.length >= 3) {
      const index = parseInt(lines[0], 10);
      const timeLine = lines[1];
      const textLines = lines.slice(2);

      // Regex to extract time
      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);

      if (timeMatch) {
        const startTime = timeMatch[1];
        const endTime = timeMatch[2];
        const text = textLines.join(' ').replace(/<[^>]*>/g, ''); // Remove HTML tags if any

        if (!isNaN(index)) {
             segments.push({
            index,
            startTime,
            endTime,
            text,
            startSeconds: timeToSeconds(startTime),
            endSeconds: timeToSeconds(endTime)
          });
        }
      }
    }
  });

  return segments;
};

/**
 * Converts a specific transcript format [mm:ss] to SRT format.
 * Format Example:
 * [0:00] Text content...
 * [0:06] Next content...
 */
export const convertTranscriptToSrt = (rawText: string): string => {
  // Regex to match [m:ss] or [mm:ss] or [h:mm:ss]
  // We capture the timestamp and the index in the string
  const regex = /\[(\d{1,2}:\d{2}|\d:\d{2}:\d{2})\]/g;
  
  let match;
  const matches = [];
  
  while ((match = regex.exec(rawText)) !== null) {
    matches.push({
      timeStr: match[1],
      index: match.index,
      fullMatch: match[0]
    });
  }

  if (matches.length === 0) return '';

  let srtOutput = '';
  
  const formatSrtTime = (secondsTotal: number): string => {
    const h = Math.floor(secondsTotal / 3600);
    const m = Math.floor((secondsTotal % 3600) / 60);
    const s = Math.floor(secondsTotal % 60);
    const ms = 0; // The input format doesn't have ms, assume 0
    
    const pad = (num: number, size: number) => num.toString().padStart(size, '0');
    return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
  };

  const parseInputTime = (timeStr: string): number => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    // Extract text content between this timestamp and the next (or end of string)
    const startIdx = current.index + current.fullMatch.length;
    const endIdx = next ? next.index : rawText.length;
    const content = rawText.substring(startIdx, endIdx).trim();

    if (!content) continue;

    // Calculate start and end times
    const startTimeSec = parseInputTime(current.timeStr);
    
    // If there is a next timestamp, use it as end time. 
    // If it's the last one, assume a duration based on word count (approx 3 words per sec) or min 2 seconds.
    let endTimeSec;
    if (next) {
      endTimeSec = parseInputTime(next.timeStr);
    } else {
      const wordCount = content.split(/\s+/).length;
      endTimeSec = startTimeSec + Math.max(3, Math.ceil(wordCount / 3));
    }

    srtOutput += `${i + 1}\n`;
    srtOutput += `${formatSrtTime(startTimeSec)} --> ${formatSrtTime(endTimeSec)}\n`;
    srtOutput += `${content}\n\n`;
  }

  return srtOutput;
};