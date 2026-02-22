/**
 * Represents a synchronized time interval for a lyric line.
 */
export interface LyricInterval {
    /** The original index of the line in the full lyrics array */
    index: number;
    /** Start time in seconds */
    start: number;
    /** End time in seconds (exclusive) */
    end: number;
}

/**
 * Converts a list of start times (sparse, potentially containing nulls/undefined)
 * into a list of continuous valid intervals.
 *
 * The logic follows the "SyncLyricsMode" behavior:
 * - A line is active starting from its valid startTime.
 * - It remains active until the next line with a valid startTime begins.
 * - The last line remains active until Infinity.
 *
 * @param timings Array of start times where index corresponds to line index
 * @returns Sorted array of intervals
 */
export function getSyncedIntervals(
    timings: (number | null | undefined)[]
): LyricInterval[] {
    const validPoints: { index: number; start: number }[] = [];

    // 1. Extract valid start points
    for (let i = 0; i < timings.length; i++) {
        const t = timings[i];
        if (t !== null && t !== undefined) {
            validPoints.push({ index: i, start: t });
        }
    }

    // 2. Map to intervals: [currentStart, nextStart)
    return validPoints.map((point, idx) => {
        const nextPoint = validPoints[idx + 1];
        const end = nextPoint ? nextPoint.start : Infinity;
        return {
            index: point.index,
            start: point.start,
            end
        };
    });
}

/**
 * Finds the active line index for a given time using binary search.
 * Returns -1 if no line is active.
 *
 * @param intervals Pre-calculated list of LyricIntervals (must be sorted by start time)
 * @param time Current playback time in seconds
 * @returns The original line index or -1
 */
export function findActiveLineIndex(
    intervals: LyricInterval[],
    time: number
): number {
    if (!intervals || intervals.length === 0) return -1;
    // Handle edge case where time is 0 but maybe falsy check failed upstream
    if (time === undefined || time === null) return -1;

    let low = 0;
    let high = intervals.length - 1;

    while (low <= high) {
        const mid = (low + high) >>> 1;
        const interval = intervals[mid];

        if (time >= interval.start && time < interval.end) {
            return interval.index;
        } else if (time < interval.start) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }

    return -1;
}
