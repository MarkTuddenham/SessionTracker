const gulp = require('gulp');
const sass_dir = '_sass';

function css(){
    const postcss = require('gulp-postcss')
    const sass = require('gulp-sass');
    const csso = require('gulp-csso')
    return gulp.src(sass_dir + '/styles.scss')
        .pipe(sass())
        .pipe(postcss())
        .pipe(csso())
        .pipe(gulp.dest('./'))

};

function watch(){
    gulp.watch([sass_dir+'/**/*.s[a,c]ss'], css);
}

exports.watch = watch;
exports.default = css;
