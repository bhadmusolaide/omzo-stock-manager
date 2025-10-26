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
  X,
  Boxes,
  Bird,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

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

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSidebar = ({ isOpen, onClose }: MobileSidebarProps) => {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 text-gray-900 dark:text-white z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white">Omzo Farmz</h1>
                    <p className="text-xs text-gray-600 dark:text-slate-400">Stock Manager</p>
                  </div>
                </Link>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  <X size={20} className="text-gray-600 dark:text-slate-400" />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={onClose}>
                    <div
                      className={clsx(
                        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-green-600 shadow-md text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-slate-800/50 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                      )}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-300">
              <p>© 2024 Omzo Farmz</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileSidebar;