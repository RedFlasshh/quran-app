import "./globals.css";
import RegisterSW from "./register-sw";

export const metadata = {
  title: "Understanding the Quran",
  description: "The Quran, ayah by ayah — Arabic text, Saheeh International translation, and tafsir from Ibn Kathir, Ma'arif al-Qur'an, and al-Jalalayn.",
  manifest: "/manifest.json",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport = {
  themeColor: "#0E1A16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
