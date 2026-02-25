import { v4 as uuidv4 } from 'uuid';
import { getCountryConfig } from '@/config';

export function generateReference(): string {
  return `TXN-${uuidv4().slice(0, 8).toUpperCase()}`;
}

export function generateCardNumber(): string {
  const prefix = '4532'; // Visa-like
  let number = prefix;
  for (let i = 0; i < 12; i++) {
    number += Math.floor(Math.random() * 10);
  }
  return number;
}

export function generateCVV(): string {
  return String(Math.floor(100 + Math.random() * 900));
}

export function generateExpiryDate(): string {
  const now = new Date();
  const year = now.getFullYear() + 3;
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${month}/${year}`;
}

export function calculateEMI(principal: number, rate: number, tenure: number): number {
  const monthlyRate = rate / 12 / 100;
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
    (Math.pow(1 + monthlyRate, tenure) - 1);
  return Math.round(emi * 100) / 100;
}

export function getInterestRate(creditScore: number): number {
  if (creditScore >= 800) return 8.5;
  if (creditScore >= 720) return 10.5;
  if (creditScore >= 650) return 13.5;
  if (creditScore >= 580) return 16.5;
  return 21.0;
}

export function getCreditLimit(cardType: string): number {
  const config = getCountryConfig();
  switch (cardType) {
    case 'platinum': return config.cardLimits.platinum;
    case 'gold': return config.cardLimits.gold;
    case 'standard': return config.cardLimits.standard;
    default: return config.cardLimits.standard;
  }
}

export function maskCardNumber(cardNumber: string): string {
  return `****-****-****-${cardNumber.slice(-4)}`;
}
