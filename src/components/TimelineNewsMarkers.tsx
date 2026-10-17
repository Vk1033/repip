import React, { useState, FC } from 'react';
import { X, AlertCircle } from 'lucide-react';

export interface EconomicEvent {
  id: string;
  count: number;
  offsetPercent: number; // 0 to 100% position on the timeline
  title: string;
  timeStr: string;
  impact: 'High' | 'Medium' | 'Low';
  actual: string;
  forecast: string;
  previous: string;
}

export interface TimelineNewsMarkersProps {
  currentTimestamp?: number;
  events?: EconomicEvent[];
}

export const DEFAULT_TIMELINE_EVENTS: EconomicEvent[] = [
  { id: 'ev-1', count: 16, offsetPercent: 8, title: 'US Initial Jobless Claims', timeStr: '08:30 EST', impact: 'High', actual: '218K', forecast: '225K', previous: '222K' },
  { id: 'ev-2', count: 15, offsetPercent: 18, title: 'US Retail Sales (MoM)', timeStr: '08:30 EST', impact: 'High', actual: '0.4%', forecast: '0.3%', previous: '0.1%' },
  { id: 'ev-3', count: 12, offsetPercent: 28, title: 'US Core CPI YoY', timeStr: '08:30 EST', impact: 'High', actual: '3.3%', forecast: '3.2%', previous: '3.2%' },
  { id: 'ev-4', count: 10, offsetPercent: 38, title: 'US Non-Farm Payrolls', timeStr: '08:30 EST', impact: 'High', actual: '254K', forecast: '147K', previous: '159K' },
  { id: 'ev-5', count: 11, offsetPercent: 48, title: 'FOMC Interest Rate Decision', timeStr: '14:00 EST', impact: 'High', actual: '4.75-5.00%', forecast: '50bps Cut', previous: '5.25-5.50%' },
  { id: 'ev-6', count: 13, offsetPercent: 58, title: 'ISM Manufacturing PMI', timeStr: '10:00 EST', impact: 'Medium', actual: '47.2', forecast: '47.5', previous: '46.8' },
  { id: 'ev-7', count: 15, offsetPercent: 68, title: 'US PPI (MoM)', timeStr: '08:30 EST', impact: 'Medium', actual: '0.0%', forecast: '0.1%', previous: '0.2%' },
  { id: 'ev-8', count: 17, offsetPercent: 78, title: 'Michigan Consumer Sentiment', timeStr: '10:00 EST', impact: 'Medium', actual: '68.9', forecast: '70.8', previous: '70.1' },
  { id: 'ev-9', count: 12, offsetPercent: 88, title: 'US Existing Home Sales', timeStr: '10:00 EST', impact: 'Low', actual: '3.86M', forecast: '3.90M', previous: '3.95M' },
];

/**
 * Circular US Flag SVG Icon
 */
const UsFlagIcon: FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <circle cx="16" cy="16" r="15" fill="#B22234" stroke="#e2e8f0" strokeWidth="1" />
    <path d="M1 12h30M1 16h30M1 20h30M1 24h30M1 28h30" stroke="#FFFFFF" strokeWidth="2.5" />
    <rect x="1" y="1" width="15" height="15" rx="2" fill="#3C3B6E" />
    <circle cx="5" cy="5" r="1" fill="#FFFFFF" />
    <circle cx="11" cy="5" r="1" fill="#FFFFFF" />
    <circle cx="8" cy="8" r="1" fill="#FFFFFF" />
    <circle cx="5" cy="11" r="1" fill="#FFFFFF" />
    <circle cx="11" cy="11" r="1" fill="#FFFFFF" />
  </svg>
);

export const TimelineNewsMarkers: FC<TimelineNewsMarkersProps> = ({
  events = DEFAULT_TIMELINE_EVENTS,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<EconomicEvent | null>(null);

  return (
    <div
      data-testid="timeline-news-markers"
      className="absolute bottom-1 left-0 right-14 h-7 pointer-events-none z-10 select-none overflow-hidden"
    >
      {events.map((ev) => (
        <div
          key={ev.id}
          style={{ left: `${ev.offsetPercent}%` }}
          className="absolute bottom-0 -translate-x-1/2 pointer-events-auto"
        >
          <button
            data-testid={`news-marker-${ev.id}`}
            onClick={() => setSelectedEvent(selectedEvent?.id === ev.id ? null : ev)}
            title={`${ev.title} (${ev.count} events)`}
            className="group relative flex items-center p-0.5 hover:scale-110 transition-transform focus:outline-none"
          >
            {/* Flag Badge */}
            <div className="relative shadow-sm rounded-full overflow-hidden">
              <UsFlagIcon className="w-5 h-5 rounded-full" />
            </div>

            {/* Event Count Pill */}
            <span
              className={`absolute -top-1.5 -right-2 px-1 py-0.2 text-[9px] font-bold rounded-full shadow-sm text-white ${
                ev.impact === 'High' ? 'bg-blue-600' : 'bg-amber-600'
              }`}
            >
              {ev.count}
            </span>
          </button>
        </div>
      ))}

      {/* Selected Event Popover */}
      {selectedEvent && (
        <div
          style={{ left: `${Math.min(75, Math.max(10, selectedEvent.offsetPercent))}%` }}
          className="absolute bottom-9 -translate-x-1/2 w-64 bg-white dark:bg-[#1e222d] border border-[#cbd5e1] dark:border-[#2a2e39] shadow-2xl rounded-lg p-3 text-xs text-[#1e293b] dark:text-[#d1d4dc] pointer-events-auto z-40 animate-in fade-in"
        >
          <div className="flex items-start justify-between pb-1 mb-2 border-b border-[#cbd5e1] dark:border-[#2a2e39]">
            <div className="flex items-center gap-1.5">
              <UsFlagIcon className="w-4 h-4 rounded-full" />
              <span className="font-bold">{selectedEvent.title}</span>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-gray-400 hover:text-black dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-gray-400">Release Time:</span>
              <span className="font-medium">{selectedEvent.timeStr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Impact:</span>
              <span
                className={`font-bold ${
                  selectedEvent.impact === 'High' ? 'text-red-600' : 'text-amber-500'
                }`}
              >
                {selectedEvent.impact}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-gray-100 dark:border-gray-800 text-center">
              <div className="bg-gray-50 dark:bg-[#131722] p-1 rounded">
                <div className="text-gray-400 text-[10px]">Actual</div>
                <div className="font-bold text-green-600">{selectedEvent.actual}</div>
              </div>
              <div className="bg-gray-50 dark:bg-[#131722] p-1 rounded">
                <div className="text-gray-400 text-[10px]">Forecast</div>
                <div className="font-medium">{selectedEvent.forecast}</div>
              </div>
              <div className="bg-gray-50 dark:bg-[#131722] p-1 rounded">
                <div className="text-gray-400 text-[10px]">Previous</div>
                <div className="font-medium">{selectedEvent.previous}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
