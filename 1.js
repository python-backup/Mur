const InlineBot = require('./inline.js');

console.log('Starting inline bot test...');

try {
    const inlineBot = new InlineBot();
    console.log('Inline bot created successfully');
} catch (error) {
    console.error('Failed to create inline bot:', error);
}