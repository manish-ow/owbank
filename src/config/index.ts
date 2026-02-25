import usaConfig from './countries/usa.json';
import singaporeConfig from './countries/singapore.json';
import malaysiaConfig from './countries/malaysia.json';
import indonesiaConfig from './countries/indonesia.json';
import indiaConfig from './countries/india.json';
import southafricaConfig from './countries/southafrica.json';

export interface CountryConfig {
  country: string;
  countryCode: string;
  currency: {
    code: string;
    symbol: string;
    name: string;
    locale: string;
  };
  welcomeBonus: number;
  accountPrefix: string;
  localIdCard: {
    name: string;
    placeholder: string;
    format: string;
    required: boolean;
  };
  phoneFormat: {
    prefix: string;
    placeholder: string;
    maxLength: number;
  };
  branding: {
    welcomeImage: string;
    tagline: string;
    supportEmail: string;
    supportPhone: string;
  };
  features: {
    kafkaEnabled: boolean;
    aiChatEnabled: boolean;
    loansEnabled: boolean;
    cardsEnabled: boolean;
    internationalTransfers: boolean;
  };
  cardLimits: {
    standard: number;
    gold: number;
    platinum: number;
  };
  loanSettings: {
    maxAmount: number;
    minAmount: number;
    maxTenureMonths: number;
    minTenureMonths: number;
  };
}

const configs: Record<string, CountryConfig> = {
  usa: usaConfig as CountryConfig,
  singapore: singaporeConfig as CountryConfig,
  malaysia: malaysiaConfig as CountryConfig,
  indonesia: indonesiaConfig as CountryConfig,
  india: indiaConfig as CountryConfig,
  southafrica: southafricaConfig as CountryConfig,
};

// Default country - checks COUNTRY env var first, then NEXT_PUBLIC_COUNTRY, then defaults to 'usa'
const ACTIVE_COUNTRY = process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY || 'southafrica';

export function getCountryConfig(country?: string): CountryConfig {
  const key = (country || ACTIVE_COUNTRY).toLowerCase();
  return configs[key] || configs['southafrica'];
}

export function getAllCountries(): { key: string; name: string; code: string }[] {
  return Object.entries(configs).map(([key, config]) => ({
    key,
    name: config.country,
    code: config.countryCode,
  }));
}

export function formatCurrency(amount: number, country?: string): string {
  const config = getCountryConfig(country);
  return `${config.currency.symbol}${amount.toLocaleString(config.currency.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Export active config as default for convenience
const activeConfig = getCountryConfig();
export default activeConfig;
