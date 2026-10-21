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
    partial: true, note: "Library prep only; sequencing is charged separately.", source: "https://cores.research.utdallas.edu/genome-center/service-and-rates" },
  { service: "rnaseq", provider: "Baylor College of Medicine GARP", type: "Core facility", country: "US", verified: true, tiers: [],
    note: "Published prices ($150–$290/sample) are for internal Baylor users only. External and commercial users must email GARPcore@bcm.edu for a quote.",
    source: "https://www.bcm.edu/sites/default/files/garp_pricingwebsite_-02-10-2026.docx" },

  { service: "rnaseq", provider: "UNT Genomics Center (stranded mRNA library prep)", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "any", price: 150 }],
    partial: true, note: "External rate. Library prep only; sequencing is charged separately.", source: "https://research.unt.edu/resources/research-core-facilities/genomics-center/pricing.html" },

  // ---- 16S / ITS amplicon ----
  { service: "amplicon", provider: "UConn MARS", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "external", price: 21 }],
    note: "External non-profit rate; industry rate not listed.", source: "https://mars.uconn.edu/rates/" },
  { service: "amplicon", provider: "NDSU Biotech Innovation Core", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "any", price: 40.96 }],
    note: "External rate, single amplicon.", source: "https://www.ndsu.edu/biotech-innovation-core/sequencing/services-and-fees" },
  { service: "amplicon", provider: "UNT Genomics Center", type: "Core facility", country: "US", verified: true,
    tiers: [{ for: "any", price: 38 }],
    partial: true, note: "External rate. Library prep only; sequencing is charged separately.", source: "https://research.unt.edu/resources/research-core-facilities/genomics-center/pricing.html" },

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
    note: "Immuno-oncology cell assays.", source: "https://www.creative-biolabs.com/immuno-oncology/immuno-oncology-cell-assay-services.htm" },

  // ===== Added 2026-10-12 (each read on the provider's own page; `checked` is that date) =====
  // ---- Sanger ----
  { service: "sanger", provider: "University of Chicago DNA Sequencing Core", type: "Core facility", country: "US", verified: true, checked: "2026-10-12",
    tiers: [
      { for: "external", price: 8.75 }, { for: "external", price: 5.9, minQty: 16 }, { for: "external", price: 5.0, minQty: 94 },
      { for: "industry", price: 15.45 }, { for: "industry", price: 10.45, minQty: 16 }, { for: "industry", price: 8.85, minQty: 94 }],
    note: "Rates effective July 1, 2026; tiers are by total reactions in the order. Start-up companies pay $11.60 / $7.85 / $6.65 at the same tiers.",
    source: "https://voices.uchicago.edu/dnaseq/fees" },
  { service: "sanger", provider: "Eton Bioscience", type: "Commercial", country: "US", verified: true, checked: "2026-10-12", tiers: [],
    note: "No prices published; ask sales@etonbio.com. Failed first runs on full service are repeated at no extra charge.",
    source: "https://etonbio.com/sequencing/dna_sequencing_pricing.php" },
  { service: "sanger", provider: "Azenta / Genewiz", type: "Commercial", country: "US", verified: true, checked: "2026-10-12", tiers: [],
    note: "No Sanger prices on the service page; get a quote. A 20% Sanger discount applies when bundled with Plasmid-EZ.",
    source: "http://www.genewiz.com/public/services/sanger-sequencing" },

  // ---- Whole plasmid ----
  { service: "plasmid", provider: "Plasmidsaurus", type: "Commercial", country: "US", verified: true, checked: "2026-10-12",
    tiers: [{ for: "any", price: 15 }],
    note: "Plasmids under 25 kb; $30 for 25–125 kb and $60 for 125–300 kb. Includes consensus sequence, annotated map and raw reads. The page shows $ without naming the currency.",
    source: "https://plasmidsaurus.com/plasmid_sequencing" },
  { service: "plasmid", provider: "Azenta / Genewiz (Plasmid-EZ)", type: "Commercial", country: "US", verified: true, checked: "2026-10-12",
    tiers: [{ for: "any", price: 10 }],
    note: "Price shown on Azenta's Sanger service page; currency not stated.", source: "http://www.genewiz.com/public/services/sanger-sequencing" },
  { service: "plasmid", provider: "UNSW Ramaciotti Centre", type: "Core facility", country: "AU", verified: true, checked: "2026-10-12", tiers: [],
    note: "Page lists $30 per plasmid (currency not stated) for 2–25 kb, 3–8 business days after QC. Outside users must email for a quote.",
    source: "https://www.unsw.edu.au/science/ramaciotti/services/whole-plasmid-sequencing" },

  // ---- RNA-seq (library prep only) ----
  { service: "rnaseq", provider: "Boise State Sequencing Core (Poly-A RNA library prep)", type: "Core facility", country: "US", verified: true, checked: "2026-10-12",
    tiers: [{ for: "external", price: 226.4 }, { for: "industry", price: 247.28 }],
    partial: true, note: "Library prep only. Sequencing is priced separately by flow cell.", source: "https://www.boisestate.edu/sequencing-core/home/rates/" },
  { service: "rnaseq", provider: "Boise State Sequencing Core (total RNA library prep)", type: "Core facility", country: "US", verified: true, checked: "2026-10-12",
    tiers: [{ for: "external", price: 277.34 }, { for: "industry", price: 302.92 }],
    partial: true, note: "Library prep only. Sequencing is priced separately by flow cell.", source: "https://www.boisestate.edu/sequencing-core/home/rates/" },
  { service: "rnaseq", provider: "ASU Genomics Core (Lexogen 3' mRNA library prep)", type: "Core facility", country: "US", verified: true, checked: "2026-10-12",
    tiers: [{ for: "external", price: 108 }],
    partial: true, note: "Academic / non-profit rate; industry rate on request. Library prep only.", source: "https://cores.research.asu.edu/genomics/rates" },
  { service: "rnaseq", provider: "ASU Genomics Core (ribodepletion library, human/mouse/rat)", type: "Core facility", country: "US", verified: true, checked: "2026-10-12",
    tiers: [{ for: "external", price: 242 }],
    partial: true, note: "Academic / non-profit rate; industry rate on request. Library prep only.", source: "https://cores.research.asu.edu/genomics/rates" },
  { service: "rnaseq", provider: "RPI Biotech (Illumina RNA/DNA library prep)", type: "Core facility", country: "US", verified: true, checked: "2026-10-12",
    tiers: [{ for: "external", price: 268 }, { for: "industry", price: 536 }],
    partial: true, note: "Rates valid Aug 1, 2026 to Jul 31, 2027. The page does not say what the fee includes.", source: "https://biotech.rpi.edu/equipment/library-preparation-and-bioinformatics-analysis" },

  // ---- 16S / ITS amplicon ----
  { service: "amplicon", provider: "ASU Genomics Core (16S/18S/ITS library prep)", type: "Core facility", country: "US", verified: true, checked: "2026-10-12",
    tiers: [{ for: "external", price: 57 }, { for: "external", price: 39, minQty: 96 }, { for: "external", price: 32, minQty: 192 }],
    partial: true, note: "Academic / non-profit rate from genomic DNA; industry rate on request. Library prep only.", source: "https://cores.research.asu.edu/genomics/rates" },
  { service: "amplicon", provider: "Boise State Sequencing Core", type: "Core facility", country: "US", verified: true, checked: "2026-10-12",
    tiers: [{ for: "external", price: 16.98, minQty: 100 }, { for: "industry", price: 18.68, minQty: 100 }],
    note: "100-sample minimum. The page does not detail what is included.", source: "https://www.boisestate.edu/sequencing-core/home/rates/" },

  // ---- Plate-based cell screening ----
  { service: "screen", provider: "University of Pittsburgh Organoid Research Core", type: "Core facility", country: "US", verified: true, checked: "2026-10-12", tiers: [],
    note: "Compound screening on patient-derived organoids; price not published (contact via iLab). Organoid vials $300 academic / $354 external; culture plate $100.",
    source: "https://organoids.pitt.edu/services-and-pricing" }
];

// default currency for tiers that don't specify one
window.OFFERS.forEach(o => o.tiers.forEach(t => { t.currency = t.currency || "USD"; }));

// ---- Organisation (so the project planner can tell which provider covers several services) ----
const ORG_OVERRIDE = {
  "Plasmidsaurus 3' RNA-Seq": "Plasmidsaurus", "Novogene PlasmidGo": "Novogene", "GenScript (nanopore)": "GenScript",
  "Nevada Genomics Center (UNR)": "Nevada Genomics Center", "MGH CCIB DNA Core": "MGH CCIB DNA Core"
};
window.OFFERS.forEach(o => { o.org = ORG_OVERRIDE[o.provider] || o.provider.replace(/\s*\(.*$/, "").trim(); });

// ---- Turnaround, only where the provider's own page states it ----
// key: "service|provider". days = fastest stated working/business days (used for sorting).
const TURNAROUND = {
  "plasmid|Eurofins Genomics (US)": { days: 1, text: "1 business day" },
  "plasmid|Eurofins Genomics (EU)": { days: 1, text: "1–2 days (2.5–25 kb)" },
  "plasmid|Novogene PlasmidGo": { days: 1, text: "1 day after receipt" },
  "plasmid|GenScript (nanopore)": { days: 2, text: "2 business days" },
  "plasmid|University of Guelph Genomics": { days: 1, text: "next day (runs Tue and Thu)" },
  "rnaseq|Plasmidsaurus 3' RNA-Seq": { days: 3, text: "as little as 3 days" },
  // added with the 2026-10-12 batch, each stated on the provider's page
  "plasmid|Plasmidsaurus": { days: 1, text: "1 day" },
  "plasmid|UNSW Ramaciotti Centre": { days: 3, text: "3–8 business days after QC" },
  "sanger|Eton Bioscience": { days: 1, text: "less than 24 hours" },
  "sanger|Azenta / Genewiz": { days: 1, text: "1 business day after receipt" }
};
window.OFFERS.forEach(o => { const t = TURNAROUND[o.service + "|" + o.provider]; if (t) { o.days = t.days; o.turn = t.text; } });

// ---- Per-service search words, plain-English goal, and what to ask so quotes are comparable ----
window.SERVICE_META = {
  sanger:   { kw: "sanger capillary dna sequencing verify clone primer walking", goal: "Check a short stretch of DNA, such as a cloning junction, insert end or PCR product.",
              ask: ["Is the price per reaction, and are purification and the primer included, or do I supply the primer?", "What read length and quality do you guarantee, and are failed reactions repeated free?", "Are there extra charges for difficult templates (GC-rich, repeats)?"] },
  plasmid:  { kw: "whole plasmid nanopore ont full length verify construct", goal: "Confirm a whole plasmid, including the backbone, rather than only a short region.",
              ask: ["What size range does this price cover, and what do larger plasmids cost?", "Is an annotated map or variant call included, or only raw reads?", "What DNA amount, concentration and purity do you need?"] },
  rnaseq:   { kw: "rna-seq rnaseq transcriptome gene expression ngs library prep", goal: "Measure which genes change between conditions or samples.",
              ask: ["Is the price library prep only, sequencing only, or both, and what read depth per sample?", "Is analysis included (alignment, counts, differential expression)?", "What RNA quality (RIN) and amount do you need, and is there a minimum batch size?"] },
  amplicon: { kw: "16s its amplicon microbiome metagenomics bacteria fungi community", goal: "Profile which bacteria or fungi are in a sample.",
              ask: ["Does the price include library prep, sequencing and basic analysis?", "Which region and primers (for example V4), and how many reads per sample?", "Are controls (mock community, negatives) included or charged separately?"] },
  ic50:     { kw: "ic50 cytotoxicity toxicity dose response tc50 cell kill potency", goal: "Find the concentration at which a compound kills or slows cells.",
              ask: ["How many concentration points and replicates are included in the per-compound price?", "Which cell line, and who supplies it?", "Do I get raw data and curve fits, or only the IC50 number?"] },
  screen:   { kw: "screening hts high throughput plate library compounds cell assay", goal: "Test many compounds or conditions in cells, in plate format.",
              ask: ["What is covered by the per-plate price, and what is extra (cell line, compound plates, instrument time)?", "Is assay development charged separately?", "What are the hit-calling rules and data deliverables?"] },
  viability:{ kw: "viability proliferation mtt atp celltiter cytotox growth", goal: "Check whether cells stay alive or keep growing after treatment.",
              ask: ["What exactly is included (replicates, controls, report)?", "Who supplies cells, reagents and positive controls?", "What are the milestones and payment terms, and what happens if the assay needs re-running?"] },
  reporter: { kw: "reporter luciferase nuclear receptor agonist antagonist pathway", goal: "Test whether a compound switches a receptor or pathway on or off.",
              ask: ["Which receptor or pathway assays are available, and is agonist and antagonist mode included?", "How many concentrations and replicates are included?", "What counts as a valid run, and are repeats free if controls fail?"] },
  immunoonc:{ kw: "immuno oncology t cell killing checkpoint pbmc car-t cytokine", goal: "Test how immune cells respond to tumour cells or a therapy.",
              ask: ["Which effector and target cells are used, and who supplies them?", "Which readouts are included (killing, cytokines, flow)?", "What are the donor-to-donor variability controls and milestones?"] }
};
window.COMMON_ASK = ["What is the minimum order and the turnaround?", "Are there extra charges for industry use, shipping, or sample handling?", "Please give the total cost and a list of what is not included."];
