import { ThemeProvider } from "./context/ThemeContext";
import "./globals.css";

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <title>Cinema User</title>
        <meta name="description" content="A cinema management application" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="transition-colors duration-300 bg-white dark:bg-gray-900 text-black dark:text-white">
        <ThemeProvider>
          {/* <Navbar /> */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
