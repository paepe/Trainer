import React from 'react';
import { Typography } from '../ui/Typography';

interface SectionLabelProps {
  children: React.ReactNode;
  dark?:    boolean;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children }) => (
  <Typography variant="overline" color="muted" style={{ marginBottom: 8, display: 'block' }}>
    {children}
  </Typography>
);
