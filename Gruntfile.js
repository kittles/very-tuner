var exec = require("child_process").exec;

module.exports = function (grunt) {
    "use strict";
    require("load-grunt-tasks")(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        watch: {
            options: {
                livereload: true
            },
            less: {
                options: {
                    livereload: false
                },
                files: "src/less/*.less",
                tasks: [
                    "less:dist",
                    "autoprefixer:dist",
                    "cssmin:dist"
                ]
            },
            scripts: {
                files: [
                    "src/js/*.js"
                ],
                tasks: [
                    "browserify",
                    "uglify:dist"
                ]
            },
            jade: {
                files: [
                    "src/jade/index.jade"
                ],
                tasks: [
                    "jade"
                ]
            }
        },
        less: {
            dist: {
                options: {
                    paths: [
                        "src/less/"
                    ],
                    sourceMap: true
                },
                src: [
                    "src/less/main.less"
                ],
                dest: "dist/before.prefix.style.css"
            }
        },
        jade: {
            compile: {
                options: {
                    data: {
                        debug: false
                    }
                },
                files: {
                    "dist/index.html": [
                        "src/jade/index.jade"
                    ]
                }
            }
        },
        browserify: {
            dist: {
                files: {
                    "dist/bundle.js": [
                        "src/js/*.js"
                    ]
                }
            }
        },
        uglify: {
            options: {
                preserveComments: false,
                report: "gzip"
            },
            dist: {
                src: "dist/bundle.js",
                dest: "dist/bundle.min.js"
            }
        },
        cssmin: {
            options: {
                sourceMap: true
            },
            dist: {
                files: {
                    "dist/style.min.css": "dist/style.css"
                }
            }
        },
        autoprefixer: {
            options: {
                browsers: [
                    "last 2 versions",
                    "ie 10",
                    "ie 11"
                ]
            },
            dist: {
                src: "dist/before.prefix.style.css",
                dest: "dist/style.css"
            }
        },
        imagemin: {
            dist: {
                files: [
                    {
                        expand: true,
                        cwd: "src/img/",
                        src: [
                            "*.{png,jpg,jpeg,gif}"
                        ],
                        dest: "public/img/"
                    }
                ]
            }
        },
        clean: [
            "src/dist"
        ]
    });

    grunt.registerTask("default", [
        "less",
        "autoprefixer",
        "cssmin",
        "jade",
        "browserify",
        "uglify",
        "newer:imagemin",
        "clean",
        "watch"
    ]);
};
