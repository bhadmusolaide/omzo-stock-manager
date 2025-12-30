'use client';

import "./globals.css";
import Providers from "@/components/Providers";
import Sidebar from "@/components/Sidebar";
import MobileSidebar from "@/components/MobileSidebar";
import Topbar from "@/components/Topbar";
import { usePathname } from 'next/navigation';
import { metadata } from './metadata';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { useMobile } from '@/hooks/useMobile';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';
  const { isMobile } = useMobile();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {isLoginPage ? (
            children
          ) : (
            <div className="flex h-screen">
              {!isMobile && <Sidebar />}
              {isMobile && (
                <>
                  <MobileSidebar 
                    isOpen={isMobileSidebarOpen} 
                    onClose={() => setIsMobileSidebarOpen(false)} 
                  />
                  {!isMobileSidebarOpen && (
                    <button
                      onClick={toggleMobileSidebar}
                      className="fixed top-20 left-4 z-30 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md"
                    >
                      <Menu size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                  )}
                </>
              )}
              <div className="flex-1 flex flex-col">
                <Topbar />
                <main className="flex-1 p-4 bg-gray-50 dark:bg-slate-800 transition-colors duration-300 overflow-auto">
                  {children}
                </main>
              </div>
            </div>
          )}
        </Providers>
      </body>
    </html>
  );
}