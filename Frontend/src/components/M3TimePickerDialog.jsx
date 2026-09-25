import React, { useState, useEffect } from 'react';
import '@material/web/button/text-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';

export default function M3TimePickerDialog({
  isOpen,
  onClose,
  selectedTime = '10:00',
  onSelectTime
}) {
  const parseInitialTime = (timeStr) => {
    if (!timeStr) return { hour12: 10, minute: 0, period: 'AM' };
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10) || 10;
    const m = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? 'PM' : 'AM';
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour12, minute: m, period };
  };

  const [mode, setMode] = useState('hours'); // 'hours' | 'minutes'
  const [hour12, setHour12] = useState(10);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState('AM');
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);

  useEffect(() => {
    if (selectedTime) {
      const parsed = parseInitialTime(selectedTime);
      setHour12(parsed.hour12);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
    }
    setMode('hours');
  }, [selectedTime, isOpen]);

  if (!isOpen) return null;

  const handleHourSelect = (h) => {
    setHour12(h);
    setMode('minutes'); // auto-advance to minutes like standard M3
  };

  const handleMinuteSelect = (m) => {
    setMinute(m);
  };

  const handleConfirm = () => {
    let finalHour24 = hour12 % 12;
    if (period === 'PM') finalHour24 += 12;
    const finalTimeStr = `${String(finalHour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    onSelectTime(finalTimeStr);
    onClose();
  };

  // Dial layout calculations
  const dialRadius = 96;
  const dialCenter = 120;

  const getHandAngle = () => {
    if (mode === 'hours') {
      return (hour12 % 12) * 30; // 360 / 12 = 30 deg
    } else {
      return minute * 6; // 360 / 60 = 6 deg
    }
  };

  const handAngle = getHandAngle();
  const rad = ((handAngle - 90) * Math.PI) / 180;
  const thumbX = dialCenter + dialRadius * Math.cos(rad);
  const thumbY = dialCenter + dialRadius * Math.sin(rad);

  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const handleDialClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - dialCenter;
    const y = e.clientY - rect.top - dialCenter;
    let angle = (Math.atan2(y, x) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;

    if (mode === 'hours') {
      let h = Math.round(angle / 30);
      if (h === 0) h = 12;
      handleHourSelect(h);
    } else {
      let m = Math.round(angle / 6);
      if (m === 60) m = 0;
      handleMinuteSelect(m);
    }
  };

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
          backgroundColor: '#f6f3f9',
          borderRadius: '28px',
          width: '100%',
          maxWidth: '340px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
          boxSizing: 'border-box'
        }}
      >
        {/* Title */}
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#49454f', marginBottom: '20px' }}>
          Select time
        </div>

        {/* Time Inputs & AM/PM Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          {/* Hour Box */}
          <button
            type="button"
            onClick={() => setMode('hours')}
            style={{
              width: '80px',
              height: '72px',
              backgroundColor: mode === 'hours' ? '#fef3c7' : '#ece6f0',
              border: mode === 'hours' ? '2px solid #FDC101' : '2px solid transparent',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 700,
              color: mode === 'hours' ? '#78350f' : '#1d1b20',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: "var(--font-heading, 'DM Sans', sans-serif)"
            }}
          >
            {String(hour12).padStart(2, '0')}
          </button>

          <span style={{ fontSize: '2.2rem', fontWeight: 700, color: '#1d1b20', margin: '0 -2px' }}>:</span>

          {/* Minute Box */}
          <button
            type="button"
            onClick={() => setMode('minutes')}
            style={{
              width: '80px',
              height: '72px',
              backgroundColor: mode === 'minutes' ? '#fef3c7' : '#ece6f0',
              border: mode === 'minutes' ? '2px solid #FDC101' : '2px solid transparent',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 700,
              color: mode === 'minutes' ? '#78350f' : '#1d1b20',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: "var(--font-heading, 'DM Sans', sans-serif)"
            }}
          >
            {String(minute).padStart(2, '0')}
          </button>

          {/* AM / PM Segmented Control */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid #79747e',
              height: '72px',
              marginLeft: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => setPeriod('AM')}
              style={{
                flex: 1,
                padding: '0 12px',
                border: 'none',
                backgroundColor: period === 'AM' ? '#fed7aa' : 'transparent',
                color: period === 'AM' ? '#7c2d12' : '#49454f',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                borderBottom: '1px solid #79747e'
              }}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setPeriod('PM')}
              style={{
                flex: 1,
                padding: '0 12px',
                border: 'none',
                backgroundColor: period === 'PM' ? '#fed7aa' : 'transparent',
                color: period === 'PM' ? '#7c2d12' : '#49454f',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              PM
            </button>
          </div>
        </div>

        {/* Clock Dial Mode */}
        {!isKeyboardMode ? (
          <div
            onClick={handleDialClick}
            style={{
              position: 'relative',
              width: '240px',
              height: '240px',
              backgroundColor: '#ece6f0',
              borderRadius: '50%',
              margin: '0 auto 16px auto',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            {/* Center Pivot */}
            <div
              style={{
                position: 'absolute',
                top: `${dialCenter - 4}px`,
                left: `${dialCenter - 4}px`,
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#b45309',
                zIndex: 4
              }}
            />

            {/* Hand Radial Line */}
            <div
              style={{
                position: 'absolute',
                top: `${dialCenter}px`,
                left: `${dialCenter}px`,
                width: '2px',
                height: `${dialRadius}px`,
                backgroundColor: '#b45309',
                transformOrigin: 'top center',
                transform: `rotate(${handAngle + 180}deg)`,
                zIndex: 2
              }}
            />

            {/* Selection Thumb Circle */}
            <div
              style={{
                position: 'absolute',
                top: `${thumbY - 19}px`,
                left: `${thumbX - 19}px`,
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#FDC101',
                zIndex: 3,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
              }}
            />

            {/* Numbers on Dial */}
            {(mode === 'hours' ? hoursList : minutesList).map((num, i) => {
              const angle = i * 30;
              const nRad = ((angle - 90) * Math.PI) / 180;
              const nx = dialCenter + dialRadius * Math.cos(nRad);
              const ny = dialCenter + dialRadius * Math.sin(nRad);

              const isNumSelected = mode === 'hours' ? num === hour12 : num === minute;

              return (
                <div
                  key={num}
                  style={{
                    position: 'absolute',
                    top: `${ny - 14}px`,
                    left: `${nx - 14}px`,
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.95rem',
                    fontWeight: isNumSelected ? 800 : 500,
                    color: isNumSelected ? '#000000' : '#1d1b20',
                    zIndex: 5,
                    pointerEvents: 'none'
                  }}
                >
                  {mode === 'minutes' ? String(num).padStart(2, '0') : num}
                </div>
              );
            })}
          </div>
        ) : (
          /* Manual Keyboard Entry Mode */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Enter time manually:</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="1"
                max="12"
                value={hour12}
                onChange={(e) => {
                  let val = parseInt(e.target.value, 10);
                  if (isNaN(val)) val = 1;
                  if (val > 12) val = 12;
                  if (val < 1) val = 1;
                  setHour12(val);
                }}
                style={{
                  width: '60px',
                  height: '48px',
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1'
                }}
              />
              <span style={{ fontSize: '1.4rem', fontWeight: 700 }}>:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={minute}
                onChange={(e) => {
                  let val = parseInt(e.target.value, 10);
                  if (isNaN(val)) val = 0;
                  if (val > 59) val = 59;
                  if (val < 0) val = 0;
                  setMinute(val);
                }}
                style={{
                  width: '60px',
                  height: '48px',
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1'
                }}
              />
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
          <md-icon-button onClick={() => setIsKeyboardMode(!isKeyboardMode)}>
            <md-icon>{isKeyboardMode ? 'schedule' : 'keyboard'}</md-icon>
          </md-icon-button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <md-text-button onClick={onClose} style={{ '--md-sys-color-primary': '#49454f' }}>
              Cancel
            </md-text-button>
            <md-text-button onClick={handleConfirm} style={{ '--md-sys-color-primary': '#b45309', '--md-text-button-label-text-weight': '800' }}>
              OK
            </md-text-button>
          </div>
        </div>
      </div>
    </div>
  );
}
