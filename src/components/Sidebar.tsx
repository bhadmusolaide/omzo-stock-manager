'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Egg,
  Leaf,
  Package,
  Settings,
  TrendingUp,
  Zap,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Bird,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/batches', label: 'Batches', icon: <Egg size={20} /> },
  { href: '/feed', label: 'Feed', icon: <Leaf size={20} /> },
  { href: '/dressed-inventory', label: 'Dressed Inventory', icon: <Bird size={20} /> },
  { href: '/orders', label: 'Orders', icon: <Package size={20} /> },
  { href: '/transactions', label: 'Transactions', icon: <TrendingUp size={20} /> },
  { href: '/reports', label: 'Reports', icon: <BarChart3 size={20} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

const Sidebar = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white h-full flex flex-col relative transition-colors duration-300 shadow-sm dark:shadow-none"
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Link href="/" className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">Omzo Farmz</h1>
                    <p className="text-xs text-gray-600 dark:text-slate-400">Stock Manager</p>
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          {isCollapsed && (
            <div className="flex justify-center">
              <div className="p-2 bg-green-500 rounded-lg">
                <Zap size={24} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: isCollapsed ? 2 : 4 }}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-green-600 shadow-md text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-slate-800/50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-300">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              © 2024 Omzo Farmz
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-full p-1 shadow-lg hover:shadow-xl transition-all duration-200 z-10"
      >
        <motion.div
          animate={{ rotate: isCollapsed ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isCollapsed ? (
            <ChevronRight size={16} className="text-gray-600 dark:text-slate-300" />
          ) : (
            <ChevronLeft size={16} className="text-gray-600 dark:text-slate-300" />
          )}
        </motion.div>
      </button>
    </motion.aside>
  );
};

export default Sidebar;