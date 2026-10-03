import type { LucideIcon, LucideProps } from "lucide-react";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, MapPin, UserRound, Check, Info, TriangleAlert, BusFront, Building2 } from "lucide-react";

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

