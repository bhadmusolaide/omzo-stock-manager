'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { toast } from '@/store/toast';
import { useSettings, useUpdateSettings, parseFeedConversionPresets } from '../hooks/useSettings';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function GeneralSettings() {
  const { data: settings, isLoading, error } = useSettings();

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || '');
      setCurrency(settings.currency || 'NGN');
      setCurrencySymbol(settings.currencySymbol || '₦');
      setLowStockThreshold(settings.lowStockThreshold || 50);
      setFcrPresets(parseFeedConversionPresets(settings.feedConversionPresets));
      setShowAiInsights(settings.showAiInsights ?? true);
    }
  }, [settings]);

  const updateSettingsMutation = useUpdateSettings();
  const { isPending } = updateSettingsMutation;

  const [resetOpen, setResetOpen] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/reset', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to reset data');
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success('All data has been reset successfully. The app now has a clean slate.');
      setResetOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to reset data');
      setResetOpen(false);
    },
  });

  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [currencySymbol, setCurrencySymbol] = useState('₦');
  const [lowStockThreshold, setLowStockThreshold] = useState(50);
  const [fcrPresets, setFcrPresets] = useState({ STARTER: 1.8, GROWER: 2.0, FINISHER: 2.2 });
  const [showAiInsights, setShowAiInsights] = useState(true);

  const handleSave = () => {
    updateSettingsMutation.mutate({
      companyName,
      currency,
      currencySymbol,
      lowStockThreshold,
      feedConversionPresets: JSON.stringify(fcrPresets),
      showAiInsights,
    }, {
      onSuccess: (data) => {
        // Update the form state with the returned data
        setCompanyName(data.companyName || '');
        setCurrency(data.currency || 'NGN');
        setCurrencySymbol(data.currencySymbol || '₦');
        setLowStockThreshold(data.lowStockThreshold || 50);
        setFcrPresets(parseFeedConversionPresets(data.feedConversionPresets));
        setShowAiInsights(data.showAiInsights ?? true);
        toast.success('Settings saved successfully');
      },
      onError: (error: any) => {
        toast.error('Failed to save settings: ' + (error.message || 'Unknown error'));
      },
    });
  };

  if (isLoading) {
    return <div className="text-gray-500">Loading settings...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4 border border-red-200 rounded">Error loading settings: {error.message}. Please ensure the database is set up correctly.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Update your farm or company details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Company Name</label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currency Settings</CardTitle>
          <CardDescription>Configure currency display</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency Code</label>
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                placeholder="NGN"
                maxLength={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Currency Symbol</label>
              <Input
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="₦"
                maxLength={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feed Conversion Ratio (FCR) Presets</CardTitle>
          <CardDescription>Set default FCR values for each feed type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(fcrPresets).map(([type, value]) => (
              <div key={type}>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">{type}</label>
                <Input
                  type="number"
                  step="0.1"
                  value={value}
                  onChange={(e) =>
                    setFcrPresets({
                      ...fcrPresets,
                      [type]: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Alerts</CardTitle>
          <CardDescription>Set minimum stock level for warnings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Low Stock Threshold (kg)</label>
            <Input
              type="number"
              step="1"
              value={lowStockThreshold}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setLowStockThreshold(value);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Features</CardTitle>
          <CardDescription>Control which features appear on the dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showAiInsights"
              checked={showAiInsights}
              onChange={(e) => setShowAiInsights(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="showAiInsights" className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Show AI Insights Widget
            </label>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isPending} className="w-full" variant="primary">
        {isPending ? 'Saving...' : 'Save Settings'}
      </Button>

      {/* Reset Section */}
      <Card className="border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-900/20 transition-colors duration-300">
        <CardHeader>
          <CardTitle className="text-red-800 dark:text-red-400">Reset All Data</CardTitle>
          <CardDescription className="text-red-600 dark:text-red-400">
            This will clear all data across batches, feeds, orders, transactions, and inventory.
            Settings and app structure will remain intact. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setResetOpen(true)}
            disabled={resetMutation.isPending}
            className="w-full border-red-500 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-colors duration-300"
          >
            Reset All Data
          </Button>
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={resetOpen}
        title="Confirm Data Reset"
        message="Are you absolutely sure? This will permanently delete all your data (batches, orders, transactions, etc.). This action cannot be recovered."
        confirmText="Yes, Reset Everything"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={resetMutation.isPending}
        onConfirm={() => resetMutation.mutate()}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  );
}

