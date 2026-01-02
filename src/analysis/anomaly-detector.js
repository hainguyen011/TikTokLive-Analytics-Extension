import { logger } from '../utils/logger.js';

export class AnomalyDetector {
  constructor(windowSize = 60) {
    this.history = [];
    this.windowSize = windowSize; // Number of data points (e.g., 60 seconds)
  }

  addDataPoint(viewers, commentCount) {
    const dataPoint = {
      timestamp: Date.now(),
      viewers,
      commentCount
    };

    this.history.push(dataPoint);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    return this.detect();
  }

  detect() {
    if (this.history.length < 10) return []; // Need enough data

    const current = this.history[this.history.length - 1];
    const previous = this.history[this.history.length - 2];
    const alerts = [];

    // Viewer drop detection
    const recentAvgViewers = this.getAverage('viewers', this.history.length - 1);
    if (recentAvgViewers > 0) {
      const dropPercentage = ((recentAvgViewers - current.viewers) / recentAvgViewers) * 100;
      if (dropPercentage > 20) {
        alerts.push({
          type: 'viewer_drop',
          severity: dropPercentage > 40 ? 'critical' : 'warning',
          message: `Viewer drop: ${dropPercentage.toFixed(1)}%`,
          suggestion: 'Audience retention is dropping. Try a new topic or interaction.'
        });
      }
    }

    // Comment spike detection
    const recentAvgComments = this.getAverage('commentCount', this.history.length - 1);
    if (recentAvgComments > 0) {
      const spikePercentage = ((current.commentCount - recentAvgComments) / recentAvgComments) * 100;
      if (spikePercentage > 50) {
        alerts.push({
          type: 'comment_spike',
          severity: 'info',
          message: `Comment activity +${spikePercentage.toFixed(1)}%`,
          suggestion: 'High engagement! A great time to highlight products or answer questions.'
        });
      }
    }

    return alerts;
  }

  getAverage(field, count) {
    const subset = this.history.slice(-count - 1, -1);
    if (subset.length === 0) return 0;
    const sum = subset.reduce((acc, curr) => acc + curr[field], 0);
    return sum / subset.length;
  }
}
