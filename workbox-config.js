module.exports = {
	globDirectory: 'build/',
	globPatterns: [
		'**/*.{css,png,html,js}'
	],
	swDest: 'build/sw.js',
	ignoreURLParametersMatching: [
		/^utm_/,
		/^fbclid$/
	],
	sourcemap: false,
};