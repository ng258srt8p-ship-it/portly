import SailingDetailClient from './SailingDetailClient';

// Generate static pages for all known sailing IDs
export function generateStaticParams() {
  return [
    { id: 'carnival_mardi-gras_2026-01-15_galveston_7' },
    { id: 'carnival_vista_2026-02-10_miami_5' },
    { id: 'carnival_panorama_2026-03-20_long-beach_7' },
    { id: 'carnival_jubilee_2026-04-05_galveston_7' },
    { id: 'princess_discovery_2026-03-05_los-angeles_10' },
    { id: 'princess_regal_2026-01-20_fort-lauderdale_7' },
    { id: 'princess_sapphire_2026-05-09_seattle_7' },
    { id: 'hal_nieuw-amsterdam_2026-04-12_fort-lauderdale_14' },
    { id: 'hal_koningsdam_2026-05-15_vancouver_7' },
    { id: 'cunard_qm2_2026-05-20_southampton_7' },
    { id: 'cunard_queen-anne_2026-08-01_hamburg_14' },
    { id: 'rci_wonder_2026-06-01_cape-canaveral_7' },
    { id: 'rci_harmony_2026-07-10_barcelona_7' },
    { id: 'rci_icon_2026-01-10_miami_7' },
    { id: 'ncl_encore_2026-02-15_miami_7' },
    { id: 'ncl_prima_2026-09-10_rome_10' },
    { id: 'msc_seascape_2026-03-01_miami_7' },
    { id: 'msc_virtuosa_2026-06-20_dubai_7' },
    { id: 'disney_wish_2026-04-18_port-canaveral_4' },
    { id: 'disney_fantasy_2026-12-05_port-canaveral_7' },
    { id: 'celebrity_apex_2026-01-25_fort-lauderdale_7' },
    { id: 'celebrity_beyond_2026-07-05_civitavecchia_10' },
  ];
}

export default function Page() {
  return <SailingDetailClient />;
}
