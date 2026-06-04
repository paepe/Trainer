import React from 'react';
import { THEME_VARS as DARK } from '../../theme/tokens';

interface HintProps {
  children: React.ReactNode;
}

export const Hint: React.FC<HintProps> = ({ children }) => (
  <p style={{
    margin:      '0 0 18px',
    fontSize:    12.5,
    fontStyle:   'italic',
    color:       DARK.textSec,
    lineHeight:  1.5,
  }}>
    &#x201C;{children}&#x201D;
  </p>
);
