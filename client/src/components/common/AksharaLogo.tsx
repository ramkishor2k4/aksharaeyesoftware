import React from 'react';

interface Props {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AksharaLogo({ className = '', showText = true, size = 'md' }: Props) {
  const iconHeight = size === 'sm' ? 36 : size === 'lg' ? 64 : 48;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official Akshara Eye Logo Icon (A + Eye) */}
      <svg
        width={iconHeight * 1.1}
        height={iconHeight}
        viewBox="0 0 140 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Outer 'A' Frame Structure */}
        <path
          d="M70 12 L118 102 H94 L70 54 L46 102 H22 L70 12 Z"
          fill="#0E2A47"
        />
        {/* Crossbar Curve */}
        <path
          d="M38 78 Q70 60 102 78 Q70 96 38 78 Z"
          fill="#0E2A47"
        />
        {/* Eye White Iris Backdrop */}
        <ellipse cx="70" cy="78" rx="26" ry="14" fill="#FFFFFF" />
        {/* Blue Eye Iris */}
        <circle cx="70" cy="78" r="10" fill="#2E74A0" />
        {/* Pupil */}
        <circle cx="70" cy="78" r="4.5" fill="#0E2A47" />
        {/* Eye Catchlight Highlight */}
        <circle cx="68" cy="76" r="2" fill="#FFFFFF" />

        {/* Subtext 'AKSHARA EYE HOSPITAL' under the icon mark */}
        <text
          x="70"
          y="108"
          textAnchor="middle"
          fill="#0E2A47"
          fontSize="9.5"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.8"
        >
          AKSHARA
        </text>
        <text
          x="70"
          y="117"
          textAnchor="middle"
          fill="#0E2A47"
          fontSize="7"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.5"
        >
          EYE HOSPITAL
        </text>
      </svg>

      {showText && (
        <div className="flex flex-col justify-center">
          <span
            className={`font-serif font-bold text-[#0E2A47] leading-none ${
              size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl'
            }`}
            style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}
          >
            Akshara Eye Hospital
          </span>
          <span
            className={`font-sans font-semibold text-[#2E74A0] tracking-[0.25em] uppercase ${
              size === 'sm' ? 'text-[9px] mt-0.5' : size === 'lg' ? 'text-sm mt-1' : 'text-xs mt-1'
            }`}
          >
            & OPTICALS
          </span>
        </div>
      )}
    </div>
  );
}
