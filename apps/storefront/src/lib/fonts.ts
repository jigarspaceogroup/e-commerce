import localFont from "next/font/local";
import { IBM_Plex_Sans_Arabic } from "next/font/google";

export const clashDisplay = localFont({
  src: "../fonts/ClashDisplay-Bold.woff2",
  variable: "--font-clash",
  weight: "700",
  display: "swap",
});

export const satoshi = localFont({
  src: [
    { path: "../fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

export const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-arabic",
  display: "swap",
});
