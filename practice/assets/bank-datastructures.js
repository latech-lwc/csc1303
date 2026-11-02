/* ==========================================================================
   Practice bank: Lesson 05 – Introduction to Data Structures
   (covers exam 3, questions 1-5)

   Every problem is a generator: a function that receives a seeded random
   number generator `r` and returns one question object. The engine
   (engine.js) turns that object into an interactive card. Pressing
   "New variant" simply calls the generator again with a fresh seed.

   Useful `r` methods (see engine.js): r.int(lo, hi), r.pick(list),
   r.sample(list, n), r.shuffle(list), r.chance(p), and
   r.distinct(count, lo, hi) for `count` different integers in [lo, hi].

   Some questions carry a `_pycheck` property: a small real Python program
   plus the output it should produce. It is never shown to students; the
   verification scripts run it under CPython to prove that the answer key
   computed in JavaScript really matches what Python prints.

   The file is organised as:
     1. Small helpers shared by the generators
     2. Section "arrays" – arrays vs. lists, indexes, slicing, methods, range()
     3. Section "loops"  – predicting, completing and writing loops over lists
     4. Registration of the bank
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Practice;
  var U = P.util;
  var code = U.code;   // wraps text in a <pre> code block


  /* ------------------------------------------------------------------------
     1. Helpers
     ------------------------------------------------------------------------ */

  // How Python writes a list: [1, 2, 3]
  function pyList(list) {
    return '[' + list.join(', ') + ']';
  }

  // An answer field for a list or other free-form value; graded ignoring spacing and brackets.
  function listField(answer, width) {
    return { kind: 'list', ans: answer, w: width || 14 };
  }

  // An answer field that expects a whole number (graded exactly).
  function num(answer) {
    return { kind: 'num', ans: answer, tol: 0, w: 'sm' };
  }

  // An answer field for a short piece of code typed into a code template.
  function codeField(answer, width) {
    return { kind: 'code', ans: answer, w: width || 'sm' };
  }

  function sumOf(numbers) {
    return numbers.reduce(function (total, n) { return total + n; }, 0);
  }

  function ascending(a, b) {
    return a - b;
  }


  /* ==========================================================================
     2. Section "arrays": arrays and lists
     ========================================================================== */
  var arrays = [];

  // [statement, 'A' for classic array / 'L' for Python list]
  var ARRAY_OR_LIST = [
    ['Its size is fixed when it is created.', 'A'],
    ['It can grow and shrink in size using methods such as <code>append()</code> and <code>remove()</code>.', 'L'],
    ['It can hold values of different data types, such as the int <code>1</code>, the string <code>"hello"</code> and the float <code>2.5</code>.', 'L'],
    ['Its values are stored contiguously (next to each other) in memory.', 'A'],
    ['Every element must be the same kind of data (all numbers, all letters, …).', 'A'],
    ['It has built-in methods such as <code>insert()</code>, <code>count()</code> and <code>sort()</code>.', 'L'],
    ['It is written with square brackets, like <code>[94, 78, 100, 86]</code>.', 'L'],
    ['It is a collection of <i>similar</i> pieces of data.', 'A']
  ];

  // Exam question 1: is each statement about an array or a Python list?
  arrays.push(function (r) {
    function ofKind(kind) {
      return ARRAY_OR_LIST.filter(function (x) { return x[1] === kind; });
    }

    // Guarantee at least one array statement and one list statement, then add two more.
    var guaranteed = [r.pick(ofKind('A')), r.pick(ofKind('L'))];
    var others = ARRAY_OR_LIST.filter(function (x) { return guaranteed.indexOf(x) < 0; });
    var extra = r.sample(others, 2);

    return {
      type: 'match',
      prompt: '<p>Each statement describes either a classic <b>array</b> (<b>A</b>) or a <b>Python list</b> (<b>L</b>). Choose which.</p>',
      pairs: r.shuffle(guaranteed.concat(extra)),
      choices: ['A', 'L'],
      explain: 'An array has a fixed size and holds similar items in contiguous memory. A Python list is more ' +
               'flexible: it can grow/shrink and hold different types.'
    };
  });

  // A pool of vocabulary questions (index, value, data, data structure…).
  // `a` is the index of the correct option in `o`.
  var TERMS = [
    {
      q: 'In a list, the term <b>index</b> refers to…',
      o: ['the position of an item, starting at 0', 'the number of items in the list',
          'the data stored at a position', 'the name given to the list'], a: 0
    },
    {
      q: 'In a list, the term <b>value</b> refers to…',
      o: ['the data stored at a position', 'the position of an item', 'the number of items',
          'a list that only contains numbers'], a: 0
    },
    {
      q: 'An index tells you <b>where</b> an element is; a value tells you…',
      o: ['what the element is', 'how many elements there are', 'the memory address of the list',
          'the type of the list'], a: 0
    },
    {
      q: '<b>Data</b> becomes <b>information</b> when…',
      o: ['it is processed or combined so it has meaning', 'it is stored in memory', 'it is placed in a list',
          'it is converted to binary'], a: 0
    },
    {
      q: 'A <b>data structure</b> is…',
      o: ['a way of organizing data in a computer so it can be used efficiently', 'any value stored in a variable',
          'a loop that repeats over data', 'a type of function'], a: 0
    },
    {
      q: 'What does "contiguous memory locations" mean?',
      o: ['The data is stored in memory locations right next to each other', 'The data is stored in random places',
          'The data is copied twice', 'The data is stored on disk'], a: 0
    },
    {
      q: 'A sequence with <i>n</i> elements has indexes…',
      o: ['0 through n − 1', '1 through n', '0 through n', '1 through n − 1'], a: 0
    }
  ];

  arrays.push(function (r) {
    var t = r.pick(TERMS);
    return { type: 'mc', prompt: '<p>' + t.q + '</p>', options: t.o, answer: t.a };
  });

  // Exam question 2c: indexes, values, len() and negative indexes.
  arrays.push(function (r) {
    var n = r.int(4, 6);
    var scores = r.distinct(n, 50, 100);
    var knownIndex = r.int(0, n - 1);
    var searchedValue = scores[r.int(0, n - 1)];
    var negative = r.int(1, n);

    return {
      type: 'blanks',
      prompt: '<p>Given:</p>' + code('scores = ' + pyList(scores)),
      template: '<p>The <b>index</b> of the value <code>' + searchedValue + '</code> is [[a]]</p>' +
                '<p><code>scores[' + knownIndex + ']</code> is [[b]]</p>' +
                '<p><code>len(scores)</code> is [[c]] and the last valid index is [[d]]</p>' +
                '<p><code>scores[-' + negative + ']</code> is [[e]]</p>',
      blanks: {
        a: num(scores.indexOf(searchedValue)),
        b: num(scores[knownIndex]),
        c: num(n),
        d: num(n - 1),
        e: num(scores[n - negative])
      },
      explain: 'Indexes start at 0, so a list of ' + n + ' items has indexes 0–' + (n - 1) + '. A negative index ' +
               'counts from the right: <code>scores[-1]</code> is the last item.'
    };
  });

  // Slicing: [lower:upper] includes lower, excludes upper, and always gives a list.
  arrays.push(function (r) {
    var n = r.int(6, 8);
    var stuff = r.distinct(n, 1, 50);
    var lower = r.int(0, 2);
    var upper = r.int(lower + 2, n - 1);
    var fromRight = r.int(1, n - 1);

    return {
      type: 'blanks',
      prompt: '<p>Given:</p>' + code('stuff = ' + pyList(stuff)) +
              '<p>Write the result of each expression exactly as Python would show it, e.g. <code>[3, 4]</code>.</p>',
      template: '<p><code>stuff[' + lower + ':' + upper + ']</code> → [[a]]</p>' +
                '<p><code>stuff[' + (n - 2) + ':' + n + ']</code> → [[b]]</p>' +
                '<p><code>stuff[-' + fromRight + ']</code> → [[c]]</p>' +
                '<p><code>stuff[' + lower + ':' + (lower + 1) + ']</code> → [[d]]</p>',
      blanks: {
        a: listField(pyList(stuff.slice(lower, upper)), 16),
        b: listField(pyList(stuff.slice(n - 2, n)), 12),
        c: listField(String(stuff[n - fromRight]), 6),
        d: listField(pyList(stuff.slice(lower, lower + 1)), 8)
      },
      explain: 'A slice <code>[lower:upper]</code> includes <code>lower</code> but <b>not</b> <code>upper</code> ' +
               'and always produces a <i>list</i> (even with one item). <code>stuff[-' + fromRight + ']</code> is ' +
               'the ' + fromRight + 'th item from the right and is a single value, not a list.'
    };
  });

  // Trace a series of list-method calls (append, insert, remove, del, reverse, sort).
  arrays.push(function (r) {
    var n = r.int(5, 6);
    var start = r.distinct(n, 1, 30);
    var current = start.slice();                       // tracks the real contents as the statements are applied
    var lines = ['data = ' + pyList(start)];

    // Four different operations, in random order.
    var operations = r.sample(['append', 'insert', 'remove', 'del', 'reverse', 'sort'], 4);
    operations.forEach(function (op) {
      if (op === 'append') {
        var appended = r.int(31, 60);
        current.push(appended);
        lines.push('data.append(' + appended + ')');
      } else if (op === 'insert') {
        var position = r.int(0, current.length - 1);
        var inserted = r.int(31, 60) + 10;
        current.splice(position, 0, inserted);
        lines.push('data.insert(' + position + ', ' + inserted + ')');
      } else if (op === 'remove') {
        var removed = r.pick(current);
        current.splice(current.indexOf(removed), 1);   // remove() deletes the first match
        lines.push('data.remove(' + removed + ')');
      } else if (op === 'del') {
        var deletedIndex = r.int(0, current.length - 1);
        current.splice(deletedIndex, 1);
        lines.push('del data[' + deletedIndex + ']');
      } else if (op === 'reverse') {
        current.reverse();
        lines.push('data.reverse()');
      } else {
        current.sort(ascending);
        lines.push('data.sort()');
      }
    });

    var largest = Math.max.apply(null, current);
    var smallest = Math.min.apply(null, current);

    var q = {
      type: 'blanks',
      prompt: '<p>Trace these statements. Work from top to bottom — each one changes <code>data</code>.</p>' +
              code(lines.join('\n')),
      template: '<p>Final contents of <code>data</code>: [[a]]</p>' +
                '<p><code>len(data)</code> = [[b]]  <code>max(data)</code> = [[c]]  <code>min(data)</code> = [[d]]</p>',
      blanks: { a: listField(pyList(current), 24), b: num(current.length), c: num(largest), d: num(smallest) },
      explain: '<code>append</code> adds to the end; <code>insert(i, v)</code> puts <code>v</code> at index <i>i</i> ' +
               'and shifts the rest right; <code>remove(v)</code> deletes the first <code>v</code>; ' +
               '<code>del data[i]</code> deletes by index; <code>reverse()</code> and <code>sort()</code> change ' +
               'the list in place. Result: ' + pyList(current)
    };
    q._pycheck = {
      code: lines.join('\n') + '\nprint(data)\nprint(len(data), max(data), min(data))',
      out: pyList(current) + '\n' + current.length + ' ' + largest + ' ' + smallest
    };
    return q;
  });

  // What values does range(start, stop[, step]) produce?
  arrays.push(function (r) {
    var start = r.int(-3, 4);
    var step = r.pick([1, 1, 2, 3]);                // 1 appears twice so it is the most common
    var stop = start + r.int(4, 11);

    var values = [];
    for (var i = start; i < stop; i += step) values.push(i);

    return {
      type: 'blanks',
      prompt: '<p>What values does <code>range(' + start + ', ' + stop + (step !== 1 ? ', ' + step : '') + ')</code> ' +
              'produce? (The loop <code>for i in range(…)</code> sets <code>i</code> to each of them in turn.)</p>',
      template: '<p>Values (separated by spaces or commas): [[v]]</p>' +
                '<p>How many times does the loop body run? [[n]]</p>',
      blanks: { v: listField(pyList(values), 24), n: num(values.length) },
      explain: '<code>range(start, stop, step)</code> includes <code>start</code> but <b>stops before</b> ' +
               '<code>stop</code>. So the last value is ' + values[values.length - 1] + '.'
    };
  });


  /* ==========================================================================
     3. Section "loops": loops over lists
     ========================================================================== */
  var loops = [];

  // "What does this program print?" for one of four small list-processing loops.
  loops.push(function (r) {
    var n = r.int(5, 7);
    var nums = r.distinct(n, 1, 30);
    var variant = r.int(0, 3);

    var source;     // the Python program
    var output;     // what it prints

    if (variant === 0) {
      // sum of the even numbers
      source = 'nums = ' + pyList(nums) + '\ntotal = 0\nfor n in nums:\n    if n % 2 == 0:\n        total += n\nprint(total)';
      output = String(sumOf(nums.filter(function (v) { return v % 2 === 0; })));
    } else if (variant === 1) {
      // count of values above a threshold
      var threshold = r.int(10, 20);
      source = 'nums = ' + pyList(nums) + '\ncount = 0\nfor n in nums:\n    if n > ' + threshold +
               ':\n        count += 1\nprint(count)';
      output = String(nums.filter(function (v) { return v > threshold; }).length);
    } else if (variant === 2) {
      // sequential search for the largest value
      source = 'nums = ' + pyList(nums) + '\nlargest = nums[0]\nfor i in range(1, len(nums)):\n' +
               '    if nums[i] > largest:\n        largest = nums[i]\nprint(largest)';
      output = String(Math.max.apply(null, nums));
    } else {
      // double every element in place, then print the whole list
      source = 'nums = ' + pyList(nums) + '\ni = 0\nwhile i < len(nums):\n    nums[i] = nums[i] * 2\n' +
               '    i += 1\nprint(nums)';
      output = pyList(nums.map(function (v) { return v * 2; }));
    }

    var q = {
      type: 'blanks',
      prompt: '<p>What does this program print?</p>' + code(source),
      template: '<p>Output: [[o]]</p>',
      blanks: { o: listField(output, 18) },
      explain: 'Trace the loop one iteration at a time, keeping track of every variable that changes.'
    };
    q._pycheck = { code: source, out: output };
    return q;
  });

  // Exam question 4: complete a for loop that changes every element in place.
  loops.push(function (r) {
    var n = r.int(7, 9);
    var values = r.distinct(n, 1, 20);
    var indexName = r.pick(['i', 'idx', 'index', 'pos']);
    // [operator text appended to the statement, description for the prompt]
    var change = r.pick([
      ['+ 1', 'increments every value by 1'],
      ['+ 2', 'adds 2 to every value'],
      ['* 2', 'doubles every value'],
      ['- 1', 'decreases every value by 1']
    ]);
    var listName = r.pick(['ages', 'scores', 'prices']);

    return {
      type: 'blanks',
      prompt: '<p>Complete the program so that a <code>for</code> loop ' + change[1] + ' <b>in place</b>. It must ' +
              'work for a list of any size, not just this one. Use <code>' + indexName + '</code> as the loop variable.</p>',
      template: '<pre class="pr-code">' + listName + ' = ' + pyList(values) +
                '\nfor [[a]] in [[b]]([[c]]([[d]])):\n    ' +
                listName + '[[[e]]] = ' + listName + '[[[f]]] ' + change[0] + '</pre>',
      blanks: {
        a: codeField(indexName, 7),
        b: codeField('range'),
        c: codeField('len'),
        d: codeField(listName, 8),
        e: codeField(indexName, 7),
        f: codeField(indexName, 7)
      },
      explain: '<code>range(len(' + listName + '))</code> produces every valid index 0 … n−1. Using the ' +
               '<i>index</i> lets you assign back into the list; a loop variable that holds a <i>value</i> would ' +
               'only change a copy.'
    };
  });

  // Exam question 5: write a while loop that changes some elements of an existing list in place.
  loops.push(function (r) {
    // `d` describes the task, `f` is the rule applied to each element (used to compute the
    // expected result), and `sol` is a reference solution.
    var tasks = [
      {
        d: 'squares every <b>even</b> value in place',
        f: function (a) { return a % 2 === 0 ? a * a : a; },
        sol: 'i = 0\nwhile i < len(numbers):\n    if numbers[i] % 2 == 0:\n        numbers[i] = numbers[i] ** 2\n    i += 1\n'
      },
      {
        d: 'doubles every <b>odd</b> value in place',
        f: function (a) { return a % 2 === 1 ? a * 2 : a; },
        sol: 'i = 0\nwhile i < len(numbers):\n    if numbers[i] % 2 == 1:\n        numbers[i] = numbers[i] * 2\n    i += 1\n'
      },
      {
        d: 'replaces every value <b>greater than 10</b> with 10 (in place)',
        f: function (a) { return a > 10 ? 10 : a; },
        sol: 'i = 0\nwhile i < len(numbers):\n    if numbers[i] > 10:\n        numbers[i] = 10\n    i += 1\n'
      },
      {
        d: 'adds 5 to every value that is a <b>multiple of 3</b> (in place)',
        f: function (a) { return a % 3 === 0 ? a + 5 : a; },
        sol: 'i = 0\nwhile i < len(numbers):\n    if numbers[i] % 3 == 0:\n        numbers[i] = numbers[i] + 5\n    i += 1\n'
      }
    ];

    var task = r.pick(tasks);
    var shown = r.distinct(r.int(8, 10), 1, 20);          // the list shown in the prompt

    // The student's code is also run on other lists (including edge cases) so it can't be hard-coded.
    var testLists = [shown, [3, 4, 5], [12], r.distinct(6, 1, 30), [9, 6, 3, 12, 18]];
    var tests = testLists.map(function (list) {
      return {
        label: 'List ' + pyList(list),
        setup: 'numbers = ' + pyList(list),              // runs before the student's code
        check: 'numbers',                                // evaluated after it
        expect: pyList(list.map(task.f))
      };
    });

    return {
      type: 'code',
      prompt: '<p>Assume the list below is the first line of your program. Write Python code using a ' +
              '<b>while loop</b> that ' + task.d + '. You must change the original list — do not create a new one — ' +
              'and it must work for a list of any size.</p>' + code('numbers = ' + pyList(shown)),
      starter: '# numbers is already defined above\n',
      tests: tests,
      solution: task.sol
    };
  });

  // Exam question 3: create a list of consecutive integers, print the first and last.
  loops.push(function (r) {
    var first = r.int(1, 6);
    var last = first + r.int(3, 6);
    var listName = r.pick(['nums', 'values', 'data']);

    var values = [];
    for (var i = first; i <= last; i++) values.push(i);

    return {
      type: 'code',
      prompt: '<p>Write Python code that</p><ol type="a">' +
              '<li>creates a list called <code>' + listName + '</code> containing the integers from <b>' + first +
              '</b> through <b>' + last + '</b>, including both;</li>' +
              '<li>prints the <b>first</b> element of the list; and</li>' +
              '<li>prints the <b>last</b> element of the list (use a negative index).</li></ol>',
      starter: '',
      tests: [{
        label: 'creates ' + listName + ' and prints first and last',
        check: listName,
        expect: pyList(values),
        expectOut: values[0] + '\n' + values[values.length - 1]
      }],
      solution: listName + ' = ' + pyList(values) + '\nprint(' + listName + '[0])\nprint(' + listName + '[-1])\n'
    };
  });

  // Sequential search written in Python: find the largest value, or the index of a target.
  loops.push(function (r) {
    var mode = r.pick(['largest', 'position']);

    // Test lists: two random ones, a one-element list, and a descending list.
    function randomList() {
      return r.distinct(r.int(5, 12), 1, 99);
    }
    var lists = [randomList(), randomList(), [42], [5, 4, 3, 2, 1]];

    if (mode === 'largest') {
      var largestTests = lists.map(function (list) {
        return {
          label: 'numbers = ' + pyList(list),
          setup: 'numbers = ' + pyList(list),
          expectOut: 'The largest value is: ' + Math.max.apply(null, list)
        };
      });
      return {
        type: 'code',
        prompt: '<p>A list named <code>numbers</code> already exists. Write code that uses a ' +
                '<b>sequential search</b> (a <code>for</code> loop that keeps track of the biggest value so far — ' +
                'do <i>not</i> use <code>max()</code>) and prints:</p>' +
                '<pre class="pr-code">The largest value is: 87</pre>',
        starter: '# numbers is already defined\n',
        tests: largestTests,
        solution: 'largest = numbers[0]\nfor index in range(1, len(numbers)):\n    if numbers[index] > largest:\n' +
                  '        largest = numbers[index]\nprint("The largest value is: {}".format(largest))\n'
      };
    }

    // "position" mode: odd-numbered tests search for a value that is not in the list (1000);
    // the others search for a randomly chosen element that is.
    var positionTests = lists.map(function (list, i) {
      var target = i % 2 ? 1000 : list[r.int(0, list.length - 1)];
      var foundAt = list.indexOf(target);
      return {
        label: 'numbers = ' + pyList(list) + ', target = ' + target,
        setup: 'numbers = ' + pyList(list) + '\ntarget = ' + target,
        expectOut: foundAt >= 0 ? target + ' was found at index ' + foundAt : target + ' was not found'
      };
    });
    return {
      type: 'code',
      prompt: '<p>The variables <code>numbers</code> (a list) and <code>target</code> already exist. Use a ' +
              '<b>sequential search</b> to print <code>X was found at index I</code> if <code>target</code> is in ' +
              'the list, or <code>X was not found</code> if it is not (where X is the target).</p>',
      starter: '# numbers and target are already defined\n',
      tests: positionTests,
      solution: 'found = False\nfor i in range(len(numbers)):\n    if numbers[i] == target:\n' +
                '        print("{} was found at index {}".format(target, i))\n        found = True\n        break\n' +
                'if not found:\n    print("{} was not found".format(target))\n'
    };
  });


  /* ==========================================================================
     4. Registration
     ========================================================================== */
  P.register('datastructures', {
    sections: [
      {
        id: 'arrays',
        title: 'Arrays, lists, indexes and values',
        intro: '<p>Vocabulary and the core list operations: indexing, slicing, methods and <code>range()</code>.</p>',
        problems: arrays
      },
      {
        id: 'loops',
        title: 'Loops over lists',
        intro: '<p>Predict, complete and write loops that read and change lists. Coding problems run your code in your browser.</p>',
        problems: loops
      }
    ]
  });
})();
