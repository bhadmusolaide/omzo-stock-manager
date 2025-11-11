import React from 'react';
import { render, screen } from '@testing-library/react';
import PendingPaymentsCarousel from '../PendingPaymentsCarousel';

// Mock the hooks
jest.mock('@/hooks/usePendingPayments', () => ({
  usePendingPayments: () => ({
    data: [
      {
        id: '1',
        orderNumber: 'ORD-20230101-0001',
        customerName: 'John Doe',
        totalAmount: 10000,
        amountPaid: 5000,
        balanceDue: 5000,
        paymentStatus: 'PARTIAL',
        orderDate: '2023-01-01',
      },
      {
        id: '2',
        orderNumber: 'ORD-20230102-0002',
        customerName: 'Jane Smith',
        totalAmount: 7500,
        amountPaid: 0,
        balanceDue: 7500,
        paymentStatus: 'PENDING',
        orderDate: '2023-01-02',
      },
    ],
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('@/hooks/useOrders', () => ({
  useUpdateOrder: () => ({
    mutateAsync: jest.fn(),
  }),
}));

// Mock the toast store
jest.mock('@/store/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PendingPaymentsCarousel', () => {
  it('renders correctly with pending orders', () => {
    render(<PendingPaymentsCarousel />);
    
    // Check if the carousel is visible
    expect(screen.getByText('Pending Payment')).toBeInTheDocument();
    
    // Check if the first order is displayed
    expect(screen.getByText('ORD-20230101-0001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    
    // Check if the balance due is displayed
    expect(screen.getByText('₦5,000.00')).toBeInTheDocument();
  });
});