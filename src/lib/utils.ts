import { Customer } from "@/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function fullName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean) as string[];
  return parts.join(" ");
}

export function customerDisplayName(c: Partial<Customer>) {
  return (c.companyName?.trim() || fullName(c.firstName, c.lastName) || "").trim();
}
