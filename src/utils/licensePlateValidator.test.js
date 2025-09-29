const licensePlateValidator = require('./licensePlateValidator');

// Test cases
const validPlates = [
  'ABC123',     // Old format
  'abc123',     // Old format lowercase
  'XYZ789',     // Old format
  'AA123BC',    // Valid new format (first letter A, second letter A)
  'AB123CD',    // Valid new format (first letter A, second letter B)
  'AH123XY',    // Valid new format
  ' LNK 904 ',  // Old format with spaces
  ' AB 304 DB ', // New format with spaces
  'AH100DB',    // Valid new format
];

const invalidPlates = [
  'AB123',      // Too short
  'ABCD1234',   // Too long
  'AB12C3',     // Wrong pattern
  '123ABC',     // Numbers first
  'ABCD123E',   // Too long
  'AI305TR',    // Invalid second letter (I)
  'AJ305TR',    // Invalid second letter (J)
  'AK305TR',    // Invalid second letter (K)
];

console.log('Testing valid plates:');
validPlates.forEach(plate => {
  try {
    const result = licensePlateValidator(plate);
    console.log(`✓ '${plate}' -> '${result}'`);
  } catch (error) {
    console.log(`✗ '${plate}' -> ${error.message}`);
  }
});

console.log('\nTesting invalid plates:');
invalidPlates.forEach(plate => {
  try {
    const result = licensePlateValidator(plate);
    console.log(`✗ '${plate}' -> '${result}' (should have failed)`);
  } catch (error) {
    console.log(`✓ '${plate}' -> ${error.message}`);
  }
});