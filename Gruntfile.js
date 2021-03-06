/* global module:false, require:false */
var path = require('path');
var marked = require('marked');
var cheerio = require('cheerio');

var folderMount = function folderMount(connect, point) {
  return connect.static(path.resolve(point));
};

module.exports = function(grunt) {
  grunt.registerTask('parseMd', 'parse Markdown files into template', function() {
    var files = grunt.file.expand('text/*.md');
    var raw, cooked, name;
    var $ = cheerio.load(grunt.file.read('index.html'), {
      xmlMode: true
    });
    for(var i=0,l=files.length;i<l;++i) {
      name = path.basename(files[i], '.md');
      raw = grunt.file.read(files[i]);
      cooked = marked(raw);
      $('#' + name).html(cooked);
    }

    grunt.file.write('index.html', $.html());
  });

  function registerRobustTasks(name, tasks) {
    grunt.registerTask(name, function() {
      // so we don't have stupid issues with grunt crashing
      // every time a test fails...
      grunt.option('force', true);
      grunt.task.run(tasks);
    });
  }

  grunt.initConfig({
    pkg : grunt.file.readJSON('package.json'),
    connect : {
      server : {
        options : {
          base : '.',
          port : 1747,
          hostname : '*',
          livereload : 1750
        }
      }
    },
    stylus : {
      dev : {
        options : {
          // maybe later?
        },
        files : {
          'css/style.css' : 'stylus/style.styl',
          'css/iframe.css' : 'stylus/iframe.styl'
        }
      }
    },
    jshint : {
      options : {
      },
      code : ['js/**/*.js', '!deps/**/*.js'],
      all : ['js/**/*.js', '!js/deps/**/*.js']
    },
    watch : {
      js : {
        files : ['js/**/*.js',],
        tasks : ['jshint:all'],
        options : {
          livereload : 1750
        }
      },
      stylus : {
        files : ['stylus/**/*.styl'],
        tasks : ['stylus:dev'],
        options : {
          livereload : 1750
        }
      },
      html : {
        files : ['./**/*.html'],
        options : {
          livereload : 1750
        }
      },
      md : {
        files : ['./text/*.md'],
        tasks : ['parseMd'],
        options : {
          livereload : 1750
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-stylus');

  registerRobustTasks('default', ['connect', 'watch']);
};
