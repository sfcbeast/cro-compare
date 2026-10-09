// Prices read from provider pages on 2026-10-07. verified:true = number confirmed on the provider's own page.
// verified:false = came from a search snippet or third-party page; confirm before relying on it.
// Each tier: for = 'external' (outside academic user), 'industry', or 'any'; minQty = minimum samples for that price.
// "Internal" (own-institution) rates are not modelled; they are irrelevant to outside users.
window.FX_TO_USD = { USD: 1, EUR: 1.1, GBP: 1.3, CAD: 0.73 }; // approximate, for sorting only
window.VERIFIED_ON = "2026-10-07";

window.SERVICES = [
  { id: "sanger", name: "Sanger sequencing", category: "Sequencing", unit: "per sample" },
  { id: "plasmid", name: "Whole plasmid sequencing", category: "Sequencing", unit: "per plasmid" },
  { id: "rnaseq", name: "RNA-seq (library prep / sequencing)", category: "Sequencing", unit: "per sample" },
  { id: "amplicon", name: "16S / ITS amplicon sequencing", category: "Sequencing", unit: "per sample" },
  { id: "ic50", name: "Cytotoxicity / IC50 determination", category: "Cell-based assays", unit: "per compound" },
  { id: "screen", name: "Plate-based cell screening", category: "Cell-based assays", unit: "per plate" },
  { id: "viability", name: "Cell viability / proliferation assay", category: "Cell-based assays", unit: "quote" },
  { id: "reporter", name: "Reporter / nuclear receptor assay", category: "Cell-based assays", unit: "quote" },
  { id: "immunoonc", name: "Immuno-oncology cell assays", category: "Cell-based assays", unit: "quote" }
];

window.OFFERS = [
  // ---- Sanger ----
  { service: "sanger", provider: "Nevada Genomics Center (UNR)", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "external", price: 5.0 }, { for: "industry", price: 5.5 }],
    note: "Prices effective July 2022.", source: "https://www.unr.edu/genomics/pricing" },
  { service: "sanger", provider: "BYU Genomics & Bioinformatics Center", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "any", price: 7.0 }, { for: "any", price: 5.0, minQty: 6000 }],
    source: "https://biology.byu.edu/dnasc/policies-and-pricing" },
  { service: "sanger", provider: "Cornell Institute of Biotechnology", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "external", price: 5.4 }, { for: "industry", price: 7.1 }],
    source: "https://www.biotech.cornell.edu/core-facilities-brc/price-list/42" },
  { service: "sanger", provider: "UT Dallas Genome Center", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "external", price: 12 }, { for: "industry", price: 16 }],
    source: "https://cores.research.utdallas.edu/genome-center/service-and-rates" },
  { service: "sanger", provider: "MGH CCIB DNA Core", type: "Core facility", country: "US", verified: true,
    tiers: [
      { for: "external", price: 5.75 }, { for: "external", price: 3.6, minQty: 95 },
      { for: "industry", price: 6.34 }, { for: "industry", price: 3.98, minQty: 95 }],
    note: "Bulk price starts at 95 samples per order.",
    source: "https://dnacore.mgh.harvard.edu/new-cgi-bin/site/pages/sequencing_pages/seq.rates.amc.jsp" },

  // ---- Whole plasmid ----
  { service: "plasmid", provider: "Eurofins Genomics (US)", type: "Commercial", country: "US", verified: true,
    tiers: [{ for: "any", price: 15 }],
    note: "2.5–25 kb. Larger plasmids $30 (25–125 kb) and $60 (125–300 kb). 1 business day.", source: "https://eurofinsgenomics.com/en/products/nanopore-sequencing/" },
  { service: "plasmid", provider: "Eurofins Genomics (EU)", type: "Commercial", country: "EU", verified: true,
    tiers: [{ for: "any", price: 15, currency: "EUR" }],
    note: "From €15, 2.5–25 kb. VAT not stated.", source: "https://eurofinsgenomics.eu/en/next-generation-sequencing/applications/whole-plasmid-sequencing/" },
  { service: "plasmid", provider: "Novogene PlasmidGo", type: "Commercial", country: "UK", verified: true,
    tiers: [{ for: "any", price: 12, currency: "GBP" }],
    note: "1-day turnaround; annotated map and QC included.", source: "https://web.novogene.com/plasmidgo" },
  { service: "plasmid", provider: "GenScript (nanopore)", type: "Commercial", country: "US", verified: true,
    tiers: [{ for: "any", price: 15 }],
    note: "2.5–25 kb, 2 business days. Also offers NGS at $10 for plasmids up to 5 kb (3 days).", source: "https://www.genscript.com/whole-plasmid-sequencing.html" },
  { service: "plasmid", provider: "University of Guelph Genomics", type: "Core facility", country: "CA", verified: true,
    tiers: [{ for: "external", price: 19.5, currency: "CAD" }, { for: "industry", price: 25, currency: "CAD" }],
    note: "Run Tuesdays and Thursdays, next-day results. Prices in CAD.", source: "https://www.uoguelph.ca/aac/facilities/genomics/fees" },

  // ---- RNA-seq ----
  { service: "rnaseq", provider: "Plasmidsaurus 3' RNA-Seq", type: "Commercial", country: "US", verified: true,
    tiers: [{ for: "external", price: 50 }, { for: "industry", price: 80 }],
    note: "No minimums. Results in as little as 3 days.", source: "https://www.synbiobeta.com/read/plasmidsaurus-unveils-80-rna-seq-in-as-fast-as-3-days" },
  { service: "rnaseq", provider: "UT Dallas Genome Center (stranded total RNA + rRNA removal, eukaryotic)", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "external", price: 228 }, { for: "industry", price: 258 }],
    note: "Library prep only; sequencing is charged separately.", source: "https://cores.research.utdallas.edu/genome-center/service-and-rates" },
  { service: "rnaseq", provider: "Baylor College of Medicine GARP", type: "Core facility", country: "US", verified: true, tiers: [],
    note: "Published prices ($150–$290/sample) are for internal Baylor users only. External and commercial users must email GARPcore@bcm.edu for a quote.",
    source: "https://www.bcm.edu/sites/default/files/garp_pricingwebsite_-02-10-2026.docx" },

  { service: "rnaseq", provider: "UNT Genomics Center (stranded mRNA library prep)", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "any", price: 150 }],
    note: "External rate. Library prep only; sequencing is charged separately.", source: "https://research.unt.edu/resources/research-core-facilities/genomics-center/pricing.html" },

  // ---- 16S / ITS amplicon ----
  { service: "amplicon", provider: "UConn MARS", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "external", price: 21 }],
    note: "External non-profit rate; industry rate not listed.", source: "https://mars.uconn.edu/rates/" },
  { service: "amplicon", provider: "NDSU Biotech Innovation Core", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "any", price: 40.96 }],
    note: "External rate, single amplicon.", source: "https://www.ndsu.edu/biotech-innovation-core/sequencing/services-and-fees" },
  { service: "amplicon", provider: "UNT Genomics Center", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "any", price: 38 }],
    note: "External rate. Library prep only; sequencing is charged separately.", source: "https://research.unt.edu/resources/research-core-facilities/genomics-center/pricing.html" },

  // ---- Plate-based cell screening ----
  { service: "screen", provider: "University of Chicago Cellular Screening Center (384-well)", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "external", price: 47.97 }, { for: "industry", price: 56.97 }],
    note: "Per assay plate only. Cell line ($275–$1,045), compound plates and instrument time are extra. Start-up rate is $52.13.", source: "https://voices.uchicago.edu/cscenter/basic-page/fees" },
  { service: "screen", provider: "University of Chicago Cellular Screening Center (96-well)", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "external", price: 25.6 }, { for: "industry", price: 30.39 }],
    note: "Per assay plate only. Cell line, compound plates and instrument time are extra.", source: "https://voices.uchicago.edu/cscenter/basic-page/fees" },
  { service: "screen", provider: "Ohio State High Throughput Screening Core", type: "Core facility", country: "US", verified: true, tiers: [],
    note: "Published rates are internal only (about $7,500 setup plus $1/well). External and industry users must ask for a quote.", source: "https://u.osu.edu/highthroughputscreeningcore/cost-structure" },

  // ---- Cytotoxicity / IC50 ----
  { service: "ic50", provider: "NYU Langone Anti-infectives Screening Core", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "external", price: 150 }, { for: "external", price: 120, minQty: 4 }],
    note: "IC50 and TC50 determination. Listed for academic researchers; confirm eligibility for outside and industry users.",
    source: "https://med.nyu.edu/research/scientific-cores-shared-resources/anti-infectives-screening-core/fees" },

  // ---- Cell-based assays (quote only; no public price found) ----
  { service: "viability", provider: "NEBiolab", type: "CRO", country: "US", verified: true, tiers: [],
    note: "Proliferation / viability cell-based assays.", source: "https://www.nebiolab.com/cell-based-proliferation-viability-assay/amp" },
  { service: "viability", provider: "Creative Biolabs", type: "CRO", country: "US", verified: true, tiers: [],
    note: "In vitro cytotoxicity assessment.", source: "https://live-biotherapeutic.creative-biolabs.com/antifungal-drug-in-vitro-cytotoxicity-assessment-service.htm" },
  { service: "viability", provider: "Hemogenix (MTEC)", type: "CRO", country: "US", verified: true, tiers: [],
    note: "Hematotoxicity / stem cell assays.", source: "https://mtec-sc.org/life-sciences/hemogenix-r" },
  { service: "viability", provider: "Vanderbilt Vascular Biology CRO", type: "Core facility", country: "US", verified: true, tiers: [],
    note: "Endothelial proliferation, tube formation, migration. Fixed pricing exists but is only given on request.", source: "https://www.vumc.org/vo-cro/node/9" },
  { service: "reporter", provider: "INDIGO Biosciences", type: "CRO", country: "US", verified: true, tiers: [],
    note: "Nuclear receptor reporter assay services.", source: "https://indigobiosciences.com/services/" },
  { service: "immunoonc", provider: "Creative Biolabs", type: "CRO", country: "US", verified: true, tiers: [],
    note: "Immuno-oncology cell assays.", source: "https://www.creative-biolabs.com/immuno-oncology/immuno-oncology-cell-assay-services.htm" }
];

// default currency for tiers that don't specify one
window.OFFERS.forEach(o => o.tiers.forEach(t => { t.currency = t.currency || "USD"; }));
