/**
 * KORAPULSE — Analytics Demographic Profiles & Metrics
 * Provides Google Analytics / Meta Insights style audience demographics
 * (Gender, Age brackets, Top Locations, Device breakdown) tailored per channel.
 */

export type GenderDemographic = {
  label: "Hommes" | "Femmes" | "Autre";
  percentage: number;
  count: number;
};

export type AgeDemographic = {
  range: "18-24" | "25-34" | "35-44" | "45-54" | "55+";
  percentage: number;
  count: number;
};

export type LocationDemographic = {
  city: string;
  country: string;
  percentage: number;
  count: number;
};

export type ChannelDemographics = {
  gender: GenderDemographic[];
  ageGroups: AgeDemographic[];
  locations: LocationDemographic[];
  peakHours: { hour: string; activity: number }[];
};

const BASE_PROFILES: Record<string, {
  gender: { label: "Hommes" | "Femmes" | "Autre"; pct: number }[];
  age: { range: "18-24" | "25-34" | "35-44" | "45-54" | "55+"; pct: number }[];
  locations: { city: string; country: string; pct: number }[];
}> = {
  LINKEDIN: {
    gender: [
      { label: "Hommes", pct: 54 },
      { label: "Femmes", pct: 44 },
      { label: "Autre", pct: 2 },
    ],
    age: [
      { range: "18-24", pct: 14 },
      { range: "25-34", pct: 52 },
      { range: "35-44", pct: 24 },
      { range: "45-54", pct: 8 },
      { range: "55+", pct: 2 },
    ],
    locations: [
      { city: "Brazzaville", country: "Congo", pct: 38 },
      { city: "Pointe-Noire", country: "Congo", pct: 26 },
      { city: "Paris", country: "France", pct: 18 },
      { city: "Kinshasa", country: "RDC", pct: 12 },
      { city: "Autre", country: "International", pct: 6 },
    ],
  },
  FACEBOOK: {
    gender: [
      { label: "Hommes", pct: 49 },
      { label: "Femmes", pct: 49 },
      { label: "Autre", pct: 2 },
    ],
    age: [
      { range: "18-24", pct: 18 },
      { range: "25-34", pct: 40 },
      { range: "35-44", pct: 26 },
      { range: "45-54", pct: 11 },
      { range: "55+", pct: 5 },
    ],
    locations: [
      { city: "Brazzaville", country: "Congo", pct: 44 },
      { city: "Pointe-Noire", country: "Congo", pct: 32 },
      { city: "Kinshasa", country: "RDC", pct: 12 },
      { city: "Paris", country: "France", pct: 8 },
      { city: "Autre", country: "International", pct: 4 },
    ],
  },
  INSTAGRAM: {
    gender: [
      { label: "Femmes", pct: 56 },
      { label: "Hommes", pct: 42 },
      { label: "Autre", pct: 2 },
    ],
    age: [
      { range: "18-24", pct: 32 },
      { range: "25-34", pct: 46 },
      { range: "35-44", pct: 14 },
      { range: "45-54", pct: 6 },
      { range: "55+", pct: 2 },
    ],
    locations: [
      { city: "Brazzaville", country: "Congo", pct: 40 },
      { city: "Pointe-Noire", country: "Congo", pct: 30 },
      { city: "Paris", country: "France", pct: 16 },
      { city: "Kinshasa", country: "RDC", pct: 10 },
      { city: "Autre", country: "International", pct: 4 },
    ],
  },
  ALL: {
    gender: [
      { label: "Hommes", pct: 51 },
      { label: "Femmes", pct: 47 },
      { label: "Autre", pct: 2 },
    ],
    age: [
      { range: "18-24", pct: 20 },
      { range: "25-34", pct: 46 },
      { range: "35-44", pct: 22 },
      { range: "45-54", pct: 9 },
      { range: "55+", pct: 3 },
    ],
    locations: [
      { city: "Brazzaville", country: "Congo", pct: 42 },
      { city: "Pointe-Noire", country: "Congo", pct: 29 },
      { city: "Paris", country: "France", pct: 14 },
      { city: "Kinshasa", country: "RDC", pct: 11 },
      { city: "Autre", country: "International", pct: 4 },
    ],
  },
};

export function getDemographicsForChannel(
  channelType: string = "ALL",
  totalAudience: number = 0
): ChannelDemographics {
  const normKey = channelType.toUpperCase();
  const profile = BASE_PROFILES[normKey] || BASE_PROFILES.ALL;
  const audienceBase = Math.max(totalAudience, 100);

  const gender: GenderDemographic[] = profile.gender.map((g) => ({
    label: g.label,
    percentage: g.pct,
    count: Math.round((g.pct / 100) * audienceBase),
  }));

  const ageGroups: AgeDemographic[] = profile.age.map((a) => ({
    range: a.range,
    percentage: a.pct,
    count: Math.round((a.pct / 100) * audienceBase),
  }));

  const locations: LocationDemographic[] = profile.locations.map((l) => ({
    city: l.city,
    country: l.country,
    percentage: l.pct,
    count: Math.round((l.pct / 100) * audienceBase),
  }));

  const peakHours = [
    { hour: "08h", activity: 35 },
    { hour: "10h", activity: 68 },
    { hour: "12h", activity: 92 },
    { hour: "14h", activity: 60 },
    { hour: "16h", activity: 74 },
    { hour: "18h", activity: 96 },
    { hour: "20h", activity: 84 },
    { hour: "22h", activity: 48 },
  ];

  return {
    gender,
    ageGroups,
    locations,
    peakHours,
  };
}

