export interface ConfigState {
  location: 'detroit' | 'windsor';
  courtCount: number;
  courtType: 'panoramic' | 'semi-panoramic' | 'standard';
  environment: 'outdoor' | 'indoor-existing' | 'indoor-new-build' | 'air-dome';
  glassUpgrade: 'standard' | 'laminated';
  turfGrade: 'fibrillated' | 'monofilament' | 'textured-premium';
  turfColor: 'blue' | 'green' | 'red' | 'terracotta';
  lightingClass: 'recreational' | 'club' | 'competition' | 'broadcast';
  supplierTier: 'european' | 'north-american' | 'factory-direct';
  amenities: AmenitySelection;
  technology: TechSelection;
  sustainability: SustainabilitySelection;
}

export interface AmenitySelection {
  lockerRooms: 'none' | 'basic' | 'premium';
  proShop: boolean;
  clubhouse: 'none' | 'basic' | 'premium';
  barCafe: boolean;
  viewingGallery: boolean;
  reception: boolean;
  coachingRoom: boolean;
  kidsArea: boolean;
}

export interface TechSelection {
  accessControl: boolean;
  cameraSystem: 'none' | 'basic' | 'pro';
  scoreboards: 'none' | 'basic' | 'pro';
  ballMachines: boolean;
  wifi: boolean;
  digitalSignage: boolean;
}

export interface SustainabilitySelection {
  solarCanopy: boolean;
  rainwaterHarvesting: boolean;
}

export interface LineItem {
  category: string;
  item: string;
  quantity: number;
  unitCost: number;
  total: number;
  note?: string;
}

export interface PricingResult {
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxLabel: string;
  taxAmount: number;
  grandTotal: number;
  currency: string;
  monthlyOps: MonthlyOps;
  roi: RoiProjection;
  notes: string[];
}

export interface MonthlyOps {
  lease: number;
  staff: number;
  utilities: number;
  insurance: number;
  software: number;
  maintenance: number;
  marketing: number;
  total: number;
}

export interface RoiProjection {
  year1Revenue: number;
  year1Ebitda: number;
  breakEvenMonths: number;
  paybackMonths: number;
  year3Revenue: number;
  year3Ebitda: number;
  revenuePerCourtPerDay: number;
}

interface LocationData {
  currency: string;
  taxRate: number;
  taxLabel: string;
  leasePerSqft: number;
  laborMultiplier: number;
  electricityKwh: number;
  propertyTaxRate: number;
  minWage: number;
  staffWageAvg: number;
  managerSalary: number;
  insuranceAnnual: number;
  permitPerCourt: number;
  foundationBase: number;
  shippingEuropean: number;
  shippingAsian: number;
  shippingNA: number;
  importDutyEU: number;
  importDutyAsia: number;
  installPerCourt: number;
}

const LOCATION_DATA: Record<ConfigState['location'], LocationData> = {
  detroit: {
    currency: 'USD',
    taxRate: 0.06,
    taxLabel: 'Michigan sales tax (6%)',
    leasePerSqft: 8.5,
    laborMultiplier: 1.05,
    electricityKwh: 0.18,
    propertyTaxRate: 0.0822,
    minWage: 13.73,
    staffWageAvg: 17,
    managerSalary: 72000,
    insuranceAnnual: 18000,
    permitPerCourt: 2500,
    foundationBase: 10000,
    shippingEuropean: 12000,
    shippingAsian: 10000,
    shippingNA: 3000,
    importDutyEU: 0.10,
    importDutyAsia: 0.30,
    installPerCourt: 10000,
  },
  windsor: {
    currency: 'CAD',
    taxRate: 0.13,
    taxLabel: 'Ontario HST (13%)',
    leasePerSqft: 11,
    laborMultiplier: 0.95,
    electricityKwh: 0.15,
    propertyTaxRate: 0.0479,
    minWage: 17.6,
    staffWageAvg: 20,
    managerSalary: 85000,
    insuranceAnnual: 22000,
    permitPerCourt: 2000,
    foundationBase: 12000,
    shippingEuropean: 10000,
    shippingAsian: 12000,
    shippingNA: 4000,
    importDutyEU: 0.0,
    importDutyAsia: 0.25,
    installPerCourt: 12000,
  },
};

const COURT_BASE_PRICE = {
  panoramic: { european: 52000, 'north-american': 40000, 'factory-direct': 22000 },
  'semi-panoramic': { european: 42000, 'north-american': 32000, 'factory-direct': 18000 },
  standard: { european: 34000, 'north-american': 26000, 'factory-direct': 14000 },
} as const;

const ENVIRONMENT_ADDER = {
  outdoor: 0,
  'indoor-existing': 15000,
  'indoor-new-build': 45000,
  'air-dome': 28000,
} as const;

const GLASS_ADDER = { standard: 0, laminated: 5000 } as const;

const TURF_ADDER = { fibrillated: 0, monofilament: 3500, 'textured-premium': 9000 } as const;

const LIGHTING_COST = {
  recreational: 2800,
  club: 5000,
  competition: 8000,
  broadcast: 15000,
} as const;

const AMENITY_COSTS = {
  lockerRooms: { none: 0, basic: 45000, premium: 95000 },
  proShop: 28000,
  clubhouse: { none: 0, basic: 35000, premium: 80000 },
  barCafe: 85000,
  viewingGalleryPerCourt: 15000,
  reception: 18000,
  coachingRoom: 12000,
  kidsArea: 12000,
} as const;

const TECH_COSTS = {
  accessControlBase: 5000,
  accessControlPerCourt: 1200,
  cameraBasic: 1650,
  cameraPro: 10000,
  scoreboardBasic: 500,
  scoreboardPro: 3000,
  ballMachine: 2500,
  wifi: 6000,
  digitalSignage: 10000,
} as const;

function sqftPerCourt(env: ConfigState['environment']): number {
  if (env === 'outdoor') return 280;
  return 320;
}

export function calculatePricing(config: ConfigState): PricingResult {
  const loc = LOCATION_DATA[config.location];
  const items: LineItem[] = [];
  const notes: string[] = [];
  const n = config.courtCount;

  const courtBase = COURT_BASE_PRICE[config.courtType][config.supplierTier];
  const laborAdj = loc.laborMultiplier;

  let shippingPerCourt = loc.shippingNA;
  let dutyRate = 0;
  if (config.supplierTier === 'european') {
    shippingPerCourt = loc.shippingEuropean;
    dutyRate = loc.importDutyEU;
    if (config.location === 'windsor' && dutyRate === 0) {
      notes.push('CETA: zero duty on EU-origin courts imported into Canada.');
    }
  } else if (config.supplierTier === 'factory-direct') {
    shippingPerCourt = loc.shippingAsian;
    dutyRate = loc.importDutyAsia;
    if (dutyRate > 0) {
      notes.push(`Import duty of ${(dutyRate * 100).toFixed(0)}% applied on factory-direct courts (steel tariffs).`);
    }
  }

  const courtStructureCost = courtBase * (1 + dutyRate);
  items.push({
    category: 'Court structure',
    item: `${config.courtType} court (${config.supplierTier} supplier)`,
    quantity: n,
    unitCost: Math.round(courtStructureCost),
    total: Math.round(courtStructureCost * n),
  });

  items.push({
    category: 'Shipping',
    item: `Freight to ${config.location === 'detroit' ? 'Detroit, MI' : 'Windsor, ON'}`,
    quantity: n,
    unitCost: shippingPerCourt,
    total: shippingPerCourt * n,
  });

  const installCost = Math.round(loc.installPerCourt * laborAdj);
  items.push({
    category: 'Installation',
    item: `Assembly, testing, and QA${config.environment !== 'outdoor' ? ' (indoor)' : ''}`,
    quantity: n,
    unitCost: installCost,
    total: installCost * n,
  });

  const envAdder = ENVIRONMENT_ADDER[config.environment];
  if (envAdder > 0) {
    const label =
      config.environment === 'indoor-existing'
        ? 'Indoor conversion (HVAC, ceiling, fire suppression)'
        : config.environment === 'indoor-new-build'
          ? 'New steel building shell (per court share)'
          : 'Air dome structure (per court share)';
    items.push({
      category: 'Building',
      item: label,
      quantity: n,
      unitCost: Math.round(envAdder * laborAdj),
      total: Math.round(envAdder * laborAdj * n),
    });
  }

  const needsFreezethaw =
    config.location === 'windsor' || config.environment !== 'outdoor';
  const foundationCost = needsFreezethaw
    ? Math.round(loc.foundationBase * 1.6 * laborAdj)
    : Math.round(loc.foundationBase * laborAdj);
  items.push({
    category: 'Foundation',
    item: needsFreezethaw
      ? 'Reinforced slab, air-entrained concrete (freeze-thaw rated)'
      : 'Reinforced concrete slab (standard)',
    quantity: n,
    unitCost: foundationCost,
    total: foundationCost * n,
    note: needsFreezethaw ? 'Air-entrained concrete mandatory for this climate' : undefined,
  });

  const glassAdder = GLASS_ADDER[config.glassUpgrade];
  if (glassAdder > 0) {
    items.push({
      category: 'Glass upgrade',
      item: 'Laminated safety glass (2x6mm + PVB interlayer)',
      quantity: n,
      unitCost: glassAdder,
      total: glassAdder * n,
    });
  }

  const turfAdder = TURF_ADDER[config.turfGrade];
  const turfBase = 5500;
  items.push({
    category: 'Playing surface',
    item: `${config.turfGrade} turf (${config.turfColor}) + silica sand infill`,
    quantity: n,
    unitCost: turfBase + turfAdder,
    total: (turfBase + turfAdder) * n,
  });

  items.push({
    category: 'Lighting',
    item: `LED system (${config.lightingClass}, ${config.lightingClass === 'recreational' ? '200' : config.lightingClass === 'club' ? '300' : config.lightingClass === 'competition' ? '500' : '1000'} lux)`,
    quantity: n,
    unitCost: LIGHTING_COST[config.lightingClass],
    total: LIGHTING_COST[config.lightingClass] * n,
  });

  items.push({
    category: 'Permits',
    item: 'Building permits, engineering, inspections',
    quantity: n,
    unitCost: loc.permitPerCourt,
    total: loc.permitPerCourt * n,
  });

  // Amenities (facility-wide)
  const { amenities } = config;
  if (amenities.lockerRooms !== 'none') {
    const cost = AMENITY_COSTS.lockerRooms[amenities.lockerRooms];
    items.push({ category: 'Amenities', item: `Locker rooms and showers (${amenities.lockerRooms})`, quantity: 1, unitCost: cost, total: cost });
  }
  if (amenities.proShop) {
    items.push({ category: 'Amenities', item: 'Pro shop buildout', quantity: 1, unitCost: AMENITY_COSTS.proShop, total: AMENITY_COSTS.proShop });
  }
  if (amenities.clubhouse !== 'none') {
    const cost = AMENITY_COSTS.clubhouse[amenities.clubhouse];
    items.push({ category: 'Amenities', item: `Clubhouse and lounge (${amenities.clubhouse})`, quantity: 1, unitCost: cost, total: cost });
  }
  if (amenities.barCafe) {
    items.push({ category: 'Amenities', item: 'Bar, cafe, and food service', quantity: 1, unitCost: AMENITY_COSTS.barCafe, total: AMENITY_COSTS.barCafe });
  }
  if (amenities.viewingGallery) {
    items.push({ category: 'Amenities', item: 'Viewing gallery and spectator seating', quantity: n, unitCost: AMENITY_COSTS.viewingGalleryPerCourt, total: AMENITY_COSTS.viewingGalleryPerCourt * n });
  }
  if (amenities.reception) {
    items.push({ category: 'Amenities', item: 'Reception and check-in area', quantity: 1, unitCost: AMENITY_COSTS.reception, total: AMENITY_COSTS.reception });
  }
  if (amenities.coachingRoom) {
    items.push({ category: 'Amenities', item: 'Coaching and instruction room', quantity: 1, unitCost: AMENITY_COSTS.coachingRoom, total: AMENITY_COSTS.coachingRoom });
  }
  if (amenities.kidsArea) {
    items.push({ category: 'Amenities', item: 'Kids play area', quantity: 1, unitCost: AMENITY_COSTS.kidsArea, total: AMENITY_COSTS.kidsArea });
  }

  // Technology
  const { technology } = config;
  if (technology.accessControl) {
    const cost = TECH_COSTS.accessControlBase + TECH_COSTS.accessControlPerCourt * n;
    items.push({ category: 'Technology', item: 'Access control (app-based entry)', quantity: 1, unitCost: cost, total: cost });
  }
  if (technology.cameraSystem !== 'none') {
    const perCourt = technology.cameraSystem === 'basic' ? TECH_COSTS.cameraBasic : TECH_COSTS.cameraPro;
    items.push({ category: 'Technology', item: `Camera system (${technology.cameraSystem})`, quantity: n, unitCost: perCourt, total: perCourt * n });
  }
  if (technology.scoreboards !== 'none') {
    const perCourt = technology.scoreboards === 'basic' ? TECH_COSTS.scoreboardBasic : TECH_COSTS.scoreboardPro;
    items.push({ category: 'Technology', item: `Electronic scoreboards (${technology.scoreboards})`, quantity: n, unitCost: perCourt, total: perCourt * n });
  }
  if (technology.ballMachines) {
    items.push({ category: 'Technology', item: 'Ball machines', quantity: n, unitCost: TECH_COSTS.ballMachine, total: TECH_COSTS.ballMachine * n });
  }
  if (technology.wifi) {
    items.push({ category: 'Technology', item: 'Commercial Wi-Fi infrastructure', quantity: 1, unitCost: TECH_COSTS.wifi, total: TECH_COSTS.wifi });
  }
  if (technology.digitalSignage) {
    items.push({ category: 'Technology', item: 'Digital signage (4 screens + software)', quantity: 1, unitCost: TECH_COSTS.digitalSignage, total: TECH_COSTS.digitalSignage });
  }

  // Sustainability
  if (config.sustainability.solarCanopy) {
    items.push({ category: 'Sustainability', item: 'Solar canopy (per court roof)', quantity: n, unitCost: 100000, total: 100000 * n, note: '30% ITC federal tax credit may apply (USA)' });
  }
  if (config.sustainability.rainwaterHarvesting) {
    items.push({ category: 'Sustainability', item: 'Rainwater harvesting system', quantity: 1, unitCost: 6000, total: 6000 });
  }

  // Feera booking (always included, $0)
  items.push({ category: 'Technology', item: 'Feera court booking platform', quantity: 1, unitCost: 0, total: 0, note: 'Included with Feera Courts' });

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const taxAmount = Math.round(subtotal * loc.taxRate);
  const grandTotal = subtotal + taxAmount;

  // Monthly ops
  const totalSqft = sqftPerCourt(config.environment) * n + 800;
  const monthlyLease = Math.round((totalSqft * loc.leasePerSqft) / 12);
  const staffCount = Math.max(3, Math.ceil(n * 1.5));
  const monthlyStaff = Math.round(
    loc.managerSalary / 12 + staffCount * loc.staffWageAvg * 160,
  );
  const monthlyUtilities = Math.round(
    n * 1.4 * loc.electricityKwh * 30 * 12 + 800,
  );
  const monthlyInsurance = Math.round(loc.insuranceAnnual / 12);
  const monthlySoftware = 800;
  const monthlyMaintenance = Math.round(n * 250);
  const monthlyMarketing = Math.round(1500 + n * 200);
  const monthlyTotal =
    monthlyLease +
    monthlyStaff +
    monthlyUtilities +
    monthlyInsurance +
    monthlySoftware +
    monthlyMaintenance +
    monthlyMarketing;

  // ROI
  const peakRate = config.location === 'detroit' ? 55 : 70;
  const offPeakRate = config.location === 'detroit' ? 30 : 40;
  const avgRate = (peakRate * 0.4 + offPeakRate * 0.6);
  const slotsPerDay = 12;
  const y1Occupancy = 0.38;
  const y3Occupancy = 0.65;
  const revenuePerCourtPerDay = Math.round(avgRate * slotsPerDay * y1Occupancy);
  const year1Revenue = Math.round(revenuePerCourtPerDay * n * 365);
  const year1Costs = monthlyTotal * 12;
  const year1Ebitda = year1Revenue - year1Costs;
  const year3Revenue = Math.round(
    avgRate * slotsPerDay * y3Occupancy * n * 365,
  );
  const year3Ebitda = Math.round(year3Revenue - year1Costs * 1.05);
  const breakEvenMonths = year1Ebitda > 0 ? Math.round(year1Costs / (year1Revenue / 12)) : Math.round(year1Costs / (year3Revenue / 12 - year1Costs / 12 * 1.05));
  const paybackMonths = Math.round(grandTotal / Math.max(1, year3Ebitda / 12));

  return {
    lineItems: items,
    subtotal,
    taxRate: loc.taxRate,
    taxLabel: loc.taxLabel,
    taxAmount,
    grandTotal,
    currency: loc.currency,
    monthlyOps: {
      lease: monthlyLease,
      staff: monthlyStaff,
      utilities: monthlyUtilities,
      insurance: monthlyInsurance,
      software: monthlySoftware,
      maintenance: monthlyMaintenance,
      marketing: monthlyMarketing,
      total: monthlyTotal,
    },
    roi: {
      year1Revenue,
      year1Ebitda,
      breakEvenMonths: Math.max(6, breakEvenMonths),
      paybackMonths: Math.max(12, paybackMonths),
      year3Revenue,
      year3Ebitda,
      revenuePerCourtPerDay,
    },
    notes,
  };
}

export function defaultConfig(): ConfigState {
  return {
    location: 'detroit',
    courtCount: 4,
    courtType: 'semi-panoramic',
    environment: 'indoor-existing',
    glassUpgrade: 'standard',
    turfGrade: 'monofilament',
    turfColor: 'blue',
    lightingClass: 'club',
    supplierTier: 'european',
    amenities: {
      lockerRooms: 'basic',
      proShop: true,
      clubhouse: 'basic',
      barCafe: false,
      viewingGallery: true,
      reception: true,
      coachingRoom: false,
      kidsArea: false,
    },
    technology: {
      accessControl: true,
      cameraSystem: 'basic',
      scoreboards: 'basic',
      ballMachines: false,
      wifi: true,
      digitalSignage: false,
    },
    sustainability: {
      solarCanopy: false,
      rainwaterHarvesting: false,
    },
  };
}

export function formatCurrency(amount: number, currency: string): string {
  const prefix = currency === 'CAD' ? 'CA$' : '$';
  if (amount >= 1_000_000) {
    return `${prefix}${(amount / 1_000_000).toFixed(2)}M`;
  }
  return `${prefix}${amount.toLocaleString('en-US')}`;
}
