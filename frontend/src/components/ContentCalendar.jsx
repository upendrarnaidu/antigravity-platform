import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock, Twitter, Linkedin, Instagram } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const DEMO_EVENTS = [
  { day: 5, platform: 'twitter', title: 'Product Launch Thread', time: '10:00 AM' },
  { day: 8, platform: 'linkedin', title: 'Case Study Post', time: '9:00 AM' },
  { day: 12, platform: 'instagram', title: 'Behind the Scenes Reel', time: '2:00 PM' },
  { day: 15, platform: 'twitter', title: 'Weekly Tips Thread', time: '11:00 AM' },
  { day: 18, platform: 'linkedin', title: 'Industry Analysis', time: '8:30 AM' },
  { day: 22, platform: 'instagram', title: 'User Testimonial', time: '5:00 PM' },
  { day: 25, platform: 'twitter', title: 'Engagement Poll', time: '3:00 PM' },
  { day: 28, platform: 'linkedin', title: 'Team Spotlight', time: '10:00 AM' },
];

const platformIcon = (p) => {
  if (p === 'twitter') return <Twitter size={11} color="#1d9bf0" />;
  if (p === 'linkedin') return <Linkedin size={11} color="#0a66c2" />;
  return <Instagram size={11} color="#e1306c" />;
};

const platformColor = (p) => {
  if (p === 'twitter') return 'rgba(29,155,240,0.15)';
  if (p === 'linkedin') return 'rgba(10,102,194,0.15)';
  return 'rgba(225,48,108,0.15)';
};

export default function ContentCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const eventsForDay = (day) => DEMO_EVENTS.filter(e => e.day === day);
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Content Calendar</h1>
          <p className="page-subtitle">Schedule and visualize your content pipeline.</p>
        </div>
        <button className="btn-primary" style={{ width: 'auto' }}>
          <Plus size={16} /> Schedule Post
        </button>
      </div>

      {/* Month Navigation */}
      <div className="glass-panel mb-6" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn-ghost" onClick={prev}><ChevronLeft size={18} /></button>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'Outfit' }}>
          {MONTHS[month]} {year}
        </h2>
        <button className="btn-ghost" onClick={next}><ChevronRight size={18} /></button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Day headers */}
        {DAYS.map(d => (
          <div key={d} className="calendar-header-cell">{d}</div>
        ))}

        {/* Day cells */}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`calendar-cell${day ? '' : ' empty'}${isToday(day) ? ' today' : ''}${selectedDay === day ? ' selected' : ''}`}
            onClick={() => day && setSelectedDay(day)}
          >
            {day && (
              <>
                <span className="calendar-day-number">{day}</span>
                <div className="calendar-events">
                  {eventsForDay(day).map((ev, j) => (
                    <div key={j} className="calendar-event" style={{ background: platformColor(ev.platform) }}>
                      {platformIcon(ev.platform)}
                      <span className="calendar-event-text">{ev.title}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="glass-panel mt-6 animate-fade-in">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            {MONTHS[month]} {selectedDay}, {year}
          </h3>
          {eventsForDay(selectedDay).length > 0 ? (
            <div className="flex flex-col gap-3">
              {eventsForDay(selectedDay).map((ev, i) => (
                <div key={i} className="calendar-detail-card">
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: platformColor(ev.platform),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {platformIcon(ev.platform)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{ev.title}</div>
                      <div className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Clock size={10} /> {ev.time}
                        <span style={{ textTransform: 'capitalize' }}>· {ev.platform}</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn-secondary" style={{ width: 'auto', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No posts scheduled. Click "Schedule Post" to add one.</p>
          )}
        </div>
      )}

      {/* AI Suggestion */}
      <div className="glass-panel mt-6" style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.08))',
        border: '1px solid rgba(99,102,241,0.2)',
      }}>
        <div className="flex items-center gap-3 mb-3">
          <Clock size={18} color="#818cf8" />
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>AI Scheduling Suggestion</div>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Based on your audience engagement patterns, <strong style={{ color: '#34d399' }}>Tuesday 10 AM</strong> and{' '}
          <strong style={{ color: '#34d399' }}>Thursday 2 PM</strong> are optimal posting times for LinkedIn.
          Twitter posts perform best on <strong style={{ color: '#34d399' }}>Wednesday 11 AM</strong>.
        </p>
      </div>
    </div>
  );
}
