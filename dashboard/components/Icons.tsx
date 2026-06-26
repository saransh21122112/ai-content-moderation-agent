type IconProps = { size?: number; className?: string }

const I = (path: string, viewBox = '0 0 24 24') =>
  function Icon({ size = 16, className = '' }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {path.split('|').map((d, i) => <path key={i} d={d} />)}
      </svg>
    )
  }

export const ShieldIcon      = I('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z')
export const ScanIcon        = I('M3 7V5a2 2 0 0 1 2-2h2|M17 3h2a2 2 0 0 1 2 2v2|M21 17v2a2 2 0 0 1-2 2h-2|M7 21H5a2 2 0 0 1-2-2v-2|M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0|M12 9v-3|M12 15v3|M9 12H6|M18 12h-3')
export const LayersIcon      = I('M12 2L2 7l10 5 10-5-10-5z|M2 17l10 5 10-5|M2 12l10 5 10-5')
export const UsersIcon       = I('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2|M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M23 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75')
export const ScaleIcon       = I('M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z|M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z|M7 21h10|M12 3v18|M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2')
export const BarChartIcon    = I('M18 20V10|M12 20V4|M6 20v-6')
export const HistoryIcon     = I('M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8|M3 3v5h5|M12 7v5l4 2')
export const XIcon           = I('M18 6 6 18|M6 6l12 12')
export const ChevronRightIcon= I('M9 18l6-6-6-6')
export const ChevronLeftIcon = I('M15 18l-6-6 6-6')
export const CheckIcon       = I('M20 6 9 17l-5-5')
export const CheckCircleIcon = I('M22 11.08V12a10 10 0 1 1-5.93-9.14|M22 4 12 14.01l-3-3')
export const AlertIcon       = I('M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z|M12 9v4|M12 17h.01')
export const InfoIcon        = I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 16v-4|M12 8h.01')
export const UploadIcon      = I('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M17 8l-5-5-5 5|M12 3v12')
export const FileVideoIcon   = I('M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z|M14 2v5h5|M10 11l5 3-5 3z')
export const FileImageIcon   = I('M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z|M14 2v5h5|M10.5 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z|M20 18l-4-4-4 4')
export const RefreshIcon     = I('M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8|M21 3v5h-5|M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16|M8 16H3v5')
export const SearchIcon      = I('M21 21l-4.35-4.35|M17 11A6 6 0 1 0 5 11a6 6 0 0 0 12 0z')
export const FilterIcon      = I('M22 3H2l8 9.46V19l4 2v-8.54L22 3z')
export const ArrowRightIcon  = I('M5 12h14|M12 5l7 7-7 7')
export const ArrowLeftIcon   = I('M19 12H5|M12 19l-7-7 7-7')
export const CopyIcon        = I('M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z')
export const EyeIcon         = I('M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z|M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0')
export const PlusIcon        = I('M12 5v14|M5 12h14')
export const ZapIcon         = I('M13 2 3 14h9l-1 8 10-12h-9l1-8z')
export const ActivityIcon    = I('M22 12h-4l-3 9L9 3l-3 9H2')
export const ClockIcon       = I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M12 6v6l4 2')
export const UserIcon        = I('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2|M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z')
export const GlobeIcon       = I('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z|M2 12h20|M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z')
export const CodeIcon        = I('M16 18l6-6-6-6|M8 6l-6 6 6 6')
export const TerminalIcon    = I('M4 17l6-6-6-6|M12 19h8')
export const SendIcon        = I('M22 2L11 13|M22 2l-7 20-4-9-9-4 20-7z')
export const TrendUpIcon     = I('M23 6l-9.5 9.5-5-5L1 18|M17 6h6v6')
export const MinusIcon       = I('M5 12h14')
export const SpinnerIcon     = ({ size = 16, className = '' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className}`}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)
