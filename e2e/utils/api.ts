import { APIRequestContext, expect } from '@playwright/test';

export const API_BASE = process.env.API_BASE || 'http://localhost:3001';

export interface Deal {
  id: number;
  cruiseLine: string;
  ship: string;
  price: number;
  duration: number;
  badgeType: string;
  region?: string;
  departureDate?: string;
  shipName?: string;
  cruise_line?: string;
  bookingUrl?: string;
}

export interface SailingDetail {
  sailing: {
    id: number;
    cruise_line: string;
    ship_name: string;
    departure_date: string;
    duration_days: number;
    departure_port: string;
    destination_region: string;
    itinerary: string[];
    booking_url?: string;
    deal_analysis?: string;
    deal_analysis_generated_at?: string;
  };
  cabinBreakdown: CabinBreakdown[];
}

export interface CabinBreakdown {
  cabin_type: string;
  base_fare_usd: number;
  port_fees_usd: number;
  gratuities_usd: number;
  total_out_the_door_usd: number;
  per_person_usd: number;
  per_person_per_day_usd: number;
}

export interface PriceForecast {
  sailing_id: number;
  current_price: number;
  forecast: 'rising' | 'falling' | 'stable';
  confidence: number;
  recommendation: 'buy_now' | 'wait' | 'monitor';
  analysis: string;
}

export interface DealAnalysis {
  dealScore: number;
  pricingDeepDive: string;
  priceTrend: 'rising' | 'falling' | 'stable';
  shipExperience: string;
  insiderTips: string[];
  verdict: string;
}

export async function fetchDealList(request: APIRequestContext, limit = 20): Promise<Deal[]> {
  const response = await request.get(`${API_BASE}/api/deals?limit=${limit}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function fetchFirstSailingId(request: APIRequestContext): Promise<number> {
  const deals = await fetchDealList(request, 1);
  expect(deals.length).toBeGreaterThan(0);
  return deals[0].id;
}

export async function fetchSailingDetail(request: APIRequestContext, sailingId: number): Promise<SailingDetail> {
  const response = await request.get(`${API_BASE}/api/sailing/${sailingId}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function fetchDealAnalysis(request: APIRequestContext, sailingId: number): Promise<string> {
  const response = await request.get(`${API_BASE}/api/analytics/deal-analysis/${sailingId}`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data || '';
}

export async function fetchPriceForecast(request: APIRequestContext, sailingId: number): Promise<string> {
  const response = await request.get(`${API_BASE}/api/analytics/price-forecast/${sailingId}`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data || '';
}

export async function triggerBatchAnalysis(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${API_BASE}/api/analytics/analyze-all`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data || '';
}

export async function fetchSoloFriendly(request: APIRequestContext): Promise<any> {
  const response = await request.get(`${API_BASE}/api/solo-friendly`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function searchCruises(request: APIRequestContext, params: Record<string, string>): Promise<any> {
  const searchParams = new URLSearchParams(params).toString();
  const response = await request.get(`${API_BASE}/api/search?${searchParams}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function fetchSailingBreakdown(
  request: APIRequestContext, 
  sailingId: number, 
  cabinType: string
): Promise<any> {
  const response = await request.get(`${API_BASE}/api/sailing-breakdown?sailingId=${sailingId}&cabinType=${cabinType}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

export async function fetchMarketSummary(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${API_BASE}/api/analytics/market-summary`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.data || '';
}

export function validateDeal(deal: Deal): void {
  expect(deal).toHaveProperty('id');
  expect(deal).toHaveProperty('cruiseLine');
  expect(deal).toHaveProperty('ship');
  expect(deal).toHaveProperty('price');
  expect(deal).toHaveProperty('duration');
  expect(deal).toHaveProperty('badgeType');
  expect(typeof deal.id).toBe('number');
  expect(typeof deal.price).toBe('number');
  expect(deal.price).toBeGreaterThan(0);
}

export function validateSailingDetail(sailing: SailingDetail): void {
  expect(sailing).toHaveProperty('sailing');
  expect(sailing.sailing).toHaveProperty('id');
  expect(sailing.sailing).toHaveProperty('line');
  expect(sailing.sailing).toHaveProperty('ship');
  expect(sailing).toHaveProperty('cabinBreakdown');
  expect(Array.isArray(sailing.cabinBreakdown)).toBeTruthy();
  expect(sailing.cabinBreakdown.length).toBeGreaterThan(0);
}

export function validateCabinBreakdown(cabin: CabinBreakdown): void {
  expect(cabin).toHaveProperty('cabin_type');
  expect(cabin).toHaveProperty('base_fare_usd');
  expect(cabin).toHaveProperty('port_fees_usd');
  expect(cabin).toHaveProperty('gratuities_usd');
  expect(cabin).toHaveProperty('total_out_the_door_usd');
  expect(cabin).toHaveProperty('per_person_usd');
  expect(cabin).toHaveProperty('per_person_per_day_usd');
  expect(typeof cabin.total_out_the_door_usd).toBe('number');
  expect(cabin.total_out_the_door_usd).toBeGreaterThan(0);
}

export function validateDealAnalysis(analysis: DealAnalysis): void {
  expect(analysis).toHaveProperty('dealScore');
  expect(analysis.dealScore).toBeGreaterThanOrEqual(0);
  expect(analysis.dealScore).toBeLessThanOrEqual(100);
  expect(analysis).toHaveProperty('pricingDeepDive');
  expect(analysis).toHaveProperty('priceTrend');
  expect(['rising', 'falling', 'stable']).toContain(analysis.priceTrend);
  expect(analysis).toHaveProperty('shipExperience');
  expect(analysis).toHaveProperty('insiderTips');
  expect(Array.isArray(analysis.insiderTips)).toBeTruthy();
  expect(analysis).toHaveProperty('verdict');
}

export function validatePriceForecast(forecast: PriceForecast): void {
  expect(forecast).toHaveProperty('forecast');
  expect(['rising', 'falling', 'stable']).toContain(forecast.forecast);
  expect(forecast).toHaveProperty('confidence');
  expect(forecast.confidence).toBeGreaterThanOrEqual(0);
  expect(forecast.confidence).toBeLessThanOrEqual(100);
  expect(forecast).toHaveProperty('recommendation');
  expect(['buy_now', 'wait', 'monitor']).toContain(forecast.recommendation);
}

export function createTestDeal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: 999999,
    cruiseLine: 'Test Cruise Line',
    ship: 'Test Ship',
    price: 1299,
    duration: 7,
    badgeType: 'drop',
    region: 'Caribbean',
    departureDate: '2026-01-15',
    ...overrides,
  };
}

export const TEST_CRUISE_LINES = [
  'Royal Caribbean International',
  'Carnival Cruise Line',
  'MSC Cruises',
  'Norwegian Cruise Line',
  'Disney Cruise Line',
  'Virgin Voyages',
  'Princess Cruises',
  'Celebrity Cruises',
  'Holland America Line',
];

export const TEST_REGIONS = [
  'Caribbean',
  'Mediterranean',
  'Alaska',
  'Northern Europe',
  'Bahamas',
  'Mexico',
  'Bermuda',
  'Canada & New England',
  'Hawaii',
  'Panama Canal',
];

export const TEST_CABIN_TYPES = ['Inside', 'Oceanview', 'Balcony', 'Suite'];

export const TEST_BADGE_TYPES = ['drop', 'steady', 'solo', 'hot', 'new'];