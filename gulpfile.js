var gulp = require('gulp');
var less = require('gulp-less');
var minify = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var replace = require('gulp-replace');

gulp.task('default', ['less', 'minifycss', 'combinejs', 'minifyjs', 'production'], function() {

})

gulp.task('less', function() {
	return gulp.src("./Code/css/less/map.less")
			   .pipe(less())
               .pipe(rename("map.css"))
			   .pipe(gulp.dest('./Code/css'));
});

gulp.task('minifycss', ['less'], function() {
	return gulp.src("./Code/css/map.css")
			   .pipe(minify())
               .pipe(rename("map.min.css"))
			   .pipe(gulp.dest('./Code/css'))
});

gulp.task('combinejs', function() {
	return gulp.src("./Code/js/myLibs/*.js")
			   .pipe(concat("campusMap.js"))
			   .pipe(gulp.dest('./Code/js/'));
});

gulp.task('minifyjs', ['combinejs'], function() {
	return gulp.src("./Code/js/campusMap.js")
			   .pipe(uglify())
               .pipe(rename("campusMap.min.js"))
			   .pipe(gulp.dest('./Code/js/'));
});

gulp.task('production', ["minifyjs", "combinejs"], function() {
    return gulp.src("./Code/js/campusMap.js")
                .pipe(replace("css/map.css", "//byui-web.github.io/CampusMaps/map.min.css"))
                .pipe(rename("campusMap.js"))
                .pipe(gulp.dest("./"))
                .pipe(uglify())
                .pipe(rename("campusMap.min.js"))
                .pipe(gulp.dest("./"));
});

gulp.watch('./Code/css/less/*', ['less', 'minifycss']);

gulp.watch('./Code/js/myLibs/*.js', ['combinejs', 'minifyjs', 'production']);