import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCompactNumber(number: number, currency: string = '') {
    const formatter = Intl.NumberFormat('en-US', {
        // User requested full numbers (e.g. 1,000,000), not compact (1M)
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
    return currency ? `${currency}${formatter.format(number)}` : formatter.format(number);
}
