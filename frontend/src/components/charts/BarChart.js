import React, { useState } from 'react';

export function GroupedBarChart({ data, height = 260, series }) {
  const [hover, setHover] = useState(null);
  const width = 800;
  const pad = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const allValues = data.flatMap((d) => series.map((s) => d[s.key]));
  const min = Math.min(0, ...allValues);
  const max = Math.max(...allValues, 0);

  const groupW = innerW / data.length;
  const barW = (groupW * 0.7) / series.length;

  const y = (v) => pad.top + innerH - ((v - min) / (max - min)) * innerH;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const v = min + (max - min) * p;
          return (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke="var(--border)" />
              <text x={pad.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
                {Math.round(v).toLocaleString()}
              </text>
            </g>
          );
        })}

        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={y(0)}
          y2={y(0)}
          stroke="var(--text-muted)"
          strokeWidth="1"
        />

        {data.map((d, i) => {
          const groupX = pad.left + i * groupW + groupW * 0.15;
          return (
            <g key={i}>
              {series.map((s, j) => {
                const v = d[s.key];
                const barY = v >= 0 ? y(v) : y(0);
                const barH = Math.abs(y(v) - y(0));
                return (
                  <rect
                    key={s.key}
                    x={groupX + j * barW}
                    y={barY}
                    width={barW - 2}
                    height={barH}
                    fill={s.color}
                    rx="2"
                    onMouseEnter={() => setHover({ i, j })}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
              <text
                x={groupX + (barW * series.length) / 2}
                y={height - 12}
                textAnchor="middle"
                fontSize="11"
                fill="var(--text-muted)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 10,
            transform: 'translateX(-50%)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 12,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{data[hover.i].label}</div>
          {series.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
              <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 500 }}>
                {data[hover.i][s.key].toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SimpleBarChart({ data, color = '#3b82f6', height = 260, valueFormatter = (v) => v }) {
  const [hover, setHover] = useState(null);
  const width = 800;
  const pad = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const max = Math.max(...data.map((d) => d.value)) * 1.1;
  const barW = (innerW / data.length) * 0.6;
  const y = (v) => pad.top + innerH - (v / max) * innerH;

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const v = max * p;
          return (
            <g key={i}>
              <line x1={pad.left} x2={width - pad.right} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray="3 3" />
              <text x={pad.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
                {Math.round(v)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = pad.left + (i + 0.5) * (innerW / data.length);
          return (
            <g key={i}>
              <rect
                x={cx - barW / 2}
                y={y(d.value)}
                width={barW}
                height={innerH - (y(d.value) - pad.top)}
                fill={hover === i ? '#60a5fa' : color}
                rx="3"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: 'fill 0.15s' }}
              />
              <text x={cx} y={height - 12} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hover !== null && (
        <div
          style={{
            position: 'absolute',
            left: `${((pad.left + (hover + 0.5) * (innerW / data.length)) / width) * 100}%`,
            top: 10,
            transform: 'translateX(-50%)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 600 }}>{data[hover].label}</div>
          <div style={{ color: 'var(--accent)' }}>{valueFormatter(data[hover].value)}</div>
        </div>
      )}
    </div>
  );
}