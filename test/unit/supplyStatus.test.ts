import { getSupplyStatus } from '../../src/utils/supplyStatus.js';

describe('getSupplyStatus', () => {
    it('returns full at or above 50%', () => {
        expect(getSupplyStatus(20000, 20000)).toBe('full');
        expect(getSupplyStatus(10000, 20000)).toBe('full');
    });

    it('returns low between 25% and 50%', () => {
        expect(getSupplyStatus(9999, 20000)).toBe('low');
        expect(getSupplyStatus(5000, 20000)).toBe('low');
    });

    it('returns critical below 25% but above 0', () => {
        expect(getSupplyStatus(4999, 20000)).toBe('critical');
        expect(getSupplyStatus(1, 20000)).toBe('critical');
    });

    it('returns empty at 0', () => {
        expect(getSupplyStatus(0, 20000)).toBe('empty');
    });
});
