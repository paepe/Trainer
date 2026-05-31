import React, { CSSProperties, ReactNode } from 'react';

interface BaseLayoutProps {
  children?: ReactNode;
  gap?: number | string;
  alignItems?: CSSProperties['alignItems'];
  justifyContent?: CSSProperties['justifyContent'];
  padding?: CSSProperties['padding'];
  margin?: CSSProperties['margin'];
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
  flex?: CSSProperties['flex'];
  flexWrap?: CSSProperties['flexWrap'];
}

/**
 * HStack (Horizontal Stack)
 * Lays out children horizontally using Flexbox.
 */
export function HStack({
  children,
  gap,
  alignItems = 'center',
  justifyContent = 'flex-start',
  padding,
  margin,
  flex,
  flexWrap,
  style,
  className,
  onClick,
}: BaseLayoutProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems,
        justifyContent,
        gap,
        padding,
        margin,
        flex,
        flexWrap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * VStack (Vertical Stack)
 * Lays out children vertically using Flexbox.
 */
export function VStack({
  children,
  gap,
  alignItems = 'stretch',
  justifyContent = 'flex-start',
  padding,
  margin,
  flex,
  flexWrap,
  style,
  className,
  onClick,
}: BaseLayoutProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems,
        justifyContent,
        gap,
        padding,
        margin,
        flex,
        flexWrap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Spacer
 * Fills available space inside a Flex container.
 */
interface SpacerProps {
  flex?: number;
  width?: number | string;
  height?: number | string;
}

export function Spacer({ flex = 1, width, height }: SpacerProps) {
  return (
    <div
      style={{
        flex: width || height ? 'none' : flex,
        width,
        height,
      }}
    />
  );
}
