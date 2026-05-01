// src/hooks/useMembers.js
import {
  POSTCODE_REP_MAP,
  POSTCODE_DIVISIONS_MAP,
  POSTCODE_DISTRICTS_MAP,
  POSTCODE_REGIONS_MAP,
  REPRESENTATIVES,
  VIC_SENATORS,
  ASSEMBLY_MEMBERS,
  COUNCIL_MEMBERS,
  POSTCODE_DISTRICT_MAP,
  POSTCODE_REGION_MAP,
} from '../data/data.js';

if (typeof window !== 'undefined') {
  window.REPRESENTATIVES  = REPRESENTATIVES;
  window.ASSEMBLY_MEMBERS = ASSEMBLY_MEMBERS;
  window.COUNCIL_MEMBERS  = COUNCIL_MEMBERS;
}

export { VIC_SENATORS, ASSEMBLY_MEMBERS, COUNCIL_MEMBERS, REPRESENTATIVES };

export function isDataLoaded() {
  return !!(POSTCODE_REP_MAP && REPRESENTATIVES && VIC_SENATORS &&
            ASSEMBLY_MEMBERS && COUNCIL_MEMBERS &&
            POSTCODE_DISTRICT_MAP && POSTCODE_REGION_MAP);
}

/** All federal divisions for a postcode — length > 1 means split */
export function getDivisionsForPostcode(postcode) {
  const divs = POSTCODE_DIVISIONS_MAP?.[postcode];
  if (divs?.length) return divs;
  const single = POSTCODE_REP_MAP?.[postcode];
  return single ? [single] : [];
}

/** All state Assembly districts for a postcode — length > 1 means split */
export function getDistrictsForPostcode(postcode) {
  const dists = POSTCODE_DISTRICTS_MAP?.[postcode];
  if (dists?.length) return dists;
  const single = POSTCODE_DISTRICT_MAP?.[postcode];
  return single ? [single] : [];
}

/** All council regions for a postcode — length > 1 means spans regions */
export function getRegionsForPostcode(postcode) {
  const regs = POSTCODE_REGIONS_MAP?.[postcode];
  if (regs?.length) return regs;
  const single = POSTCODE_REGION_MAP?.[postcode];
  return single ? [single] : [];
}

/**
 * Full postcode lookup. The caller checks:
 *   result.divisions.length > 1  → show federal SuburbPicker
 *   result.districts.length > 1  → show StatePicker (district)
 */
export function lookupPostcode(postcode) {
  const divisions = getDivisionsForPostcode(postcode);
  if (!divisions.length) return null;

  const division  = divisions[0];
  const districts = getDistrictsForPostcode(postcode);
  const district  = districts[0] ?? null;
  const regions   = getRegionsForPostcode(postcode);
  const region    = regions[0] ?? null;

  return {
    division,  divisions,
    district,  districts,
    region,    regions,
    federalRep:     REPRESENTATIVES[division]  ?? null,
    assemblyMember: district ? (ASSEMBLY_MEMBERS[district] ?? null) : null,
    councilMembers: region   ? (COUNCIL_MEMBERS[region]    ?? [])   : [],
    senators:       VIC_SENATORS,
  };
}

export function getRepForElectorate(name)    { return REPRESENTATIVES[name]  ?? null; }
export function getAssemblyMember(district)  { return ASSEMBLY_MEMBERS[district] ?? null; }
export function getCouncilMembers(region)    { return COUNCIL_MEMBERS[region]    ?? []; }
