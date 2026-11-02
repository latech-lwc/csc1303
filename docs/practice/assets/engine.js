/* ==========================================================================
   Practice-problem engine for the CSC 1303 textbook.

   HOW IT FITS TOGETHER
   --------------------
   * A "bank" (bank-*.js) is a list of sections; each section is a list of
     problem *generators*. A generator takes a seeded random-number helper and
     returns a question object, so every student (and every click of
     "New variant") sees different numbers.
   * A page contains  <div class="practice-set" data-bank="..." data-sections="...">.
     When the page loads, this engine finds those divs and mounts the bank
     into them: one card per generator, each with Check / Show answer /
     New variant buttons.
   * Question *types* (mc, multi, blanks, table, match, order, code, ...) live
     in Practice.types. Each type knows how to draw a question and how to grade
     it. Banks can add types (see logic.js, which adds 'expr').

   QUESTION OBJECTS
   ----------------
   Every generator returns an object with at least:
       type     – one of the question types
       prompt   – HTML shown above the answer area
       explain  – (optional) HTML shown after a correct or revealed answer
   plus whatever fields its type needs (see each type below).

   THE `Practice` GLOBAL
   ---------------------
       Practice.util      rng, esc, el, code, fmtDur, parseDur
       Practice.makeField build one answer input (text, number, drop-down, ...)
       Practice.types     question renderers
       Practice.widgets   standalone interactive widgets (e.g. sort stepper)
       Practice.register  bank files call this to add themselves
       Practice.mount     fill one .practice-set element
       Practice.runPy     run student Python code against tests (Pyodide)

   The file is organised as:
     1. Utilities (random numbers, HTML helpers, durations)
     2. Answer fields
     3. Question types
     4. Running Python code in the browser
     5. Mounting: cards, sections, whole pages
   ========================================================================== */
(function () {
  'use strict';

  // Remember where this script was loaded from, so harness.py can be fetched from the same folder.
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';

  var P = window.Practice = { banks: {}, types: {}, widgets: {}, fields: {} };


  /* ==========================================================================
     1. Utilities
     ========================================================================== */

  // A seeded random-number generator (the "mulberry32" algorithm). The same
  // seed always produces the same sequence, which is how a "variant" can be
  // rebuilt identically. The function returns a number in [0, 1); extra
  // helper methods are attached to it below.
  function rngFrom(seed) {
    var state = seed >>> 0;

    var rng = function () {
      state |= 0;
      state = (state + 0x6D2B79F5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Whole number in [lo, hi], both included.
    rng.int = function (lo, hi) {
      return lo + Math.floor(rng() * (hi - lo + 1));
    };

    // One random element of an array.
    rng.pick = function (list) {
      return list[Math.floor(rng() * list.length)];
    };

    // A shuffled copy of an array (Fisher-Yates).
    rng.shuffle = function (list) {
      var copy = list.slice();
      for (var i = copy.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var temp = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
      }
      return copy;
    };

    // `count` different elements of an array, in random order.
    rng.sample = function (list, count) {
      return rng.shuffle(list).slice(0, count);
    };

    // True with probability p.
    rng.chance = function (p) {
      return rng() < p;
    };

    // `count` different integers in [lo, hi].
    rng.distinct = function (count, lo, hi) {
      var pool = [];
      for (var i = lo; i <= hi; i++) pool.push(i);
      return rng.sample(pool, count);
    };

    return rng;
  }

  // Escapes text so it can be placed inside HTML.
  function esc(text) {
    var replacements = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
    return String(text).replace(/[&<>"]/g, function (c) { return replacements[c]; });
  }

  // Creates an element:  el('div', { class: 'x' }, '<b>inner html</b>')
  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var name in attrs) {
        if (name === 'class') node.className = attrs[name];
        else node.setAttribute(name, attrs[name]);
      }
    }
    if (html != null) node.innerHTML = html;
    return node;
  }

  // A Python code listing, optionally with line numbers.
  function code(source, numbered) {
    var lines = source.replace(/\n$/, '').split('\n');
    var body = lines.map(function (line, i) {
      var lineNumber = numbered ? '<span class="ln">' + (i + 1) + '</span>' : '';
      return lineNumber + esc(line);
    }).join('\n');
    return '<pre class="pr-code"><code>' + body + '</code></pre>';
  }

  // Human-readable duration:  3725 -> "1 hr 2 min 5 sec"
  function fmtDur(totalSeconds) {
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = Math.round((totalSeconds % 60) * 100) / 100;

    var parts = [];
    if (hours) parts.push(hours + ' hr');
    if (minutes) parts.push(minutes + ' min');
    if (seconds || !parts.length) parts.push(seconds + ' sec');
    return parts.join(' ');
  }

  // The reverse of fmtDur. Accepts "1 min 30 sec", "1:30", "90", "1h 2m 5s", ...
  // and returns the number of seconds (NaN if it cannot be understood).
  function parseDur(text) {
    text = String(text).trim().toLowerCase().replace(/,/g, '');
    if (!text) return NaN;

    // Plain number: seconds.
    if (/^\d+(\.\d+)?$/.test(text)) return parseFloat(text);

    // Clock style: m:ss or h:mm:ss.
    var clock = text.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (clock) {
      if (clock[3] != null) return (+clock[1]) * 3600 + (+clock[2]) * 60 + (+clock[3]);
      return (+clock[1]) * 60 + (+clock[2]);
    }

    // Number-with-unit pieces, in any order: "2 hr", "5 min", "30 secs", ...
    var piece = /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|m|seconds?|secs?|s)\b/g;
    var match;
    var total = 0;
    var foundAny = false;
    while ((match = piece.exec(text))) {
      foundAny = true;
      var unit = match[2][0];            // first letter: h, m or s
      var amount = parseFloat(match[1]);
      total += unit === 'h' ? amount * 3600 : unit === 'm' ? amount * 60 : amount;
    }
    return foundAny ? total : NaN;
  }

  P.util = { rng: rngFrom, esc: esc, el: el, code: code, fmtDur: fmtDur, parseDur: parseDur };


  /* ==========================================================================
     2. Answer fields
     ========================================================================== */

  // Normalisers used when comparing what the student typed to the expected answer.
  function normalizeText(s) {
    return String(s).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.;:]+$/, '');
  }
  // "[3, 4]" and "3 4" and "(3,4)" all become "3 4".
  function normalizeList(s) {
    return (String(s).match(/[^\s,\[\]()]+/g) || []).join(' ').toLowerCase();
  }
  function toArray(x) {
    return Array.isArray(x) ? x : [x];
  }

  // Builds one answer input from a spec and returns a handle to it.
  //
  //   spec.ans     the correct answer (or an array of accepted answers)
  //   spec.kind    'text'   free text, compared ignoring case/spacing (default)
  //                'num'    a number, within spec.tol (default 1e-6)
  //                'dur'    a duration like "2 min 5 sec"; spec.ans is in seconds
  //                'list'   a list of values; brackets, commas and spacing are ignored
  //                'code'   a snippet of code; all whitespace is ignored
  //                'select' a drop-down; spec.choices lists its options
  //   spec.choices options for a 'select' (strings, or {v, t} value/text pairs)
  //   spec.w       width: 'sm', 'wide', or a number of em
  //   spec.ph      placeholder text
  //
  // The handle has:  el (the DOM node), check() -> boolean (and colours the
  // field), reveal() (fills in the answer), clear().
  function makeField(spec) {
    var kind = spec.kind || (spec.choices ? 'select' : 'text');
    var node;

    if (kind === 'select') {
      node = el('select');
      node.appendChild(el('option', { value: '' }, '—'));
      spec.choices.forEach(function (choice) {
        var value = typeof choice === 'object' ? choice.v : choice;
        var text = typeof choice === 'object' ? choice.t : choice;
        node.appendChild(el('option', { value: String(value) }, esc(text)));
      });
    } else {
      node = el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false' });
      if (typeof spec.w === 'number') node.style.width = spec.w + 'em';
      else if (spec.w) node.className = spec.w === 'sm' ? 'pr-sm' : spec.w === 'wide' ? 'pr-wide' : '';
      if (spec.ph) node.placeholder = spec.ph;
    }

    // Is `value` (a string typed by the student) a correct answer?
    function isCorrect(value) {
      var typed = String(value == null ? '' : value);
      if (!typed.trim()) return false;                   // an empty field is never correct
      var answers = toArray(spec.ans);

      if (kind === 'select') {
        return answers.some(function (a) { return String(a) === typed; });
      }
      if (kind === 'num') {
        // Ignore thousands separators and trailing units such as "mA".
        var number = parseFloat(typed.replace(/,/g, '').replace(/[^\d.eE+-]+$/, ''));
        if (isNaN(number)) return false;
        var tolerance = spec.tol != null ? spec.tol : 1e-6;
        return answers.some(function (a) { return Math.abs(number - a) <= tolerance + 1e-12; });
      }
      if (kind === 'dur') {
        var seconds = parseDur(typed);
        return !isNaN(seconds) && answers.some(function (a) { return Math.abs(seconds - a) < 0.005; });
      }
      if (kind === 'list') {
        return answers.some(function (a) { return normalizeList(a) === normalizeList(typed); });
      }
      if (kind === 'code') {
        return answers.some(function (a) { return String(a).replace(/\s+/g, '') === typed.replace(/\s+/g, ''); });
      }
      return answers.some(function (a) { return normalizeText(a) === normalizeText(typed); });
    }

    return {
      el: node,

      // Grades the field, marks it green or red, and returns true/false.
      check: function () {
        var ok = isCorrect(node.value);
        node.classList.remove('pr-f-ok', 'pr-f-bad');
        node.classList.add(ok ? 'pr-f-ok' : 'pr-f-bad');
        return ok;
      },

      // Fills in the first accepted answer.
      reveal: function () {
        var answer = toArray(spec.ans)[0];
        if (kind === 'dur' && typeof answer === 'number') answer = fmtDur(answer);
        node.value = String(answer);
        node.classList.remove('pr-f-bad');
        node.classList.add('pr-f-ok');
      },

      // Removes the green/red marking.
      clear: function () {
        node.classList.remove('pr-f-ok', 'pr-f-bad');
      }
    };
  }
  P.makeField = makeField;

  // Wraps a set of fields into a question handler: grade() checks all of them,
  // reveal() fills in all of them. Used by the 'blanks', 'table' and 'match' types.
  function fieldsHandler(fields) {
    var list = Object.keys(fields).map(function (key) { return fields[key]; });
    return {
      grade: function () {
        var correct = 0;
        list.forEach(function (field) { if (field.check()) correct++; });
        return { ok: correct === list.length, partial: correct + ' of ' + list.length + ' answers correct' };
      },
      reveal: function () {
        list.forEach(function (field) { field.reveal(); });
      }
    };
  }


  /* ==========================================================================
     3. Question types

     Each type is an object with  render(q, body, ctx)  which draws the answer
     area for question `q` inside the element `body` and returns a handler:
         grade()   -> { ok, msg?, partial? }   (or a Promise of one, if async)
         reveal()  -> fill in the correct answer
     ========================================================================== */
  var T = P.types;

  // [0, 1, 2, ..., length-1] for an array of options.
  function indexesOf(list) {
    return list.map(function (_, i) { return i; });
  }

  // Multiple choice, one correct answer.
  //   q.options     list of option HTML strings
  //   q.answer      index of the correct option in q.options
  //   q.noShuffle   keep the options in the order given
  T.mc = {
    render: function (q, body) {
      var order = q.noShuffle ? indexesOf(q.options) : q._rng.shuffle(indexesOf(q.options));
      var groupName = 'mc' + Math.random().toString(36).slice(2);    // radio buttons need a shared name

      var choices = order.map(function (optionIndex) {
        var label = el('label', null,
          '<input type="radio" name="' + groupName + '" value="' + optionIndex + '"> ' + q.options[optionIndex]);
        body.appendChild(label);
        return { optionIndex: optionIndex, label: label, input: label.firstChild };
      });

      return {
        grade: function () {
          var selected = choices.filter(function (c) { return c.input.checked; })[0];
          choices.forEach(function (c) { c.label.classList.remove('pr-opt-ok', 'pr-opt-bad'); });
          if (!selected) return { ok: false, msg: 'Pick an answer first.' };

          var ok = selected.optionIndex === q.answer;
          selected.label.classList.add(ok ? 'pr-opt-ok' : 'pr-opt-bad');
          return { ok: ok };
        },
        reveal: function () {
          choices.forEach(function (c) {
            c.label.classList.remove('pr-opt-bad');
            if (c.optionIndex === q.answer) {
              c.input.checked = true;
              c.label.classList.add('pr-opt-ok');
            }
          });
        }
      };
    }
  };

  // "Check all that apply".
  //   q.options     list of option HTML strings
  //   q.answers     indexes of every correct option
  //   q.noShuffle   keep the options in the order given
  T.multi = {
    render: function (q, body) {
      var order = q._rng.shuffle(indexesOf(q.options));
      if (q.noShuffle) order = indexesOf(q.options);

      var choices = order.map(function (optionIndex) {
        var label = el('label', null, '<input type="checkbox"> ' + q.options[optionIndex]);
        body.appendChild(label);
        return { optionIndex: optionIndex, label: label, input: label.firstChild };
      });

      return {
        grade: function () {
          var allCorrect = true;
          choices.forEach(function (c) {
            var shouldBeChecked = q.answers.indexOf(c.optionIndex) >= 0;
            var ok = c.input.checked === shouldBeChecked;
            c.label.classList.remove('pr-opt-ok', 'pr-opt-bad');
            if (c.input.checked || shouldBeChecked) c.label.classList.add(ok ? 'pr-opt-ok' : 'pr-opt-bad');
            if (!ok) allCorrect = false;
          });
          return {
            ok: allCorrect,
            msg: allCorrect ? '' : 'Highlighted in red: boxes that are wrong (checked but shouldn\'t be, or missing).'
          };
        },
        reveal: function () {
          choices.forEach(function (c) {
            c.input.checked = q.answers.indexOf(c.optionIndex) >= 0;
            c.label.classList.remove('pr-opt-bad');
            c.label.classList.add('pr-opt-ok');
          });
        }
      };
    }
  };

  // Free-form text with [[name]] placeholders that become answer fields.
  //   q.template   HTML containing placeholders such as [[a]]
  //   q.blanks     { a: fieldSpec, ... } – one spec per placeholder (see makeField)
  T.blanks = {
    render: function (q, body) {
      var fields = {};

      // Swap each [[name]] for an empty <span> we can fill with a field afterwards.
      var html = q.template.replace(/\[\[(\w+)\]\]/g, function (_, name) {
        return '<span data-f="' + name + '"></span>';
      });
      var box = el('div', null, html);
      body.appendChild(box);

      Object.keys(q.blanks).forEach(function (name) {
        var slot = box.querySelector('[data-f="' + name + '"]');
        var field = makeField(q.blanks[name]);
        fields[name] = field;
        if (slot) slot.replaceWith(field.el);
        if (q.blanks[name].unit && field.el.parentNode) {
          field.el.insertAdjacentHTML('afterend', ' ' + q.blanks[name].unit);
        }
      });

      return fieldsHandler(fields);
    }
  };

  // A grid.
  //   q.head       optional header cells
  //   q.rows       [[cell, ...], ...]; a cell is HTML (static) or a field spec (an answer)
  //   q.leftCols   indexes of static columns to left-align
  T.table = {
    render: function (q, body) {
      var table = el('table', { class: 'pr-table' });
      if (q.head) {
        table.appendChild(el('thead', null,
          '<tr>' + q.head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr>'));
      }

      var tbody = el('tbody');
      var fields = {};
      var fieldCount = 0;

      q.rows.forEach(function (row) {
        var tr = el('tr');
        row.forEach(function (cell, columnIndex) {
          var td = el('td');
          var isField = cell !== null && typeof cell === 'object' && !Array.isArray(cell) && 'ans' in cell;

          if (isField) {
            var field = makeField(cell);
            fields['c' + (fieldCount++)] = field;
            td.appendChild(field.el);
          } else {
            td.innerHTML = cell === null ? '' : String(cell);
            if (q.leftCols && q.leftCols.indexOf(columnIndex) >= 0) td.className = 'pr-left';
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      body.appendChild(table);
      return fieldsHandler(fields);
    }
  };

  // Matching: pick the right term for each description from a drop-down.
  //   q.pairs     [[left HTML, correct choice], ...]
  //   q.choices   optional list of options (default: the distinct correct choices)
  T.match = {
    render: function (q, body) {
      var choices = q.choices || Array.from(new Set(q.pairs.map(function (pair) { return pair[1]; })));
      choices = q._rng.shuffle(choices);

      var fields = {};
      var table = el('table', { class: 'pr-table' });

      q.pairs.forEach(function (pair, i) {
        var tr = el('tr');
        var left = el('td', { class: 'pr-left' }, pair[0]);
        var right = el('td');

        var field = makeField({ kind: 'select', choices: choices, ans: pair[1] });
        fields['m' + i] = field;
        right.appendChild(field.el);

        tr.appendChild(left);
        tr.appendChild(right);
        table.appendChild(tr);
      });

      body.appendChild(table);
      return fieldsHandler(fields);
    }
  };

  // Ordering: the student reorders shuffled lines with up/down buttons.
  //   q.items         the lines in their correct order
  //   q.distractors   optional extra lines that don't belong (should end up at the bottom)
  T.order = {
    render: function (q, body) {
      // Each entry remembers its correct position; distractors use -1.
      var items = q.items.map(function (text, i) { return { text: text, position: i }; });
      var extras = (q.distractors || []).map(function (text) { return { text: text, position: -1 }; });

      var current = q._rng.shuffle(items.concat(extras));
      // Don't hand the student an already-solved puzzle.
      var alreadySolved = current.every(function (x, k) { return x.position === k; });
      if (alreadySolved && current.length > 1) current.push(current.shift());

      var list = el('ul', { class: 'pr-order' });
      body.appendChild(list);
      if (extras.length) {
        body.appendChild(el('div', { class: 'pr-explain' },
          '<em>Some lines don\'t belong. Move them to the bottom — only the first ' + items.length +
          ' lines count.</em>'));
      }

      function swap(a, b) {
        var temp = current[a];
        current[a] = current[b];
        current[b] = temp;
      }

      // (Re)draws the list from `current`.
      function draw() {
        list.innerHTML = '';
        current.forEach(function (entry, k) {
          var li = el('li');
          li.appendChild(el('span', { class: 'txt' }, esc(entry.text)));

          var up = el('button', { type: 'button', title: 'Move up' }, '▲');
          var down = el('button', { type: 'button', title: 'Move down' }, '▼');
          up.onclick = function () { if (k > 0) { swap(k, k - 1); draw(); } };
          down.onclick = function () { if (k < current.length - 1) { swap(k, k + 1); draw(); } };

          li.appendChild(up);
          li.appendChild(down);
          list.appendChild(li);
        });
      }
      draw();

      return {
        grade: function () {
          var allCorrect = true;
          Array.prototype.forEach.call(list.children, function (li, k) {
            var ok = k < items.length && current[k].position === k;
            li.classList.remove('pr-f-ok', 'pr-f-bad');
            li.classList.add(ok ? 'pr-f-ok' : 'pr-f-bad');
            if (!ok) allCorrect = false;
          });
          return { ok: allCorrect };
        },
        reveal: function () {
          current = items.concat(extras);
          draw();
          Array.prototype.forEach.call(list.children, function (li, k) {
            li.classList.add(k < items.length ? 'pr-f-ok' : 'pr-f-bad');
          });
        }
      };
    }
  };


  /* ==========================================================================
     4. Python code questions (run in the browser with Pyodide)
     ========================================================================== */

  var pyodidePromise = null;

  // Downloads Pyodide (CPython compiled to WebAssembly) the first time it is
  // needed, then loads harness.py, which defines run_tests(). Cached afterwards.
  function loadPython() {
    if (pyodidePromise) return pyodidePromise;

    var folder = SCRIPT_SRC.replace(/[^\/]*$/, '');     // the folder this script lives in

    pyodidePromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Could not download the Python runtime (are you offline?).')); };
      document.head.appendChild(script);
    })
      .then(function () { return window.loadPyodide(); })
      .then(function (pyodide) {
        return fetch(folder + 'harness.py')
          .then(function (response) { return response.text(); })
          .then(function (harnessSource) {
            pyodide.runPython(harnessSource);
            return pyodide;
          });
      });

    // If loading fails (e.g. offline), allow a later retry.
    pyodidePromise.catch(function () { pyodidePromise = null; });
    return pyodidePromise;
  }

  // Runs the student's code against a list of tests (see harness.py for the
  // test format). Resolves to { syntax } on a syntax error, or { results: [...] }.
  P.runPy = function (studentCode, tests) {
    return loadPython().then(function (pyodide) {
      pyodide.globals.set('__student', studentCode);
      pyodide.globals.set('__tests', JSON.stringify(tests));
      return JSON.parse(pyodide.runPython('run_tests(__student, __tests)'));
    });
  };

  // Write-some-Python question.
  //   q.starter    text initially placed in the editor
  //   q.tests      [{ label, setup, stdin, check, expect, expectOut }, ...]
  //   q.solution   reference solution shown by "Show a solution"
  T.code = {
    render: function (q, body) {
      var editor = el('textarea', { class: 'pr-editor', spellcheck: 'false' });
      editor.value = q.starter || '';

      // The Tab key inserts four spaces instead of moving focus away.
      editor.addEventListener('keydown', function (event) {
        if (event.key !== 'Tab') return;
        event.preventDefault();
        var start = editor.selectionStart;
        editor.value = editor.value.slice(0, start) + '    ' + editor.value.slice(editor.selectionEnd);
        editor.selectionStart = editor.selectionEnd = start + 4;
      });
      body.appendChild(editor);

      var output = el('div', { class: 'pr-out' });
      body.appendChild(output);

      return {
        async: true,
        grade: function () {
          output.innerHTML = '<span class="pr-loading">Running your code… ' +
                             '(the first run downloads the Python runtime, about 10 MB)</span>';

          return P.runPy(editor.value, q.tests).then(function (result) {
            if (result.syntax) {
              output.innerHTML = '<strong>' + esc(result.syntax) + '</strong>';
              return { ok: false };
            }

            var passed = result.results.filter(function (r) { return r.ok; }).length;
            output.innerHTML = result.results.map(function (r, i) {
              return (r.ok ? '✅ ' : '❌ ') + esc(r.label || ('Test ' + (i + 1))) + (r.ok ? '' : ' — ' + esc(r.msg));
            }).join('\n');

            return {
              ok: passed === result.results.length,
              partial: passed + ' of ' + result.results.length + ' tests passed'
            };
          }).catch(function (error) {
            output.textContent = error.message;
            return { ok: false, msg: error.message };
          });
        },
        reveal: function () {
          editor.value = q.solution || editor.value;
        }
      };
    }
  };


  /* ==========================================================================
     5. Mounting: cards, sections and whole pages
     ========================================================================== */

  // Banks call this to add themselves, e.g. P.register('searchsort', {...}).
  P.register = function (id, bank) {
    P.banks[id] = bank;
  };

  var SEED_KEY = 'pr-seed-base';

  // One random number per browser session; it keeps each problem's first
  // variant stable while the student navigates between pages.
  function sessionSeed() {
    try {
      var stored = sessionStorage.getItem(SEED_KEY);
      if (stored) return +stored;
      var fresh = Math.floor(Math.random() * 1e9);
      sessionStorage.setItem(SEED_KEY, fresh);
      return fresh;
    } catch (e) {
      // sessionStorage can be unavailable (private windows etc.); fall back to a one-off seed.
      return Math.floor(Math.random() * 1e9);
    }
  }

  // Builds the card for one problem generator.
  //   generator   function (rng) -> question object
  //   seed        starting seed; "New variant" advances it
  //   number      the "Problem N" label
  //   onSolve     called with `key` the first time the problem is answered correctly
  function buildCard(generator, seed, number, onSolve, key) {
    var card = el('div', { class: 'pr-card' });
    card.appendChild(el('div', { class: 'pr-head' }, '<span>Problem ' + number + '</span>'));
    card.firstChild.appendChild(el('span', { class: 'pr-variant' }, ''));

    var wrap = el('div');
    card.appendChild(wrap);
    var solved = false;

    // (Re)builds the question from the current seed.
    function build() {
      wrap.innerHTML = '';
      card.classList.remove('pr-ok', 'pr-bad');

      var q;
      try {
        q = generator(rngFrom(seed));
      } catch (e) {
        wrap.innerHTML = '<em>Could not build this problem: ' + esc(e.message) + '</em>';
        console.error(e);
        return;
      }
      q._rng = rngFrom(seed ^ 0x9e3779b9);       // separate generator for display-only shuffling

      wrap.appendChild(el('div', { class: 'pr-prompt' }, q.prompt || ''));
      var body = el('div', { class: 'pr-body' });
      wrap.appendChild(body);

      var type = q.custom || T[q.type];
      if (!type) {
        body.textContent = 'Unknown question type: ' + q.type;
        return;
      }
      var handler = type.render(q, body, { seed: seed });

      var feedback = el('div', { class: 'pr-feedback' });
      var explanation = el('div', { class: 'pr-explain' });

      var checkButton = el('button', { type: 'button', class: 'pr-primary' }, q.type === 'code' ? 'Run tests' : 'Check');
      var showButton = el('button', { type: 'button' }, q.type === 'code' ? 'Show a solution' : 'Show answer');
      var newButton = el('button', { type: 'button' }, '↻ New variant');

      var actions = el('div', { class: 'pr-actions' });
      actions.appendChild(checkButton);
      actions.appendChild(showButton);
      actions.appendChild(newButton);
      wrap.appendChild(actions);
      wrap.appendChild(feedback);
      wrap.appendChild(explanation);

      // Displays the result of grading.
      function showResult(result) {
        feedback.className = 'pr-feedback show ' + (result.ok ? 'ok' : 'bad');
        feedback.innerHTML = result.ok
          ? '✅ Correct!'
          : '❌ Not quite.' + (result.partial ? ' ' + result.partial + '.' : '') + (result.msg ? ' ' + esc(result.msg) : '');
        card.classList.toggle('pr-ok', !!result.ok);
        card.classList.toggle('pr-bad', !result.ok);

        if (result.ok && !solved) {
          solved = true;
          onSolve(key);
        }
        if (result.ok && q.explain) explanation.innerHTML = q.explain;
      }

      checkButton.onclick = function () {
        var result = handler.grade();
        if (result && typeof result.then === 'function') {
          // Code questions grade asynchronously (Python has to run).
          checkButton.disabled = true;
          result.then(function (r) { checkButton.disabled = false; showResult(r); });
        } else {
          showResult(result);
        }
      };

      showButton.onclick = function () {
        handler.reveal();
        feedback.className = 'pr-feedback show info';
        feedback.innerHTML = 'Answer shown. Try a new variant to test yourself.';
        explanation.innerHTML = q.explain || '';
      };

      // A simple linear-congruential step gives the next seed.
      newButton.onclick = function () {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        build();
      };
    }

    build();
    return card;
  }

  // Adds one section (a heading, optional intro, and a card per problem) to `host`.
  //   baseSeed       the session seed
  //   sectionIndex   position of the section in its bank (so sections get different seeds)
  function mountSection(section, host, baseSeed, sectionIndex) {
    var element = el('section', { class: 'pr-section', id: 'pr-' + section.id });

    var header = el('header');
    header.appendChild(el('h2', null, esc(section.title)));
    var scoreLabel = el('span', { class: 'pr-score' });
    header.appendChild(scoreLabel);
    element.appendChild(header);

    if (section.intro) element.appendChild(el('div', { class: 'pr-intro' }, section.intro));

    var solved = {};      // keys of problems answered correctly this session
    var total = 0;        // number of real problems (widgets don't count)

    function updateScore() {
      scoreLabel.textContent = Object.keys(solved).length + ' / ' + total + ' correct this session';
    }

    var problemNumber = 0;
    section.problems.forEach(function (problem, index) {
      // A { widget: 'name' } entry is an interactive widget rather than a question.
      if (typeof problem === 'object' && problem.widget) {
        var box = el('div', { class: 'pr-widget' });
        element.appendChild(box);
        P.widgets[problem.widget](box, problem);
        return;
      }

      problemNumber++;
      total++;
      var key = section.id + ':' + index;
      var seed = (baseSeed + sectionIndex * 1009 + index * 7919) >>> 0;
      element.appendChild(buildCard(problem, seed, problemNumber, function (k) {
        solved[k] = 1;
        updateScore();
      }, key));
    });

    if (!total) scoreLabel.textContent = '';
    else updateScore();

    host.appendChild(element);
  }

  // Fills one <div class="practice-set" data-bank="..." data-sections="a,b">.
  // data-sections is optional; when given, only those sections are shown.
  P.mount = function (host) {
    var bank = P.banks[host.getAttribute('data-bank')];
    if (!bank) {
      host.textContent = 'Practice bank not found: ' + host.getAttribute('data-bank');
      return;
    }
    var baseSeed = sessionSeed();

    var onlyIds = (host.getAttribute('data-sections') || '').split(',')
      .map(function (id) { return id.trim(); })
      .filter(Boolean);
    var shown = bank.sections
      .map(function (section, index) { return { section: section, index: index }; })
      .filter(function (x) { return !onlyIds.length || onlyIds.indexOf(x.section.id) >= 0; });

    // With more than one section on the page, show a row of jump links.
    if (shown.length > 1) {
      var nav = el('div', { class: 'pr-nav' });
      shown.forEach(function (x) {
        nav.appendChild(el('a', { href: '#pr-' + x.section.id }, esc(x.section.title)));
      });
      host.appendChild(nav);
    }

    shown.forEach(function (x) { mountSection(x.section, host, baseSeed, x.index); });
  };

  // Mount every practice set on the page, once the page has loaded.
  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll('.practice-set'), P.mount);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
