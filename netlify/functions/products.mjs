export const PRODUCTS = {
  'gcc-mines-plant-engineering': { title: 'GCC Mines - Plant Engineering Worked Solutions', amountCents: 34900, file: 'gcc-mines-plant-engineering-worked-solutions.pdf' },
  'gcc-mines-legal-knowledge': { title: 'GCC Mines - Legal Knowledge Worked Solutions', amountCents: 29900, file: 'gcc-mines-legal-knowledge-worked-solutions.pdf' },
  'gcc-mines-formula-book': { title: 'GCC Mines - Formula Book', amountCents: 14900, file: 'gcc-mines-formula-book.pdf' },
  'gcc-mines-full-bundle': { title: 'GCC Mines & Works - Full Study Bundle', amountCents: 69900, file: 'gcc-mines-full-bundle.zip' },
  'gcc-factories-plant-engineering': { title: 'GCC Factories - Plant Engineering Worked Solutions', amountCents: 34900, file: 'gcc-factories-plant-engineering-worked-solutions.pdf' },
  'gcc-factories-ohs-worked-solutions': { title: 'GCC Factories - OHS Act & Regulations Worked Solutions', amountCents: 29900, file: 'gcc-factories-ohs-worked-solutions.pdf' },
  'gcc-factories-formula-book': { title: 'GCC Factories - Formula Book', amountCents: 14900, file: 'gcc-factories-formula-book.pdf' },
  'gcc-factories-full-bundle': { title: 'GCC Factories - Full Study Bundle', amountCents: 69900, file: 'gcc-factories-full-bundle.zip' },
  'gcc-application-checklist': { title: 'GCC Application Checklist', amountCents: 12900, file: 'gcc-application-checklist.pdf' },
  'gcc-record-of-experience-template': { title: 'Record of Experience Template', amountCents: 14900, file: 'gcc-record-of-experience-template.docx' },
  'gcc-candidate-roadmap': { title: 'GCC Candidate Roadmap', amountCents: 9900, file: 'gcc-candidate-roadmap.pdf' }
};

export const getProduct = (slug) => PRODUCTS[slug] || null;
export const amountInRands = (product) => (product.amountCents / 100).toFixed(2);
