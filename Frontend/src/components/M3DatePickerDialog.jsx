import React, { useState, useEffect } from 'react';
import '@material/web/button/text-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function M3DatePickerDialog({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  minDate = new Date().toISOString().split('T')[0]
}) {
  const initial = selectedDate ? new Date(selectedDate) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear() || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth() || new Date().getMonth());
  const [tempDate, setTempDate] = useState(selectedDate || new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (selectedDate) {
      setTempDate(selectedDate);
      const d = new Date(selectedDate);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [selectedDate, isOpen]);

  if (!isOpen) return null;

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isDateDisabled = (day) => {
    if (!minDate) return false;
    const currentStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return currentStr < minDate;
  };

  const isDateSelected = (day) => {
    if (!tempDate) return false;
    const currentStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return currentStr === tempDate;
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  };

  const handleDayClick = (day) => {
    if (isDateDisabled(day)) return;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setTempDate(dateStr);
  };

  const handleConfirm = () => {
    onSelectDate(tempDate);
    onClose();
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const formattedHeadline = (() => {
    const d = new Date(tempDate + 'T00:00:00');
    if (isNaN(d.getTime())) return 'Select date';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  })();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999999,
        backdropFilter: 'blur(4px)',
        padding: '16px',
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "var(--font-body, 'DM Sans', sans-serif)"
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            padding: '20px 24px 16px 24px',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Select Date
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
            {formattedHeadline}
          </div>
        </div>

        {/* Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 8px 20px' }}>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.98rem' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <md-icon-button onClick={handlePrevMonth}>
              <md-icon>chevron_left</md-icon>
            </md-icon-button>
            <md-icon-button onClick={handleNextMonth}>
              <md-icon>chevron_right</md-icon>
            </md-icon-button>
          </div>
        </div>

        {/* Calendar Day Labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', padding: '0 16px', color: '#94a3b8', fontSize: '0.78rem', fontWeight: 700, marginBottom: '6px' }}>
          {DAYS.map((d, i) => (
            <div key={i} style={{ height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', padding: '0 16px 16px 16px' }}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const disabled = isDateDisabled(day);
            const selected = isDateSelected(day);
            const today = isToday(day);

            return (
              <button
                key={day}
                type="button"
                disabled={disabled}
                onClick={() => handleDayClick(day)}
                style={{
                  width: '38px',
                  height: '38px',
                  margin: 'auto',
                  borderRadius: '50%',
                  border: today && !selected ? '1.5px solid #FDC101' : 'none',
                  backgroundColor: selected ? '#FDC101' : 'transparent',
                  color: selected ? '#000000' : disabled ? '#cbd5e1' : '#0f172a',
                  fontWeight: selected || today ? 800 : 500,
                  fontSize: '0.88rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s',
                  outline: 'none'
                }}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
          <md-text-button onClick={onClose} style={{ '--md-sys-color-primary': '#64748b' }}>
            Cancel
          </md-text-button>
          <md-text-button onClick={handleConfirm} style={{ '--md-sys-color-primary': '#b45309', '--md-text-button-label-text-weight': '800' }}>
            OK
          </md-text-button>
        </div>
      </div>
    </div>
  );
}
