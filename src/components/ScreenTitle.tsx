import React from 'react';
import { Typography } from '../ui/Typography';

interface ScreenTitleProps {
  children: React.ReactNode;
  sub?:     string;
  dark?:    boolean;
}

export const ScreenTitle: React.FC<ScreenTitleProps> = ({ children, sub }) => (
  <div style={{ padding: '4px 22px 18px' }}>
    <Typography variant="h1">{children}</Typography>
    {sub && <Typography variant="body" color="secondary" style={{ marginTop: 4, fontSize: 13 }}>{sub}</Typography>}
  </div>
);
