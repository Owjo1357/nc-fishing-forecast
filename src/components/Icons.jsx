// Small inline icons (24x24, stroke-based, deliberately simple)

function Icon({ children, size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconFish = (p) => (
  <Icon {...p}>
    <path d="M3 12c3-4 8-6 13-6 2 0 4 2.5 4 6s-2 6-4 6c-5 0-10-2-13-6Z" />
    <circle cx="16" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
    <path d="M20 12l3-3.5M20 12l3 3.5" />
    <path d="M8 9.5c-1 .8-1 3.2 0 5" />
  </Icon>
);
export const IconPin = (p) => (
  <Icon {...p}>
    <path d="M12 21s-6.5-5.9-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.1-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </Icon>
);
export const IconClock = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);
export const IconSunrise = (p) => (
  <Icon {...p}>
    <path d="M12 3v4.5" />
    <path d="M5 11l1.8 1.8M19 11l-1.8 1.8" />
    <path d="M2.5 11H4M20 11h1.5" />
    <path d="M6 17a6 6 0 0 1 12 0" />
    <path d="M2.5 20.5h19" />
  </Icon>
);
export const IconWind = (p) => (
  <Icon {...p}>
    <path d="M3 8h11a2.7 2.7 0 1 0-2.2-4.3" />
    <path d="M3 13h15.5a2.7 2.7 0 1 1-2.2 4.3" />
    <path d="M3 18h8" />
  </Icon>
);
export const IconWave = (p) => (
  <Icon {...p}>
    <path d="M2 14c1.8-2 3.6-2 5.4 0s3.6 2 5.4 0 3.6-2 5.4 0 3.6 2 5.4 0" />
    <path d="M2 19c1.8-2 3.6-2 5.4 0s3.6 2 5.4 0 3.6-2 5.4 0 3.6 2 5.4 0" />
  </Icon>
);
export const IconRain = (p) => (
  <Icon {...p}>
    <path d="M7 15a4.5 4.5 0 0 1 .8-8.9 5.5 5.5 0 0 1 10.6 1.6A4 4 0 0 1 17.5 15Z" />
    <path d="M8 18.5l-1 2M12 18.5l-1 2M16 18.5l-1 2" />
  </Icon>
);
export const IconTherm = (p) => (
  <Icon {...p}>
    <path d="M12 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0Z" />
  </Icon>
);
export const IconTide = (p) => (
  <Icon {...p}>
    <path d="M3 17c1.8-2 3.6-2 5.4 0s3.6 2 5.4 0 3.6-2 5.4 0" />
    <path d="M12 3v9M12 3l-2.5 2.5M12 3l2.5 2.5" />
  </Icon>
);
export const IconDrop = (p) => (
  <Icon {...p}>
    <path d="M12 3.5s6 6.8 6 11.2a6 6 0 0 1-12 0c0-4.4 6-11.2 6-11.2Z" />
  </Icon>
);
export const IconRefresh = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 21v-5h5" />
  </Icon>
);
