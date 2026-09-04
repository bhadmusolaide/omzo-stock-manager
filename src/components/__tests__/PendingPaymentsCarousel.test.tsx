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

jest.mock('@/store/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PendingPaymentsCarousel', () => {
  it('renders header with total outstanding', () => {
    render(<PendingPaymentsCarousel />);
    expect(screen.getByText('Pending Payments')).toBeInTheDocument();
    expect(screen.getByText(/2 orders/)).toBeInTheDocument();
  });

  it('renders pending orders list', () => {
    render(<PendingPaymentsCarousel />);
    expect(screen.getByText('ORD-20230101-0001')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('ORD-20230102-0002')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('shows balance due for each order', () => {
    render(<PendingPaymentsCarousel />);
    expect(screen.getAllByText(/₦/).length).toBeGreaterThan(0);
  });
});