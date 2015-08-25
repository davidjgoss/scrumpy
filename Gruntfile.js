module.exports = function(grunt) {
    grunt.initConfig({
        sass: {
            all: {
                files: {
                    "css/style.css": "scss/style.scss"
                }
            }
        },
        watch: {
            styles: {
                options: {
                    atBegin: true
                },
                files: "scss/**/*.scss",
                tasks: ["sass"]
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-sass");
    grunt.loadNpmTasks("grunt-contrib-watch");

    grunt.registerTask("default", ["watch"]);
    grunt.registerTask("dist", ["sass"]);
};