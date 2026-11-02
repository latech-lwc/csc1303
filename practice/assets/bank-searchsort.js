/*
 * Practice bank: Lesson 04 – Searching and Sorting
 *
 * This file defines two sections ("Searching" and "Sorting"). Each section is a list of
 * problem generators. A generator receives a seeded random helper (`rng`) and returns a
 * question object that the engine (engine.js) knows how to render and grade, e.g.
 *
 *     { type: 'blanks', prompt: '<p>…</p>', template: '… [[a]] …', blanks: { a: num(5) }, explain: '…' }
 *
 * Because the numbers/lists are random, the same generator produces a different problem each
 * time the student presses "New variant".
 *
 * The file is organised as:
 *   1. Algorithm simulations   – bubble / selection / insertion sort and binary search, with
 *                                comparison and swap counts (the source of truth for answers)
 *   2. Small helpers           – shorthand for building answer fields
 *   3. Searching problems
 *   4. Sorting problems
 *   5. "Explore" widgets       – step-through visualisations (not graded)
 *   6. Registration            – hands the sections to the engine
 */
(function () {
  'use strict';

  var P = window.Practice;
  var U = P.util;
  var esc = U.esc;      // HTML-escape a string
  var code = U.code;    // format a Python snippet as a <pre> block


  /* ==========================================================================
   * 1. ALGORITHM SIMULATIONS
   *
   * Each function runs the algorithm on a copy of the list and records what
   * happened on every pass:  { comps, swaps, list }  (the list is the state
   * *after* that pass).  The totals are what the "count the comparisons and
   * swaps" problems use as their answer key.
   *
   * These are exposed as Practice.algo so the step-through widgets and the
   * offline tests can reuse them.
   * ========================================================================== */

  var algo = P.algo = {};

  /*
   * Bubble sort. Pass p compares neighbours in the still-unsorted front part
   * of the list (n - p comparisons), so the largest value "bubbles" to the end.
   *
   * With `optimized` true, the sort stops after the first pass that makes no
   * swaps (the "optimized bubble sort" from the lesson).
   */
  algo.bubble = function (list, optimized) {
    var a = list.slice();
    var n = a.length;
    var passes = [];
    var totalComps = 0;
    var totalSwaps = 0;

    for (var pass = 1; pass <= n - 1; pass++) {
      var comps = 0;
      var swaps = 0;

      for (var i = 0; i < n - pass; i++) {
        comps++;
        if (a[i] > a[i + 1]) {
          var temp = a[i];
          a[i] = a[i + 1];
          a[i + 1] = temp;
          swaps++;
        }
      }

      totalComps += comps;
      totalSwaps += swaps;
      passes.push({ comps: comps, swaps: swaps, list: a.slice() });

      if (optimized && swaps === 0) break;   // no swaps => already sorted
    }
    return { passes: passes, comps: totalComps, swaps: totalSwaps };
  };

  /*
   * Selection sort. Each pass scans the unsorted part for the smallest value
   * and swaps it into the first unsorted position. A "swap" is only counted
   * when the two positions differ (swapping an item with itself does nothing).
   */
  algo.selection = function (list) {
    var a = list.slice();
    var n = a.length;
    var passes = [];
    var totalComps = 0;

    for (var i = 0; i < n - 1; i++) {
      var minPos = i;
      var comps = 0;

      for (var j = i + 1; j < n; j++) {
        comps++;
        if (a[j] < a[minPos]) minPos = j;
      }

      var temp = a[i];
      a[i] = a[minPos];
      a[minPos] = temp;

      totalComps += comps;
      passes.push({ comps: comps, swaps: minPos !== i ? 1 : 0, list: a.slice() });
    }

    var totalSwaps = passes.reduce(function (sum, p) { return sum + p.swaps; }, 0);
    return { passes: passes, comps: totalComps, swaps: totalSwaps };
  };

  /*
   * Insertion sort. Each pass takes the first unsorted item (`key`) and walks
   * backwards through the sorted part, sliding larger items one place right
   * until it finds where `key` belongs. Every look at a neighbour is one
   * comparison; every slide is counted in `swaps` (the lesson treats these like
   * swaps when timing).
   */
  algo.insertion = function (list) {
    var a = list.slice();
    var n = a.length;
    var passes = [];
    var totalComps = 0;
    var totalSlides = 0;

    for (var k = 1; k < n; k++) {
      var key = a[k];
      var j = k - 1;
      var comps = 0;
      var slides = 0;

      while (j >= 0) {
        comps++;
        if (a[j] > key) {
          a[j + 1] = a[j];   // slide the larger item right
          j--;
          slides++;
        } else {
          break;             // found the spot
        }
      }
      a[j + 1] = key;

      totalComps += comps;
      totalSlides += slides;
      passes.push({ comps: comps, swaps: slides, list: a.slice() });
    }
    return { passes: passes, comps: totalComps, swaps: totalSlides };
  };

  /*
   * Binary search on a sorted, 0-indexed list using mid = (first + last) // 2,
   * the version from the lesson's Python code. `steps` has one entry per
   * comparison; `act` says what the search does next:
   *   'found'  – the middle value is the target
   *   'right'  – the middle value is too small, so discard the left half
   *   'left'   – the middle value is too big, so discard the right half
   * `found` is the index of the target, or -1 if it is not in the list.
   */
  algo.binary = function (list, target) {
    var first = 0;
    var last = list.length - 1;
    var steps = [];
    var found = -1;

    while (first <= last) {
      var mid = Math.floor((first + last) / 2);
      var val = list[mid];
      var act = val === target ? 'found' : val < target ? 'right' : 'left';
      steps.push({ first: first, last: last, mid: mid, val: val, act: act });

      if (act === 'found') { found = mid; break; }
      if (act === 'right') first = mid + 1;
      else last = mid - 1;
    }
    return { steps: steps, found: found };
  };

  /* Most comparisons a binary search of n items can need: ceil(log2(n + 1)). */
  algo.worstBinary = function (n) {
    var k = 0;
    while ((1 << k) < n + 1) k++;
    return k;
  };

  /* True if the list is in ascending order. */
  algo.isSorted = function (list) {
    return list.every(function (x, i) { return i === 0 || list[i - 1] <= x; });
  };


  /* ==========================================================================
   * 2. SMALL HELPERS
   * ========================================================================== */

  var SORT_NAMES = ['Bubble Sort', 'Optimized Bubble Sort', 'Selection Sort', 'Insertion Sort'];

  /* [3, 1, 2] -> "3 1 2"  (how list answers are typed and compared) */
  function listText(list) { return list.join(' '); }

  /* n distinct random integers in [lo, hi] */
  function randomList(rng, n, lo, hi) { return rng.distinct(n, lo, hi); }

  /* Python-style literal for display: [3, 1, 2] -> "[3, 1, 2]" */
  function pyList(list) { return '[' + list.join(', ') + ']'; }

  /* Ascending numeric sort (JS sorts as strings by default). */
  function ascending(list) { return list.slice().sort(function (a, b) { return a - b; }); }

  /* Round to 3 decimals so 0.1 * 3 doesn't show up as 0.30000000000000004. */
  function roundSecs(x) { return Math.round(x * 1000) / 1000; }

  /* A random integer in [10, 99] that is not already in `list`. */
  function randomMissingValue(rng, list) {
    var v;
    do { v = rng.int(10, 99); } while (list.indexOf(v) >= 0);
    return v;
  }

  /* ---- answer-field shorthand (see makeField in engine.js) ---- */

  /* A number field. `tol` is the allowed error; `width` is 'sm' or an em width. */
  function num(answer, tol, width) {
    return { kind: 'num', ans: answer, tol: tol == null ? 0.0001 : tol, w: width || 'sm' };
  }

  /* A field for a list such as "1 3 5 7" (spaces/commas/brackets are ignored). */
  function listCell(answer, width) {
    return { kind: 'list', ans: answer, w: width || 11 };
  }

  /* A <select> field. */
  function choice(answer, choices) {
    return { kind: 'select', choices: choices, ans: answer };
  }


  /* ==========================================================================
   * 3. SEARCHING PROBLEMS
   * ========================================================================== */

  var searching = [];

  /* Which algorithms can be used on this list right away? (sorted vs. not) */
  searching.push(function (rng) {
    var isSorted = rng.chance(0.5);
    var n = rng.int(7, 9);

    // Mostly integers with a few x.5 values, like the exam's lists.
    var values = rng.distinct(n, 10, 90).map(function (x) { return rng.chance(0.25) ? x + 0.5 : x; });
    var list = ascending(values);
    if (!isSorted) {
      do { list = rng.shuffle(values); } while (algo.isSorted(list));   // make sure it really is unsorted
    }

    var options = ['Bubble Sort', 'Optimized Bubble Sort', 'Sequential Search', 'Selection Sort', 'Binary Search', 'Insertion Sort'];
    var SEQUENTIAL = 2, BINARY = 4;   // indexes into `options`

    return {
      type: 'multi',
      prompt: '<p>Given the list below, which algorithm(s) could be <b>immediately</b> used to find any given value? ' +
        '(No changes may be made to the list first.) Check all that apply.</p>' + code('nums = ' + pyList(list)),
      options: options,
      answers: isSorted ? [SEQUENTIAL, BINARY] : [SEQUENTIAL],
      noShuffle: true,
      explain: isSorted
        ? 'The list is already in ascending order, so both sequential search (which works on any list) and binary search ' +
          '(which needs a sorted list) can be used. The sorting algorithms put values in order; they do not search.'
        : 'The list is <b>not</b> sorted (look for the first place a value is smaller than the one before it), so binary ' +
          'search cannot be used yet. Sequential search works on any list. Bubble, selection and insertion sort ' +
          '<i>sort</i> a list; they do not look for a value.'
    };
  });

  /* Sequential search runtime: best / worst / average case. */
  searching.push(function (rng) {
    var n = rng.pick([64, 100, 128, 200, 250, 256, 500]);
    var secsPerComparison = rng.pick([0.05, 0.1, 0.2, 0.25, 0.5]);

    return {
      type: 'blanks',
      prompt: '<p>A <b>sequential (linear) search</b> is used on a list of <b>' + n + '</b> elements, and each comparison ' +
        'takes <b>' + secsPerComparison + ' seconds</b>. Calculate its runtime in each case.</p>',
      template: '<p>Best case: [[b]] seconds</p><p>Worst case: [[w]] seconds</p><p>Average case: [[a]] seconds</p>',
      blanks: {
        b: num(roundSecs(secsPerComparison), 0.001),                  // 1 comparison
        w: num(roundSecs(n * secsPerComparison), 0.001),              // n comparisons
        a: num(roundSecs(n / 2 * secsPerComparison), 0.001)           // about n/2 comparisons
      },
      explain: 'Best case: the value is first, so 1 comparison → 1 × ' + secsPerComparison + ' = ' + roundSecs(secsPerComparison) + ' s. ' +
        'Worst case: the value is last (or missing), so <i>n</i> = ' + n + ' comparisons → ' + roundSecs(n * secsPerComparison) + ' s. ' +
        'Average: about <i>n</i>/2 = ' + n / 2 + ' comparisons → ' + roundSecs(n / 2 * secsPerComparison) + ' s.'
    };
  });

  /* Binary search runtime: best / worst case. */
  searching.push(function (rng) {
    var n = rng.pick([31, 63, 100, 127, 128, 255, 500, 1000, 1023, 5000]);
    var secsPerComparison = rng.pick([0.05, 0.1, 0.2, 0.5]);
    var worstComparisons = algo.worstBinary(n);

    return {
      type: 'blanks',
      prompt: '<p>A <b>binary search</b> is used on a sorted list of <b>' + n + '</b> elements, and each comparison takes <b>' +
        secsPerComparison + ' seconds</b>. Calculate its runtime.</p>' +
        '<p>Hint: the most comparisons needed is ⌈log<sub>2</sub>(<i>n</i> + 1)⌉.</p>',
      template: '<p>Best case: [[b]] seconds</p><p>Worst case: [[w]] seconds</p>',
      blanks: {
        b: num(roundSecs(secsPerComparison), 0.001),
        w: num(roundSecs(worstComparisons * secsPerComparison), 0.001)
      },
      explain: 'Best case: the first middle value is the target → 1 comparison. Worst case: ⌈log<sub>2</sub>(' + n + ' + 1)⌉ = ' +
        '⌈log<sub>2</sub> ' + (n + 1) + '⌉ = ' + worstComparisons + ' comparisons, so ' + worstComparisons + ' × ' + secsPerComparison +
        ' = ' + roundSecs(worstComparisons * secsPerComparison) + ' s.'
    };
  });

  /* Trace a binary search: fill in first / last / mid / value / result for each comparison. */
  searching.push(function (rng) {
    var n = rng.int(9, 12);
    var list = ascending(randomList(rng, n, 10, 99));

    // 70% of the time search for a value that is present, otherwise one that is missing.
    var isPresent = rng.chance(0.7);
    var target = isPresent ? rng.pick(list) : randomMissingValue(rng, list);

    var result = algo.binary(list, target);

    var RESULT_TEXT = { found: 'found', right: 'discard left half', left: 'discard right half' };
    var rows = result.steps.map(function (step, i) {
      return [
        i + 1,
        num(step.first), num(step.last), num(step.mid), num(step.val),
        choice(RESULT_TEXT[step.act], ['found', 'discard left half', 'discard right half'])
      ];
    });

    return {
      type: 'table',
      prompt: '<p>Trace a binary search for <b>' + target + '</b> on the sorted list below. Use 0-based indexes and ' +
        '<code>mid = (first + last) // 2</code> (the Python version from the lesson). The table has one row per comparison' +
        (isPresent ? '.' : ' (the target is not in the list, so the search ends once <code>first &gt; last</code>).') + '</p>' +
        code('numbers = ' + pyList(list)),
      head: ['Comparison', 'first', 'last', 'mid', 'numbers[mid]', 'Result'],
      rows: rows,
      explain: 'Each step compares <code>numbers[mid]</code> with ' + target + '. If it is smaller, the target must be to the ' +
        'right (<code>first = mid + 1</code>); if larger, to the left (<code>last = mid - 1</code>).' +
        (isPresent
          ? ' It took ' + rows.length + ' comparisons.'
          : ' After ' + rows.length + ' comparisons <code>first</code> passed <code>last</code>, so the value is not in the list.')
    };
  });

  /* How many comparisons does a sequential search make for this target? */
  searching.push(function (rng) {
    var n = rng.int(8, 15);
    var list = rng.shuffle(randomList(rng, n + 3, 10, 99)).slice(0, n);
    var isPresent = rng.chance(0.7);

    var target, expectedComparisons;
    if (isPresent) {
      var index = rng.int(0, n - 1);
      target = list[index];
      expectedComparisons = index + 1;     // stops as soon as it is found
    } else {
      target = randomMissingValue(rng, list);
      expectedComparisons = n;             // has to look at everything
    }

    return {
      type: 'blanks',
      prompt: '<p>A sequential search (with the early-exit fix: it stops as soon as the value is found) looks for <b>' +
        target + '</b> in this list:</p>' + code('nums = ' + pyList(list)),
      template: '<p>How many comparisons does it make? [[c]]</p>',
      blanks: { c: num(expectedComparisons, 0, 'sm') },
      explain: isPresent
        ? 'The value is at index ' + (expectedComparisons - 1) + ' (the ' + expectedComparisons + 'th item), so ' + expectedComparisons + ' comparisons are made.'
        : 'The value is not in the list, so every one of the ' + n + ' items is compared.'
    };
  });

  /* The "guess my number" game: binary search vs. sequential guessing. */
  searching.push(function (rng) {
    var n = rng.pick([100, 500, 1000, 2000, 5000, 10000, 100000]);
    var worstGuesses = algo.worstBinary(n);

    return {
      type: 'blanks',
      prompt: '<p>You are guessing a secret number from 1 to <b>' + n.toLocaleString() + '</b>. After each guess you are told HIGHER or LOWER.</p>',
      template: '<p>Most guesses needed using the best strategy (binary search): [[w]]</p>' +
        '<p>Average number of guesses if you instead guessed 1, 2, 3, … in order (sequential): [[s]]</p>',
      blanks: { w: num(worstGuesses, 0, 'sm'), s: num(n / 2, 0, 'sm') },
      explain: 'Binary search needs at most ⌈log<sub>2</sub>(' + n + ' + 1)⌉ = ' + worstGuesses + ' guesses (each guess halves what is left; ' +
        '2<sup>' + worstGuesses + '</sup> = ' + (1 << Math.min(worstGuesses, 30)).toLocaleString() + ' ≥ ' + (n + 1).toLocaleString() + '). ' +
        'Sequential search averages <i>n</i>/2 = ' + (n / 2).toLocaleString() + '.'
    };
  });

  /* Multiple-choice concept questions. q = question, o = options, a = index of the correct option, e = explanation. */
  var SEARCH_CONCEPTS = [
    { q: 'Which statement about binary search is true?',
      o: ['It only works if the list is sorted.', 'It works on any list but is slower than sequential search.', 'It must start at the first element.', 'It always takes exactly n comparisons.'],
      a: 0, e: 'Binary search discards half of the list based on the middle value, which is only valid when the data is ordered.' },
    { q: 'When is sequential search the <i>better</i> choice?',
      o: ['The list is unsorted and we do not want to sort it first.', 'The list has 1,000,000 sorted values.', 'We need the fewest comparisons in the worst case.', 'The list is already in reverse order.'],
      a: 0, e: 'Sequential search needs no ordering. Sorting first costs far more than one pass through the list.' },
    { q: 'What is the <b>best case</b> for sequential search?',
      o: ['The target is the first item (1 comparison).', 'The target is in the middle (n/2 comparisons).', 'The target is the last item (n comparisons).', 'The list is sorted.'],
      a: 0, e: 'Best case = target in the first position, so only one comparison.' },
    { q: 'A list has 1,000 sorted items. Roughly how many times fewer comparisons does binary search need (worst case) than sequential search needs (average)?',
      o: ['About 50 times', 'About 2 times', 'About 500 times', 'About 5 times'],
      a: 0, e: 'Sequential averages 500 comparisons; binary needs at most 10. 500 / 10 = 50.' },
    { q: 'Which search algorithm requires the data to be <i>ordered</i> in some meaningful way?',
      o: ['Binary search', 'Sequential search', 'Both', 'Neither'],
      a: 0, e: 'Only binary search relies on order.' },
    { q: 'Why does the lesson say you cannot just always use binary search?',
      o: ['The data usually is not sorted, and sorting it first costs time.', 'Binary search is not correct for numbers.', 'Binary search takes more memory than the list itself.', 'Binary search cannot find the first item.'],
      a: 0, e: 'Binary search is fast but only legal on ordered data.' }
  ];

  searching.push(function (rng) {
    var concept = rng.pick(SEARCH_CONCEPTS);
    return { type: 'mc', prompt: '<p>' + concept.q + '</p>', options: concept.o, answer: concept.a, explain: concept.e };
  });

  /* Put pseudocode lines in order: sequential search for the largest or smallest value. */
  searching.push(function (rng) {
    var variable = rng.pick(['max', 'min']);
    var isMax = variable === 'max';
    var comparison = isMax ? '>' : '<';

    var lines = [
      'i ← 1',
      variable + ' ← value of item i in the list',
      'repeat',
      '    increment i',
      '    if value of item i in the list ' + comparison + ' ' + variable,
      '    then',
      '        ' + variable + ' ← value of item i in the list',
      '    end',
      'until i = the length of the list',
      'display ' + variable
    ];

    return {
      type: 'order',
      prompt: '<p>Put these pseudocode lines in the right order to build a sequential search that finds the <b>' +
        (isMax ? 'largest' : 'smallest') + '</b> value in a list. (Indentation is already correct.)</p>',
      items: lines,
      explain: 'Start by assuming the first item is the ' + (isMax ? 'largest' : 'smallest') + ', then repeatedly advance, compare, and replace when you find a ' +
        (isMax ? 'greater' : 'smaller') + ' value.'
    };
  });


  /* ==========================================================================
   * 4. SORTING PROBLEMS
   * ========================================================================== */

  var sorting = [];

  /*
   * "Show the list after each pass" for bubble / selection / insertion sort.
   * One generator body is shared by the three problems below.
   */
  function passTableProblem(rng, which) {
    var n = rng.int(6, 7);
    var list = randomList(rng, n, 1, 9);

    var result = which === 'bubble' ? algo.bubble(list)
      : which === 'selection' ? algo.selection(list)
      : algo.insertion(list);

    var rows = [['original list', listText(list)]];
    result.passes.forEach(function (pass, i) {
      rows.push([i + 1, listCell(listText(pass.list), 13)]);
    });

    var NAME = { bubble: 'bubble sort', selection: 'selection sort', insertion: 'insertion sort' };
    var TIP = {
      bubble: 'Each pass compares neighbours left-to-right, swapping out-of-order pairs, so the largest remaining value bubbles to the end.',
      selection: 'Each pass finds the smallest value in the unsorted part and swaps it with the first unsorted item.',
      insertion: 'Each pass takes the first unsorted item and slides it back into its place in the sorted part on the left ' +
        '(after pass <i>k</i>, the first <i>k</i>+1 items are in order).'
    };

    return {
      type: 'table',
      prompt: '<p>Show how <b>' + NAME[which] + '</b> works on the list below by writing the list after each pass ' +
        '(separate values with spaces). Sort into ascending order.' +
        (which === 'bubble' ? ' Use the standard bubble sort: <i>n</i>−1 passes.' : '') + '</p>',
      head: ['Pass', 'List'],
      rows: rows,
      explain: TIP[which]
    };
  }
  sorting.push(function (rng) { return passTableProblem(rng, 'bubble'); });
  sorting.push(function (rng) { return passTableProblem(rng, 'selection'); });
  sorting.push(function (rng) { return passTableProblem(rng, 'insertion'); });

  /*
   * Given the pass-by-pass table, which sort produced it?
   * We keep trying lists until the chosen algorithm's table is different from the
   * other three, so the answer is never ambiguous.
   */
  sorting.push(function (rng) {
    for (var attempt = 0; attempt < 300; attempt++) {
      var n = rng.int(6, 7);
      var list = randomList(rng, n, 1, 9);
      var answerIndex = rng.int(0, 3);   // index into SORT_NAMES

      var results = [algo.bubble(list), algo.bubble(list, true), algo.selection(list), algo.insertion(list)];
      var tables = results.map(function (res) {
        return res.passes.map(function (p) { return listText(p.list); }).join('|');
      });

      var isAmbiguous = tables.filter(function (t) { return t === tables[answerIndex]; }).length > 1;
      var tooShort = results[answerIndex].passes.length < 3;
      // For "optimized bubble sort" the table must actually stop early, or it looks like plain bubble sort.
      var notEarly = answerIndex === 1 && results[1].passes.length >= n - 1;
      if (isAmbiguous || tooShort || notEarly) continue;

      var rows = [['Original', listText(list)]].concat(
        results[answerIndex].passes.map(function (p, i) { return [i + 1, listText(p.list)]; })
      );
      var tableHtml = '<table class="pr-table"><thead><tr><th>Pass</th><th>List</th></tr></thead><tbody>' +
        rows.map(function (row) { return '<tr><td>' + row[0] + '</td><td>' + row[1] + '</td></tr>'; }).join('') +
        '</tbody></table>';

      var EXPLANATIONS = [
        'Bubble sort: the largest remaining value moves to the end each pass, and it always runs <i>n</i>−1 passes.',
        'Optimized bubble sort: like bubble sort, but it stops after a pass with no swaps (that is why the table is shorter than <i>n</i>−1 passes).',
        'Selection sort: the smallest remaining value is swapped to the front of the unsorted part each pass.',
        'Insertion sort: the sorted part grows from the left, with each new item inserted into place.'
      ];

      return {
        type: 'mc',
        prompt: '<p>Which sorting algorithm produced the table below?</p>' + tableHtml,
        options: SORT_NAMES,
        answer: answerIndex,
        noShuffle: true,
        explain: EXPLANATIONS[answerIndex]
      };
    }
    throw new Error('could not build an unambiguous sort table');
  });

  /*
   * Count comparisons and swaps pass-by-pass for bubble sort (or optimized bubble sort),
   * then work out the total time. Compare = `compareSecs`, swap = `swapSecs`.
   */
  function timedBubbleProblem(optimized) {
    return function (rng) {
      var n = rng.int(5, 6);
      var list, result;
      do {
        list = randomList(rng, n, 1, 9);
        result = algo.bubble(list, optimized);
        // For the optimized version, insist on a list that really finishes early.
      } while (optimized && result.passes.length >= n - 1);

      var compareSecs = rng.pick([1, 2, 3]);
      var swapSecs = rng.pick([4, 5, 6]);
      var totalSecs = result.comps * compareSecs + result.swaps * swapSecs;

      var rows = result.passes.map(function (pass, i) {
        return [i + 1, num(pass.comps), num(pass.swaps), listCell(listText(pass.list), 12)];
      });
      rows.push(['Totals', num(result.comps), num(result.swaps), 'NA']);
      rows.push(['Total time (s)', '', '', num(totalSecs, 0, 'sm')]);

      return {
        type: 'table',
        prompt: '<p>Nola the Nutria sorts ' + n + ' items by size (shortest to longest) using <b>' + (optimized ? 'optimized ' : '') + 'bubble sort</b>. ' +
          'Comparing two items takes <b>' + compareSecs + ' s</b> and swapping them takes <b>' + swapSecs + ' s</b>. ' +
          'Starting order: <b>' + list.join(', ') + '</b>.</p>' +
          '<p>Fill in each pass' +
          (optimized ? ' (the optimized version stops after the first pass with no swaps; the table has exactly the rows you need)' : '') +
          ', then the totals and the total time.</p>',
        head: ['Pass', 'Comparisons', 'Swaps', 'Resulting list'],
        rows: rows,
        explain: 'Total comparisons = ' + result.comps + ', total swaps = ' + result.swaps + '. ' +
          'Time = ' + result.comps + ' × ' + compareSecs + ' + ' + result.swaps + ' × ' + swapSecs + ' = <b>' + totalSecs + ' seconds</b>.'
      };
    };
  }
  sorting.push(timedBubbleProblem(false));
  sorting.push(timedBubbleProblem(true));

  /* Totals only (no pass table), for bubble, optimized bubble, or insertion sort. */
  sorting.push(function (rng) {
    var n = rng.int(5, 6);
    var list = randomList(rng, n, 1, 9);
    var which = rng.pick(['bubble', 'optimized', 'insertion']);
    var compareSecs = rng.pick([1, 2, 3]);
    var swapSecs = rng.pick([2, 4, 5]);

    var result = which === 'bubble' ? algo.bubble(list)
      : which === 'optimized' ? algo.bubble(list, true)
      : algo.insertion(list);
    var totalSecs = result.comps * compareSecs + result.swaps * swapSecs;

    var label = which === 'insertion' ? 'insertion sort (a "swap" here is one slide of an item)'
      : which === 'optimized' ? 'optimized bubble sort'
      : 'bubble sort';

    return {
      type: 'blanks',
      prompt: '<p>Sort <b>' + list.join(', ') + '</b> (ascending) with <b>' + label + '</b>. A comparison takes ' + compareSecs +
        ' s and a swap/slide takes ' + swapSecs + ' s. (Use the lesson\'s definition: each pass compares only the still-unsorted part; ' +
        'insertion sort stops comparing as soon as an item is in place.)</p>',
      template: '<p>Comparisons: [[c]]  Swaps/slides: [[s]]  Total time: [[t]] seconds</p>',
      blanks: { c: num(result.comps, 0), s: num(result.swaps, 0), t: num(totalSecs, 0) },
      explain: 'Comparisons = ' + result.comps + ', swaps = ' + result.swaps + ' → ' + result.comps + '×' + compareSecs + ' + ' +
        result.swaps + '×' + swapSecs + ' = ' + totalSecs + ' s.'
    };
  });

  /* Descriptions of each sort, for the matching problem. Each entry is [description, sort name]. */
  var SORT_DESCRIPTIONS = [
    ['Identifies the smallest item in the unsorted portion of the list and swaps it with the first unsorted item.', 'Selection Sort'],
    ['After each pass, the largest item moves to the end of the list.', 'Bubble Sort'],
    ['Ends early if a single pass has no swaps in it.', 'Optimized Bubble Sort'],
    ['Divides the list into a sorted and an unsorted portion, and places the next unsorted item in the right spot inside the sorted portion.', 'Insertion Sort'],
    ['Makes at most one swap per pass.', 'Selection Sort'],
    ['The method most people use to arrange a hand of playing cards.', 'Insertion Sort'],
    ['Best case is only <i>n</i> − 1 comparisons (list already sorted).', 'Insertion Sort'],
    ['Repeatedly compares neighbouring items and swaps them if they are out of order.', 'Bubble Sort']
  ];

  /* Match four descriptions (one per sort) to the sort they describe. */
  sorting.push(function (rng) {
    var pairs = ['Selection Sort', 'Bubble Sort', 'Optimized Bubble Sort', 'Insertion Sort'].map(function (name) {
      return rng.pick(SORT_DESCRIPTIONS.filter(function (d) { return d[1] === name; }));
    });
    return {
      type: 'match',
      prompt: '<p>Match each description with the sorting algorithm it describes.</p>',
      pairs: rng.shuffle(pairs),
      choices: SORT_NAMES
    };
  });

  /* "Which is the better choice?" questions. Each entry is [question, [option A, option B], index of the better option]. */
  var BETTER_CHOICE = [
    ['When searching through an <b>unsorted</b> list, the better choice is:', ['Sequential Search', 'Binary Search'], 0],
    ['When searching through a <b>sorted</b> list of 1,000,000 values, the better choice is:', ['Sequential Search', 'Binary Search'], 1],
    ['When sorting a list that is <b>already in order</b>, which finishes with fewer passes?', ['Selection Sort', 'Optimized Bubble Sort'], 1],
    ['Which sort makes the <b>same number of comparisons</b> no matter how the values are ordered?', ['Selection Sort', 'Insertion Sort'], 0],
    ['Which sort makes <b>at most one swap per pass</b>?', ['Bubble Sort', 'Selection Sort'], 1],
    ['Which sort needs <b>about half as many comparisons on average</b> as the other?', ['Insertion Sort', 'Selection Sort'], 0],
    ['For a <b>very small</b> unsorted list you only need to search once. Which is simpler and good enough?', ['Sequential Search', 'Binary Search'], 0]
  ];

  /* Four random "which is better" questions in one problem. */
  sorting.push(function (rng) {
    var questions = rng.sample(BETTER_CHOICE, 4);
    var blanks = {};
    var template = '';

    questions.forEach(function (q, i) {
      var text = q[0], options = q[1], correctIndex = q[2];
      blanks['b' + i] = choice(options[correctIndex], options);
      template += '<p>' + String.fromCharCode(97 + i) + '. ' + text + ' [[b' + i + ']]</p>';
    });

    return {
      type: 'blanks',
      prompt: '<p>For each situation, choose the better option.</p>',
      template: template,
      blanks: blanks,
      explain: 'Binary search needs sorted data; optimized bubble sort stops early on sorted input; selection sort always does ' +
        '½(<i>n</i>²−<i>n</i>) comparisons and at most one swap per pass; insertion sort averages ¼(<i>n</i>²−<i>n</i>).'
    };
  });

  /* Use the comparison-count formulas with a machine that does 1,000,000 comparisons per second. */
  sorting.push(function (rng) {
    var n = rng.pick([100, 500, 1000, 2000, 5000, 10000]);
    var COMPARISONS_PER_SECOND = 1000000;

    var bubbleComparisons = (n * n - n) / 2;      // bubble and selection: always ½(n² − n)
    var insertionComparisons = (n * n - n) / 4;   // insertion sort, average case: ¼(n² − n)

    return {
      type: 'blanks',
      prompt: '<p>A computer performs <b>1,000,000 comparisons per second</b>. Use the formulas from the lesson to estimate how long it takes ' +
        'to sort a list of <b>' + n.toLocaleString() + '</b> items. (Answer in seconds; ignore swaps.)</p>',
      template: '<p>Bubble sort: [[b]] seconds</p><p>Insertion sort (average case): [[i]] seconds</p>',
      blanks: {
        b: num(bubbleComparisons / COMPARISONS_PER_SECOND, 0.001, 8),
        i: num(insertionComparisons / COMPARISONS_PER_SECOND, 0.001, 8)
      },
      explain: 'Bubble/selection: ½(<i>n</i>²−<i>n</i>) = ' + bubbleComparisons.toLocaleString() + ' comparisons → ' + bubbleComparisons / COMPARISONS_PER_SECOND + ' s. ' +
        'Insertion (average): ¼(<i>n</i>²−<i>n</i>) = ' + insertionComparisons.toLocaleString() + ' → ' + insertionComparisons / COMPARISONS_PER_SECOND + ' s — about half as long.'
    };
  });

  /* Insertion sort: best, worst and average number of comparisons for n items. */
  sorting.push(function (rng) {
    var n = rng.pick([5, 8, 10, 12, 20, 50]);

    return {
      type: 'blanks',
      prompt: '<p>For insertion sort on <b>' + n + '</b> items, how many comparisons are made in each case?</p>',
      template: '<p>Best case (already sorted): [[b]]</p><p>Worst case (reverse sorted): [[w]]</p><p>Average case: [[a]]</p>',
      blanks: {
        b: num(n - 1, 0),                    // one comparison per pass
        w: num((n * n - n) / 2, 0),          // ½(n² − n)
        a: num((n * n - n) / 4, 0, 'sm')     // ¼(n² − n)
      },
      explain: 'Best: (<i>n</i>−1)·1 = ' + (n - 1) + '. Worst: ½(<i>n</i>²−<i>n</i>) = ' + (n * n - n) / 2 + '. ' +
        'Average: ¼(<i>n</i>²−<i>n</i>) = ' + (n * n - n) / 4 + '.'
    };
  });

  /* Fill in the blanks of the selection sort code from the lesson's activity. */
  sorting.push(function () {
    // `kind: 'code'` ignores spaces, so "n-1" and "n - 1" are both accepted.
    function codeBlank(answer, width) { return { kind: 'code', ans: [answer], w: width || 'sm' }; }

    return {
      type: 'blanks',
      prompt: '<p>Complete this Python implementation of <b>selection sort</b> by filling in each blank.</p>',
      template: '<pre class="pr-code">' +
        'n = len(numbers)\n' +
        'for i in range(0, [[a]]):\n' +
        '    minPosition = i\n' +
        '    for j in range([[b]], n):\n' +
        '        if (numbers[j] [[c]] numbers[minPosition]):\n' +
        '            minPosition = [[d]]\n' +
        '    temp = numbers[i]\n' +
        '    numbers[i] = numbers[[[e]]]\n' +
        '    numbers[minPosition] = [[f]]</pre>',
      blanks: {
        a: codeBlank('n-1'),
        b: codeBlank('i+1'),
        c: codeBlank('<'),
        d: codeBlank('j'),
        e: codeBlank('minPosition', 8),
        f: codeBlank('temp')
      },
      explain: 'The outer loop makes <i>n</i>−1 passes; the inner loop scans the unsorted part (<code>i+1</code> up to <code>n</code>) for a smaller value; ' +
        'then the first unsorted item and the smallest are swapped via <code>temp</code>.'
    };
  });

  /* Reference solutions for the "write the sort" coding problem. */
  var SORT_SOLUTIONS = {
    bubble:
      'def bubble_sort(numbers):\n' +
      '    n = len(numbers)\n' +
      '    for p in range(1, n):\n' +
      '        for i in range(0, n - p):\n' +
      '            if numbers[i] > numbers[i + 1]:\n' +
      '                temp = numbers[i]\n' +
      '                numbers[i] = numbers[i + 1]\n' +
      '                numbers[i + 1] = temp\n',
    selection:
      'def selection_sort(numbers):\n' +
      '    n = len(numbers)\n' +
      '    for i in range(0, n - 1):\n' +
      '        minPosition = i\n' +
      '        for j in range(i + 1, n):\n' +
      '            if numbers[j] < numbers[minPosition]:\n' +
      '                minPosition = j\n' +
      '        temp = numbers[i]\n' +
      '        numbers[i] = numbers[minPosition]\n' +
      '        numbers[minPosition] = temp\n',
    insertion:
      'def insertion_sort(numbers):\n' +
      '    for k in range(1, len(numbers)):\n' +
      '        key = numbers[k]\n' +
      '        j = k - 1\n' +
      '        while j >= 0 and numbers[j] > key:\n' +
      '            numbers[j + 1] = numbers[j]\n' +
      '            j -= 1\n' +
      '        numbers[j + 1] = key\n'
  };

  /* Write bubble / selection / insertion sort in Python (the code runs in the browser via Pyodide). */
  sorting.push(function (rng) {
    var which = rng.pick(['bubble', 'selection', 'insertion']);
    var functionName = which + '_sort';

    function randomPyList() { return pyList(rng.distinct(rng.int(4, 8), 1, 40)); }
    var testLists = [randomPyList(), randomPyList(), '[5, 4, 3, 2, 1]', '[1, 2, 3]', '[7]'];

    // Each test sets x to a list, runs the student's function on it, then checks x was sorted in place.
    var tests = testLists.map(function (listLiteral, i) {
      return {
        label: 'Test ' + (i + 1) + ': ' + functionName + '(' + listLiteral + ')',
        setup: 'x = ' + listLiteral + '\n',
        check: '(' + functionName + '(x), x)[1]',
        expect: 'sorted(' + listLiteral + ')'
      };
    });

    return {
      type: 'code',
      prompt: '<p>Write a function <code>' + functionName + '(numbers)</code> that sorts the list <b>in place</b> into ascending order using <b>' +
        which + ' sort</b> (do not use <code>sort()</code> or <code>sorted()</code>).</p>',
      starter: 'def ' + functionName + '(numbers):\n    # your code here\n    pass\n',
      tests: tests,
      solution: SORT_SOLUTIONS[which]
    };
  });

  /* Write binary_search(numbers, target) in Python. */
  sorting.push(function (rng) {
    function randomSortedList() { return ascending(rng.distinct(rng.int(5, 10), 1, 60)); }
    var listA = randomSortedList();
    var listB = randomSortedList();

    // [list, target] pairs: present, missing (too big), first item, last item, missing (too small), one-item list.
    var cases = [
      [listA, rng.pick(listA)],
      [listA, 61],
      [listB, listB[0]],
      [listB, listB[listB.length - 1]],
      [listB, 0],
      [[7], 7]
    ];

    var tests = cases.map(function (c, i) {
      var call = 'binary_search(' + pyList(c[0]) + ', ' + c[1] + ')';
      return { label: 'Test ' + (i + 1) + ': ' + call, check: call, expect: String(c[0].indexOf(c[1])) };
    });

    return {
      type: 'code',
      prompt: '<p>Write a function <code>binary_search(numbers, target)</code> that uses a <b>binary search</b> on the sorted list ' +
        '<code>numbers</code> and returns the <b>index</b> of <code>target</code>, or <code>-1</code> if it is not in the list.</p>',
      starter: 'def binary_search(numbers, target):\n    # your code here\n    return -1\n',
      tests: tests,
      solution:
        'def binary_search(numbers, target):\n' +
        '    first = 0\n' +
        '    last = len(numbers) - 1\n' +
        '    while first <= last:\n' +
        '        mid = (first + last) // 2\n' +
        '        if numbers[mid] == target:\n' +
        '            return mid\n' +
        '        elif target > numbers[mid]:\n' +
        '            first = mid + 1\n' +
        '        else:\n' +
        '            last = mid - 1\n' +
        '    return -1\n'
    };
  });


  /* ==========================================================================
   * 5. "EXPLORE" WIDGETS (step-through visualisations; nothing is graded)
   * ========================================================================== */

  /* A row of boxes showing a list. `classes` maps index -> CSS class (cmp, swp, done, mid, out). */
  function cellsHtml(list, classes) {
    return '<div class="pr-cells">' +
      list.map(function (value, i) {
        return '<div class="pr-cell ' + (classes[i] || '') + '">' + esc(value) + '<small>' + i + '</small></div>';
      }).join('') +
      '</div>';
  }

  /* Numbers typed into a text box -> array of numbers (ignores everything else). */
  function parseNumbers(text, maxCount) {
    return (text.match(/-?\d+(\.\d+)?/g) || []).map(Number).slice(0, maxCount);
  }

  /* classes object marking indexes [from, to) as already sorted. */
  function markDone(from, to) {
    var classes = {};
    for (var i = from; i < to; i++) classes[i] = 'done';
    return classes;
  }

  /*
   * Run a sort and record one "frame" per interesting moment: the list, which cells to highlight,
   * a one-line explanation, and the running comparison/swap counts. The stepper widget just
   * walks forward and backward through these frames.
   */
  function sortFrames(which, list) {
    var a = list.slice();
    var n = a.length;
    var frames = [];
    var comps = 0;
    var swaps = 0;

    function snapshot(message, classes) {
      frames.push({ list: a.slice(), cls: classes || {}, msg: message, comps: comps, swaps: swaps });
    }

    snapshot('Starting list.');

    if (which === 'selection') {
      for (var i = 0; i < n - 1; i++) {
        var minPos = i;

        for (var j = i + 1; j < n; j++) {
          comps++;
          var isSmaller = a[j] < a[minPos];
          var classes = markDone(0, i);
          classes[minPos] = 'mid';   // smallest so far
          classes[j] = 'cmp';        // value being compared
          snapshot('Compare ' + a[j] + ' with the smallest so far (' + a[minPos] + '): ' + (isSmaller ? 'new smallest!' : 'no change.'), classes);
          if (isSmaller) minPos = j;
        }

        var swapClasses = markDone(0, i);
        swapClasses[i] = 'swp';
        if (minPos !== i) {
          var temp = a[i]; a[i] = a[minPos]; a[minPos] = temp;
          swaps++;
          swapClasses[minPos] = 'swp';
          snapshot('Swap the smallest (' + a[i] + ') into position ' + i + '.', swapClasses);
        } else {
          snapshot(a[i] + ' is already the smallest: it stays in position ' + i + '.', swapClasses);
        }
      }

    } else if (which === 'insertion') {
      for (var k = 1; k < n; k++) {
        var key = a[k];
        var p = k - 1;

        var startClasses = markDone(0, k);
        startClasses[k] = 'mid';
        snapshot('Next item to insert: ' + key + '.', startClasses);

        while (p >= 0) {
          comps++;
          if (a[p] > key) {
            a[p + 1] = a[p];
            a[p] = key;
            swaps++;
            var slideClasses = markDone(0, k + 1);
            slideClasses[p] = 'swp';
            slideClasses[p + 1] = 'swp';
            snapshot(a[p + 1] + ' > ' + key + ': slide ' + a[p + 1] + ' right.', slideClasses);
            p--;
          } else {
            var placedClasses = markDone(0, k + 1);
            placedClasses[p] = 'cmp';
            placedClasses[p + 1] = 'cmp';
            snapshot(a[p] + ' ≤ ' + key + ': ' + key + ' is in place.', placedClasses);
            break;
          }
        }
      }

    } else {   // 'bubble' or 'optimized'
      var optimized = which === 'optimized';

      for (var pass = 1; pass <= n - 1; pass++) {
        var anySwap = false;

        for (var x = 0; x < n - pass; x++) {
          comps++;
          var needsSwap = a[x] > a[x + 1];
          var bubbleClasses = markDone(n - pass + 1, n);   // the largest values already in place
          bubbleClasses[x] = 'cmp';
          bubbleClasses[x + 1] = 'cmp';

          if (needsSwap) {
            var t = a[x]; a[x] = a[x + 1]; a[x + 1] = t;
            swaps++;
            anySwap = true;
            bubbleClasses[x] = 'swp';
            bubbleClasses[x + 1] = 'swp';
          }
          snapshot('Pass ' + pass + ': compare positions ' + x + ' and ' + (x + 1) + ' → ' + (needsSwap ? 'swap.' : 'no swap.'), bubbleClasses);
        }

        if (optimized && !anySwap) {
          snapshot('No swaps in pass ' + pass + ' → the optimized bubble sort stops.', {});
          break;
        }
      }
    }

    snapshot('Done! ' + comps + ' comparisons, ' + swaps + ' swaps/slides.', markDone(0, n));
    return frames;
  }

  /* Widget: pick a sort, type a list, and step through it. */
  P.widgets.sortStepper = function (box) {
    box.innerHTML = '<h4>Explore: step through a sort</h4>';

    // Controls
    var listInput = U.el('input', { type: 'text', value: '7 9 3 5 1', class: 'pr-sm', style: 'width:11em' });
    var algoSelect = U.el('select');
    [['bubble', 'Bubble sort'], ['optimized', 'Optimized bubble sort'], ['selection', 'Selection sort'], ['insertion', 'Insertion sort']]
      .forEach(function (o) { algoSelect.appendChild(U.el('option', { value: o[0] }, o[1])); });

    var backButton = U.el('button', { type: 'button' }, '◀ Back');
    var nextButton = U.el('button', { type: 'button', class: 'pr-primary' }, 'Step ▶');
    var randomButton = U.el('button', { type: 'button' }, '🎲 Random list');

    var controls = U.el('div', { class: 'pr-actions' });
    controls.appendChild(document.createTextNode('List: '));
    [listInput, algoSelect, backButton, nextButton, randomButton].forEach(function (c) { controls.appendChild(c); });

    // Display areas
    var view = U.el('div');
    var message = U.el('div', { class: 'pr-explain' });
    var stats = U.el('div', { class: 'pr-score' });
    [controls, view, message, stats].forEach(function (c) { box.appendChild(c); });

    var frames = [];
    var current = 0;   // index of the frame being shown

    function restart() {
      var list = parseNumbers(listInput.value, 12);
      frames = list.length ? sortFrames(algoSelect.value, list) : [];
      current = 0;
      draw();
    }

    function draw() {
      if (!frames.length) {
        view.innerHTML = '<em>Enter some numbers.</em>';
        message.textContent = '';
        stats.textContent = '';
        return;
      }
      var frame = frames[current];
      view.innerHTML = cellsHtml(frame.list, frame.cls);
      message.textContent = frame.msg;
      stats.textContent = 'Comparisons so far: ' + frame.comps + ' · Swaps/slides so far: ' + frame.swaps +
        ' · Step ' + current + ' of ' + (frames.length - 1);
    }

    nextButton.onclick = function () { if (current < frames.length - 1) { current++; draw(); } };
    backButton.onclick = function () { if (current > 0) { current--; draw(); } };
    randomButton.onclick = function () {
      var rng = U.rng(Date.now());
      listInput.value = rng.distinct(rng.int(5, 8), 1, 20).join(' ');
      restart();
    };
    listInput.oninput = restart;
    algoSelect.onchange = restart;

    restart();
  };

  /* Widget: type a sorted list and a target, and step through a binary search. */
  P.widgets.binaryStepper = function (box) {
    box.innerHTML = '<h4>Explore: step through a binary search</h4>';

    // Controls
    var listInput = U.el('input', { type: 'text', value: '10 20 30 40 50 60 70 80 90 100', style: 'width:22em' });
    var targetInput = U.el('input', { type: 'text', value: '70', class: 'pr-sm' });
    var backButton = U.el('button', { type: 'button' }, '◀ Back');
    var nextButton = U.el('button', { type: 'button', class: 'pr-primary' }, 'Step ▶');

    var controls = U.el('div', { class: 'pr-actions' });
    controls.appendChild(document.createTextNode('Sorted list: '));
    controls.appendChild(listInput);
    controls.appendChild(document.createTextNode(' Target: '));
    [targetInput, backButton, nextButton].forEach(function (c) { controls.appendChild(c); });

    var view = U.el('div');
    var message = U.el('div', { class: 'pr-explain' });
    [controls, view, message].forEach(function (c) { box.appendChild(c); });

    var search = null;   // result of algo.binary, or null when the list isn't sorted
    var current = 0;     // 0 = before the first comparison; k = after k comparisons
    var list = [];

    function restart() {
      list = parseNumbers(listInput.value, 20);
      if (!algo.isSorted(list)) {
        view.innerHTML = '<em>Binary search needs a sorted list (smallest to largest)!</em>';
        message.textContent = '';
        search = null;
        return;
      }
      search = algo.binary(list, parseFloat(targetInput.value));
      current = 0;
      draw();
    }

    function draw() {
      if (!search) return;
      var target = targetInput.value;

      if (current === 0) {
        view.innerHTML = cellsHtml(list, {});
        message.textContent = 'Press Step to make the first comparison. Searching for ' + target + '.';
        return;
      }

      var step = search.steps[current - 1];

      // Fade out everything that has already been discarded; highlight the middle value.
      var classes = {};
      list.forEach(function (_, i) { if (i < step.first || i > step.last) classes[i] = 'out'; });
      classes[step.mid] = 'mid';
      view.innerHTML = cellsHtml(list, classes);

      var outcome = step.act === 'found' ? ' = ' + target + ': FOUND at index ' + step.mid + '.'
        : step.act === 'right' ? ' < ' + target + ': discard the left half.'
        : ' > ' + target + ': discard the right half.';
      var isLastStepAndMissed = current === search.steps.length && step.act !== 'found';

      message.textContent = 'Comparison ' + current + ': first=' + step.first + ', last=' + step.last + ', mid=' + step.mid +
        ' → ' + step.val + outcome +
        (isLastStepAndMissed ? ' The remaining portion is empty → ' + target + ' is not in the list.' : '');
    }

    nextButton.onclick = function () { if (search && current < search.steps.length) { current++; draw(); } };
    backButton.onclick = function () { if (search && current > 0) { current--; draw(); } };
    listInput.oninput = restart;
    targetInput.oninput = restart;

    restart();
  };


  /* ==========================================================================
   * 6. REGISTRATION
   *
   * Each section id matches the `data-sections` attribute used by the pages in
   * practice/04 Searching and Sorting/.
   * ========================================================================== */

  P.register('searchsort', {
    sections: [
      {
        id: 'searching',
        title: 'Searching',
        intro: '<p>Sequential vs. binary search: when each applies, how many comparisons they make, and how to trace them.</p>',
        problems: [{ widget: 'binaryStepper' }].concat(searching)
      },
      {
        id: 'sorting',
        title: 'Sorting',
        intro: '<p>Bubble, optimized bubble, selection and insertion sort: trace them by hand, count comparisons and swaps, and write the code.</p>',
        problems: [{ widget: 'sortStepper' }].concat(sorting)
      }
    ]
  });
})();
