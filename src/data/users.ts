import type { User } from '../types';

/** The 5 credentialed demo accounts (shown on the login page with one-click autofill). */
export const DEMO_USERS: User[] = [
  {
    email: 'national@jaldarpaan.in', password: 'Demo@1234', name: 'Arjun Mehta',
    role: 'national', org: 'NDRF HQ · National EOC', posting: 'National Command, New Delhi',
  },
  {
    email: 'state@jaldarpaan.in', password: 'Demo@1234', name: 'Meera Rawat, IAS',
    role: 'state', org: 'USDMA Uttarakhand', posting: 'State EOC, Dehradun',
    scopeState: 'Uttarakhand',
  },
  {
    email: 'district@jaldarpaan.in', password: 'Demo@1234', name: 'Col. S. Bisht (Retd.)',
    role: 'district', org: 'DDMA Rudraprayag', posting: 'District EOC, Rudraprayag',
    scopeState: 'Uttarakhand', scopeDistrict: 'Rudraprayag',
  },
  {
    email: 'field@jaldarpaan.in', password: 'Demo@1234', name: 'Ramesh Negi',
    role: 'field', org: 'SDRF Bat. 4', posting: 'Quick Response Team, Tilwara',
    scopeState: 'Uttarakhand', scopeDistrict: 'Rudraprayag',
  },
  {
    email: 'village@jaldarpaan.in', password: 'Demo@1234', name: 'Devki Devi',
    role: 'village', org: 'Gram Panchayat Chauras', posting: 'Village Pradhan',
    scopeState: 'Uttarakhand', scopeDistrict: 'Rudraprayag', scopeVillageId: 'VN-2220',
  },
];

export const ROLE_META: Record<User['role'], { label: string; desc: string; color: string }> = {
  national: { label: 'National Command', desc: 'Full access · user admin · national overview', color: 'text-violet-300 border-violet-400/40 bg-violet-500/15' },
  state: { label: 'State Control', desc: 'State-wide ops · analytics · sources', color: 'text-sky-300 border-sky-400/40 bg-sky-500/15' },
  district: { label: 'District EO', desc: 'District ops · issue advisories · drills', color: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/15' },
  field: { label: 'Field Officer', desc: 'Map · sensors · acknowledge alerts', color: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/15' },
  village: { label: 'Village Pradhan', desc: 'Own village status · alerts', color: 'text-amber-300 border-amber-400/40 bg-amber-500/15' },
};

/** Extended directory shown on the Admin page (directory-only; not login-enabled in demo). */
export const DIRECTORY_ONLY: Omit<User, 'password'>[] = [
  { email: 'ops.ndrf@jaldarpaan.in', name: 'Insp. K. Yadav', role: 'national', org: 'NDRF Bn-8', posting: 'Air Ops Cell, New Delhi' },
  { email: 'control.uk@jaldarpaan.in', name: 'S. Chauhan', role: 'state', org: 'USDMA', posting: 'State Ops Room, Dehradun' },
  { email: 'ddma.chamoli@jaldarpaan.in', name: 'H. Panwar', role: 'district', org: 'DDMA Chamoli', posting: 'District EOC, Gopeshwar' },
  { email: 'qrt.uk04@jaldarpaan.in', name: 'B. Tamta', role: 'field', org: 'SDRF Bat. 4', posting: 'QRT-2, Agastyamuni' },
  { email: 'pradhan.kalimath@jaldarpaan.in', name: 'M. Bhandari', role: 'village', org: 'GP Kalimath', posting: 'Village Pradhan' },
];
