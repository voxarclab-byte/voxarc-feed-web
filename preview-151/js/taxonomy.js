/* Approved topic catalog (1.3.6).
   Groups are followable. Subtopics are searchable refinements, not separate follows.
   status "active" means this build already has a sourced desk in the bundled feed.
   status "coming" is not live coverage yet (no dedicated ingestion), but the topic is still followable and shows an empty desk.
   Reviewed against www/data/feed.json on 2026-11-09:
     arctic 14 items, ai 17, minerals 15, geo 22, with named primary sources.
   Old id -> canonical id (aliases keep saved follows):
     arctic -> arctic-security
     ai -> ai-governance
     minerals -> critical-minerals
     geo -> geo (kept as the existing Geoeconomics desk; not merged into another group)
   Coming-soon groups are not auto-followed and cannot be pinned as live desks.
   Nov 10, 2026: status below is only the bundled default. app.js syncTopicStatus() marks a group live when the
   loaded feed has at least one item tagged with the group id, and back to coming soon when none remain.
*/
window.VX_TAXONOMY = [
  { id: 'arctic-security', label: 'Arctic security', status: 'active', aliases: ['arctic', 'arctic security'], focus: 'Sovereignty, shipping and subsea infrastructure',
    subs: [
      { id: 'arctic-security-defense', label: 'Arctic defense', aliases: ['arctic defence', 'arctic defense'], terms: ['defense', 'defence', 'military', 'nato'] },
      { id: 'arctic-security-access', label: 'Access and infrastructure', aliases: ['arctic access'], terms: ['infrastructure', 'port', 'shipping', 'cable'] },
      { id: 'arctic-security-resources', label: 'Resource governance', aliases: ['arctic resources'], terms: ['resource', 'mineral', 'mining', 'permitting'] },
      { id: 'arctic-security-cooperation', label: 'Regional cooperation', aliases: ['arctic cooperation'], terms: ['cooperation', 'council', 'treaty', 'agreement'] }
    ] },
  { id: 'ai-governance', label: 'AI governance', status: 'active', aliases: ['ai', 'ai policy', 'ai governance'], focus: 'Compute, export controls and AI regulation',
    subs: [
      { id: 'ai-governance-regulation', label: 'AI regulation', aliases: ['ai rules'], terms: ['regulation', 'ai act', 'bill', 'directive'] },
      { id: 'ai-governance-safety', label: 'Safety and evaluation', aliases: ['ai safety'], terms: ['safety', 'evaluation', 'red team'] },
      { id: 'ai-governance-public-sector', label: 'Public-sector AI', aliases: ['government ai'], terms: ['public sector', 'government', 'agency'] },
      { id: 'ai-governance-data-rights', label: 'Data and model rights', aliases: ['model rights'], terms: ['copyright', 'training data', 'model right'] }
    ] },
  { id: 'critical-minerals', label: 'Critical minerals', status: 'active', aliases: ['minerals', 'critical minerals'], focus: 'Supply, prices, stockpiles and processing',
    subs: [
      { id: 'critical-minerals-extraction', label: 'Exploration and extraction', aliases: ['mining'], terms: ['exploration', 'extraction', 'mine', 'mining'] },
      { id: 'critical-minerals-processing', label: 'Refining and processing', aliases: ['refining'], terms: ['refin', 'processing', 'midstream'] },
      { id: 'critical-minerals-batteries', label: 'Battery materials', aliases: ['battery minerals'], terms: ['battery', 'lithium', 'nickel', 'cobalt', 'graphite'] },
      { id: 'critical-minerals-recycling', label: 'Recycling and recovery', aliases: ['mineral recycling'], terms: ['recycl', 'recovery'] }
    ] },
  { id: 'ai-investment-infrastructure', label: 'AI investment and infrastructure', status: 'coming', aliases: ['data centres', 'data centers', 'ai investment'], focus: 'Capital, data centres, compute and connectivity',
    subs: [
      { id: 'ai-investment-infrastructure-capital', label: 'AI capital investment', aliases: ['ai capital'], terms: ['investment', 'capital', 'funding'] },
      { id: 'ai-investment-infrastructure-data-centres', label: 'Data centres', aliases: ['data centers'], terms: ['data centre', 'data center'] },
      { id: 'ai-investment-infrastructure-compute', label: 'Compute capacity', aliases: ['compute'], terms: ['compute', 'gpu', 'cluster'] },
      { id: 'ai-investment-infrastructure-connectivity', label: 'AI connectivity infrastructure', aliases: ['ai connectivity'], terms: ['connectivity', 'fiber', 'fibre', 'network'] }
    ] },
  { id: 'energy-power', label: 'Energy and power', status: 'coming', aliases: ['energy', 'power grids'], focus: 'Grids, nuclear, generation and data-centre power',
    subs: [
      { id: 'energy-power-grids', label: 'Power grids', aliases: ['grid'], terms: ['grid', 'transmission'] },
      { id: 'energy-power-nuclear', label: 'Nuclear energy', aliases: ['nuclear'], terms: ['nuclear', 'reactor'] },
      { id: 'energy-power-generation', label: 'Generation and storage', aliases: ['power generation'], terms: ['generation', 'storage', 'battery storage'] },
      { id: 'energy-power-data-centre-demand', label: 'Data-centre power demand', aliases: ['data center power'], terms: ['data centre', 'data center', 'power demand'] }
    ] },
  { id: 'trade-sanctions', label: 'Trade and sanctions', status: 'coming', aliases: ['sanctions', 'tariffs', 'export controls'], focus: 'Tariffs, sanctions, export controls and customs',
    subs: [
      { id: 'trade-sanctions-tariffs', label: 'Tariffs and trade agreements', aliases: ['tariffs'], terms: ['tariff', 'trade agreement'] },
      { id: 'trade-sanctions-designations', label: 'Sanctions and enforcement', aliases: ['sanctions'], terms: ['sanction', 'designation', 'entity list'] },
      { id: 'trade-sanctions-export-controls', label: 'Export controls', aliases: ['export control'], terms: ['export control', 'eccn', 'bis'] },
      { id: 'trade-sanctions-customs', label: 'Customs and trade compliance', aliases: ['customs'], terms: ['customs', 'compliance'] }
    ] },
  { id: 'strategic-supply-chains', label: 'Strategic supply chains', status: 'coming', aliases: ['supply chains', 'maritime logistics'], focus: 'Resilience, maritime logistics, ports and industrial inputs',
    subs: [
      { id: 'strategic-supply-chains-resilience', label: 'Supply-chain resilience', aliases: ['supply chain'], terms: ['supply chain', 'resilience'] },
      { id: 'strategic-supply-chains-maritime', label: 'Maritime logistics', aliases: ['shipping'], terms: ['maritime', 'shipping', 'vessel'] },
      { id: 'strategic-supply-chains-ports', label: 'Ports and shipping routes', aliases: ['ports'], terms: ['port', 'shipping route', 'chokepoint'] },
      { id: 'strategic-supply-chains-industrial-inputs', label: 'Critical industrial inputs', aliases: ['industrial inputs'], terms: ['industrial', 'input', 'precursor'] }
    ] },
  { id: 'defense-technology', label: 'Defense technology and procurement', status: 'coming', aliases: ['defence', 'defense procurement'], focus: 'Procurement, autonomy, production and partnerships',
    subs: [
      { id: 'defense-technology-procurement', label: 'Defense procurement', aliases: ['defence procurement'], terms: ['procurement', 'contract'] },
      { id: 'defense-technology-autonomy', label: 'Autonomous systems', aliases: ['autonomy'], terms: ['autonomous', 'unmanned', 'drone'] },
      { id: 'defense-technology-production', label: 'Defense production', aliases: ['defence production'], terms: ['production', 'munitions', 'shipyard'] },
      { id: 'defense-technology-partnerships', label: 'Defense technology partnerships', aliases: ['defence partnerships'], terms: ['partnership', 'aukus', 'joint'] }
    ] },
  { id: 'semiconductors', label: 'Semiconductors', status: 'coming', aliases: ['chips', 'semiconductor'], focus: 'Fabrication, equipment, design and packaging',
    subs: [
      { id: 'semiconductors-fabrication', label: 'Chip fabrication', aliases: ['fabs'], terms: ['fabrication', 'fab', 'foundry'] },
      { id: 'semiconductors-equipment', label: 'Chipmaking equipment', aliases: ['semiconductor equipment'], terms: ['equipment', 'lithography', 'asml'] },
      { id: 'semiconductors-design', label: 'Chip design', aliases: ['chip design'], terms: ['chip design', 'eda'] },
      { id: 'semiconductors-packaging', label: 'Advanced packaging', aliases: ['packaging'], terms: ['packaging', 'advanced package'] }
    ] },
  { id: 'economic-security', label: 'Economic security and investment', status: 'coming', aliases: ['investment screening', 'cfius'], focus: 'Screening, outbound rules, incentives and public funding',
    subs: [
      { id: 'economic-security-screening', label: 'Investment screening', aliases: ['cfius'], terms: ['screening', 'cfius', 'fdi'] },
      { id: 'economic-security-outbound', label: 'Outbound investment rules', aliases: ['outbound investment'], terms: ['outbound'] },
      { id: 'economic-security-incentives', label: 'Industrial incentives', aliases: ['subsidies'], terms: ['incentive', 'subsidy'] },
      { id: 'economic-security-public-funding', label: 'Public funding and grants', aliases: ['grants'], terms: ['grant', 'public funding'] }
    ] },
  { id: 'cyber-digital-sovereignty', label: 'Cybersecurity and digital sovereignty', status: 'coming', aliases: ['cyber', 'sovereign cloud', 'data residency'], focus: 'Cyber policy, sovereign cloud, residency and critical systems',
    subs: [
      { id: 'cyber-digital-sovereignty-cyber', label: 'Cybersecurity policy', aliases: ['cyber policy'], terms: ['cyber'] },
      { id: 'cyber-digital-sovereignty-cloud', label: 'Sovereign cloud', aliases: ['sovereign cloud'], terms: ['sovereign cloud', 'cloud'] },
      { id: 'cyber-digital-sovereignty-data', label: 'Data residency', aliases: ['residency'], terms: ['residency', 'localization', 'localisation'] },
      { id: 'cyber-digital-sovereignty-critical-systems', label: 'Critical digital systems', aliases: ['critical systems'], terms: ['critical infrastructure', 'digital system'] }
    ] },
  { id: 'space-satellites', label: 'Space and satellites', status: 'coming', aliases: ['satellites', 'space'], focus: 'Launch, communications, earth observation and space security',
    subs: [
      { id: 'space-satellites-launch', label: 'Launch and access', aliases: ['launch'], terms: ['launch', 'rocket'] },
      { id: 'space-satellites-communications', label: 'Satellite communications', aliases: ['satcom'], terms: ['satellite communication', 'satcom'] },
      { id: 'space-satellites-earth-observation', label: 'Earth observation', aliases: ['remote sensing'], terms: ['earth observation', 'remote sensing'] },
      { id: 'space-satellites-security', label: 'Space security', aliases: ['space security'], terms: ['space security', 'counterspace'] }
    ] }
];
window.VX_TOPIC_RECOMMENDED = ['arctic-security', 'ai-governance', 'critical-minerals'];
