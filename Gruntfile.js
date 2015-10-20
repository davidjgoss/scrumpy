/* eslint-env node */
module.exports = function(grunt) {
    grunt.initConfig({
        babel: {
            options: {
                sourceMap: true
            },
            all: {
                files: {
                    "dist/TrelloAgent.js": "src/TrelloAgent.js",
                    "dist/StatsGenerator.js": "src/StatsGenerator.js",
                    "dist/background.js": "src/background.js",
                    "dist/trello-bootstrap.js": "src/trello-bootstrap.js",
                    "dist/stats-bootstrap.js": "src/stats-bootstrap.js",
                    "dist/website.js": "src/website.js"
                }
            }
        },
        eslint: {
            all: {
                src: ["Gruntfile.js", "src/*.js"]
            }
        },
        jasmine: {
            all: {
                options: {
                    specs: "tests/*.js",
                    helpers: "lib/*.js",
                    outfile: "tests/SpecRunner.html",
                    keepRunner: true

                },
                src: [
                    "dist/TrelloAgent.js",
                    "dist/StatsGenerator.js"
                ]
            }
        },
        sass: {
            all: {
                files: {
                    "css/stats.css": "scss/stats/stats.scss",
                    "css/trello.css": "scss/trello/trello.scss"
                }
            }
        },
        watch: {
            scripts: {
                options: {
                    atBegin: true
                },
                files: ["src/*.js", "tests/*.js"],
                tasks: ["babel", "test"]
            },
            styles: {
                options: {
                    atBegin: true
                },
                files: "scss/**/*.scss",
                tasks: ["sass"]
            }
        },
        compress: {
            chrome: {
                options: {
                    mode: "zip",
                    archive: "../scrumpy.zip",
                    pretty: true
                },
                files: [{
                    expand: true,
                    src: ["manifest.json", "icon.png", "*.html", "css/*", "dist/*", "images/*", "lib/*"]
                }]
            }
        }
    });

    grunt.loadNpmTasks("grunt-babel");
    grunt.loadNpmTasks("grunt-eslint");
    grunt.loadNpmTasks("grunt-contrib-jasmine");
    grunt.loadNpmTasks("grunt-contrib-sass");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-contrib-compress");

    grunt.registerTask("default", ["watch"]);
    grunt.registerTask("test", ["eslint", "jasmine"]);
    grunt.registerTask("dist", ["babel", "sass"]);
    grunt.registerTask("build", ["compress:chrome"]);

};
