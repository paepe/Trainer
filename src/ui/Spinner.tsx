import React from 'react';

export interface SpinnerProps {
  color?: string;
  trackColor?: string;
  size?: number;
  thickness?: number;
}

export function Spinner({ color = 'currentColor', trackColor, size = 16, thickness = 2.5 }: SpinnerProps) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `${thickness}px solid ${trackColor ?? `${color}44`}`, borderTopColor: color,
      animation: 'spin .7s linear infinite',
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export interface LoadingStateProps {
  color?: string;
  size?: number;
  label?: string;
}

export function LoadingState({ color = 'currentColor', size = 28, label }: LoadingStateProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
      <Spinner color={color} size={size} />
      {label && <div style={{ fontSize: 13, color, opacity: 0.7 }}>{label}</div>}
    </div>
  );
}
