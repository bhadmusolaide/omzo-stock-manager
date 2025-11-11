import { calculateFeedPrediction } from '../feedPrediction';
import { calculateGrowthProjection } from '../growthProjection';
import { calculatePricingSuggestion } from '../pricingSuggestion';
import { calculateOrderProfitability } from '../orderProfitability';

// Mock the Supabase client
jest.mock('@/lib/supabase', () => ({
  createClientServiceRole: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

describe('AI Service Functions', () => {
  describe('calculateFeedPrediction', () => {
    it('should return null when batch is not found', async () => {
      const result = await calculateFeedPrediction('non-existent-batch');
      expect(result).toBeNull();
    });
  });

  describe('calculateGrowthProjection', () => {
    it('should return null when batch is not found', async () => {
      const result = await calculateGrowthProjection('non-existent-batch');
      expect(result).toBeNull();
    });
  });

  describe('calculatePricingSuggestion', () => {
    it('should return null when batch is not found', async () => {
      const result = await calculatePricingSuggestion('non-existent-batch');
      expect(result).toBeNull();
    });
  });

  describe('calculateOrderProfitability', () => {
    it('should return null when order is not found', async () => {
      const result = await calculateOrderProfitability('non-existent-order');
      expect(result).toBeNull();
    });
  });
});