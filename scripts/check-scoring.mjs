import Database from 'better-sqlite3';
const db = new Database('dev.db', { readonly: true });

// Get latest attempt
const attempt = db.prepare(`
  SELECT aa.id, aa.attemptNo, aa.scoredAt
  FROM AssessmentAttempt aa
  WHERE aa.status = 'SCORED'
  ORDER BY aa.scoredAt DESC LIMIT 1
`).get();

console.log('\n=== LATEST ATTEMPT ===');
console.log(attempt);

// Trait scores for that attempt
const traits = db.prepare(`
  SELECT factor, trait, score, maxScore, percent
  FROM TraitScore WHERE attemptId = ?
  ORDER BY factor, trait
`).all(attempt.id);

console.log('\n=== TRAIT SCORES ===');
console.table(traits);

// Competency scores for that attempt
const compScores = db.prepare(`
  SELECT cs.scaledScore, cs.percent, cs.band, c.name as competencyName
  FROM CompetencyScore cs
  JOIN Competency c ON c.id = cs.competencyId
  WHERE cs.attemptId = ?
`).all(attempt.id);

console.log('\n=== COMPETENCY SCORES ===');
console.table(compScores);

// Attribute→Competency maps
const maps = db.prepare(`
  SELECT a.name as attributeName, a.code, c.name as competencyName, acm.weight
  FROM AttributeCompetencyMap acm
  JOIN Attribute a ON a.id = acm.attributeId
  JOIN Competency c ON c.id = acm.competencyId
  ORDER BY c.name, a.name
`).all();

console.log('\n=== ATTRIBUTE→COMPETENCY MAPS ===');
console.table(maps);

db.close();
