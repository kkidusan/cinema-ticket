import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Home, User, Info } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="fixed top-0 w-full bg-white dark:bg-gray-900 shadow-md p-4 flex justify-between items-center z-50">
      <Button variant="ghost" onClick={() => setIsOpen(true)}>☰</Button>
      <h1 className="text-xl font-bold dark:text-white">My Portfolio</h1>
      <Button variant="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        {theme === 'dark' ? <Sun /> : <Moon />}
      </Button>
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-4 w-64 bg-white dark:bg-gray-800 h-full">
          <nav className="space-y-4">
            <Link href="/" className="flex items-center space-x-2 text-lg text-gray-700 dark:text-white">
              <Home /> <span>Home</span>
            </Link>
            <Link href="/about" className="flex items-center space-x-2 text-lg text-gray-700 dark:text-white">
              <Info /> <span>About</span>
            </Link>
            <Link href="/profile" className="flex items-center space-x-2 text-lg text-gray-700 dark:text-white">
              <User /> <span>Profile</span>
            </Link>
          </nav>
        </div>
      </Drawer>
    </div>
  );
}
