var gulp = require('gulp'),
    less = require('gulp-less'),
    minify = require('gulp-minify-css'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename'),
    concat = require('gulp-concat'),
    replace = require('gulp-replace'),
    lint = require('gulp-jshint'),
    connect = require("gulp-connect");

gulp.task('default', ['less', 'minifycss', 'lint', 'combinejs', 'minifyjs', 'production', "connect"], function () {

    gulp.watch('./Code/css/less/*', ['less', 'minifycss']);
    gulp.watch('./Code/js/myLibs/*.js', ['lint', 'combinejs', 'minifyjs', 'production']);

});

gulp.task('less', function () {
    return gulp.src("./Code/css/less/map.less")
        .pipe(less())
        .pipe(rename("map.css"))
        .pipe(gulp.dest('./Code/css'));
});

gulp.task('minifycss', ['less'], function () {
    return gulp.src("./Code/css/map.css")
        .pipe(minify())
        .pipe(rename("map.min.css"))
        .pipe(gulp.dest('./Code/css'))
});

gulp.task('lint', function () {
    return gulp.src("./Code/js/myLibs/*.js")
        .pipe(lint({
            expr: true
        }))
        .pipe(lint.reporter("default"));
});

gulp.task('combinejs', ['lint'], function () {
    return gulp.src("./Code/js/myLibs/*.js")
        .pipe(concat("campusMap.js"))
        .pipe(gulp.dest('./Code/js/'));
});

gulp.task('minifyjs', ['combinejs', 'lint'], function () {
    return gulp.src("./Code/js/campusMap.js")
        .pipe(uglify())
        .pipe(rename("campusMap.min.js"))
        .pipe(gulp.dest('./Code/js/'));
});

gulp.task('production', ["minifyjs", "combinejs"], function () {
    return gulp.src("./Code/js/campusMap.js")
        .pipe(replace("css/map.css", "//byui-web.github.io/CampusMaps/map.min.css"))
        .pipe(rename("campusMap.js"))
        .pipe(gulp.dest("./"))
        .pipe(uglify())
        .pipe(rename("campusMap.min.js"))
        .pipe(gulp.dest("./"));
});

gulp.task('campusMap-lint', function () {
    return gulp.src('./Code/js/myLibs/campusMap.js')
        .pipe(lint())
        .pipe(lint.reporter("default"));
});

gulp.task("connect", function () {
    connect.server({
        root: "Code",
        livreload: true
    });
});