module.exports = function(grunt) {
	
	// Project cnfiguration.
	grunt.initConfig({
		lint: {
			all: ['*.js']
		},
		reload: {
			port: 5353,
			proxy: {
				host: 'localhost'
			}
		},
		watch: {
			files: ['widget.html', 'widget.js'],
			tasks:'default reload'
		}
	});

	// Load the plugin that provides the "browser-sync" task.
	grunt.loadNpmTasks('grunt-reload');

	// Default task(s).
	grunt.registerTask('default', ['grunt-reload']);
	
};