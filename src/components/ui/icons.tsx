import type { LucideIcon, LucideProps } from "lucide-react";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, MapPin, UserRound, Check, Info, TriangleAlert, BusFront, Building2, LayoutDashboard } from "lucide-react";

// Keep a single visual contract for icons across the application.
function icon(Component: LucideIcon) {
  return function Icon(props: LucideProps) {
    return <Component strokeWidth={1.8} aria-hidden="true" {...props} />;
  };
}

export const ArrowLeftIcon = icon(ArrowLeft);
export const ArrowRightIcon = icon(ArrowRight);
export const CalendarIcon = icon(CalendarDays);
export const ClockIcon = icon(Clock);
export const LocationIcon = icon(MapPin);
export const UserIcon = icon(UserRound);
export const CheckIcon = icon(Check);
export const InfoIcon = icon(Info);
export const AlertIcon = icon(TriangleAlert);
export const BusIcon = icon(BusFront);
export const BuildingIcon = icon(Building2);
export const DashboardIcon = icon(LayoutDashboard);

export function SidebarCollapseIcon(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2.5" y="3.5" width="19" height="17" rx="3" />
      <path d="M2.5 6.5a3 3 0 0 1 3-3H9v17H5.5a3 3 0 0 1-3-3v-11Z" fill="currentColor" fillOpacity="0.18" stroke="none" />
      <line x1="9" y1="3.5" x2="9" y2="20.5" />
      <line x1="5" y1="8.5" x2="6.8" y2="8.5" />
      <line x1="5" y1="12" x2="6.8" y2="12" />
      <path d="m16.5 9.25-3 2.75 3 2.75" />
    </svg>
  );
}

export function SidebarExpandIcon(props: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2.5" y="3.5" width="19" height="17" rx="3" />
      <path d="M2.5 6.5a3 3 0 0 1 3-3H8v17H5.5a3 3 0 0 1-3-3v-11Z" fill="currentColor" fillOpacity="0.18" stroke="none" />
      <line x1="8" y1="3.5" x2="8" y2="20.5" />
      <path d="m13.5 9.25 3 2.75-3 2.75" />
    </svg>
  );
}


