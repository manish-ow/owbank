'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useTheme } from '@/theme';

const sizes = {
  sm: { box: 28, img: 20 },
  md: { box: 32, img: 24 },
  lg: { box: 40, img: 30 },
} as const;

interface BankLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function BankLogo({ size = 'md', className = '' }: BankLogoProps) {
  const theme = useTheme();
  const [imgError, setImgError] = useState(false);
  const { box, img } = sizes[size];

  if (imgError || !theme.logoUrl) {
    // Fallback to text logo
    return (
      <div
        className={`rounded-lg flex items-center justify-center ${className}`}
        style={{ width: box, height: box, backgroundColor: theme.primaryColor }}
      >
        <span
          className="font-bold"
          style={{ fontSize: img * 0.5, color: theme.textOnPrimary }}
        >
          {theme.logo}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg flex items-center justify-center overflow-hidden bg-white ${className}`}
      style={{ width: box, height: box }}
    >
      <Image
        src={theme.logoUrl}
        alt={`${theme.fullName} logo`}
        width={img}
        height={img}
        className="object-contain"
        onError={() => setImgError(true)}
      />
    </div>
  );
}
