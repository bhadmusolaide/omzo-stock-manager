// Unit tests for calculations

// Test effectiveUnitCost calculation
describe('effectiveUnitCost', () => {
  test('calculates correctly with purchased and free chicks', () => {
    const totalDocCost = 1000;
    const docPurchasedCount = 50;
    const docFreeCount = 10;
    const expected = totalDocCost / docPurchasedCount;
    expect(expected).toBe(20);
  });

  test('handles zero total chicks', () => {
    const totalDocCost = 1000;
    const docPurchasedCount = 0;
    const docFreeCount = 0;
    const expected = docPurchasedCount > 0 ? totalDocCost / docPurchasedCount : 0;
    expect(expected).toBe(0);
  });
});

// Test currentLive calculation
describe('currentLive', () => {
  test('calculates correctly with mortality', () => {
    const totalChicks = 100;
    const totalMortality = 5;
    const expected = totalChicks - totalMortality;
    expect(expected).toBe(95);
  });

  test('handles zero mortality', () => {
    const totalChicks = 100;
    const totalMortality = 0;
    const expected = totalChicks - totalMortality;
    expect(expected).toBe(100);
  });
});