/* ==========================================================================
   Practice bank: Lesson 02 – Introduction to Computer Programming
   (covers exam 1, questions 2-9)

   Every problem is a generator: a function that receives a seeded random
   number generator `r` and returns one question object. The engine
   (engine.js) turns that object into an interactive card. Pressing
   "New variant" simply calls the generator again with a fresh seed.

   Useful `r` methods (see engine.js): r.int(lo, hi), r.pick(list),
   r.sample(list, n), r.shuffle(list), r.chance(p).

   Some questions carry a `_pycheck` property: a small real Python program
   plus the output it should produce. It is never shown to students; the
   verification scripts run it under CPython to prove that the answer key
   computed in JavaScript really matches what Python prints.

   The file is organised as:
     1. Small helpers shared by the generators
     2. Section "concepts"    – languages, compilers, constructs, data types
     3. Section "operators"   – expressions, operators and strings
     4. Section "identifiers" – identifiers, reserved words, comments
     5. Section "tracing"     – predicting output and execution order
     6. Section "errors"      – spotting syntax / name / type errors
     7. Section "writing"     – writing real functions (tested in the browser)
     8. Registration of the bank
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Practice;
  var U = P.util;
  var code = U.code;   // wraps text in a <pre> code block (second argument adds line numbers)


  /* ------------------------------------------------------------------------
     1. Helpers
     ------------------------------------------------------------------------ */

  // An answer field that expects a whole number (graded exactly).
  function num(answer, width) {
    return { kind: 'num', ans: answer, tol: 0, w: width || 'sm' };
  }

  // A True/False drop-down.
  function trueFalse(value) {
    return { kind: 'select', choices: ['True', 'False'], ans: value ? 'True' : 'False' };
  }

  function pyBool(value) {
    return value ? 'True' : 'False';
  }

  // The text of a "pick the matching description" multiple-choice question.
  function conceptQuestion(c) {
    return { type: 'mc', prompt: '<p>' + c.q + '</p>', options: c.o, answer: c.a, explain: c.e };
  }


  /* ==========================================================================
     2. Section "concepts": how programs run
     ========================================================================== */
  var concepts = [];

  // Exam question 4: fill in the vocabulary of getting from pseudocode to machine language.
  concepts.push(function () {
    // Several word forms are accepted for the "compile or interpret" blanks.
    var compileWords = ['compiling', 'compilation', 'compile', 'compiler', 'compiled'];
    var interpretWords = ['interpreting', 'interpretation', 'interpret', 'interpreter', 'interpreted'];
    var translateWords = compileWords.concat(interpretWords);

    return {
      type: 'blanks',
      prompt: '<p>Fill in each blank with the term that makes the statement accurate.</p>',
      template: '<p>Before writing real code, programmers often sketch an algorithm in [[a]], an informal, ' +
                'English-like description sometimes called "fake code".</p>' +
                '<p>Actual software is written in a [[b]] such as C++ or Python.</p>' +
                '<p>Computers do not run Python or C++ directly. The code a human types is converted by a ' +
                'process called [[c]] or [[d]] into binary digits that represent instructions.</p>' +
                '<p>These binary instructions, made up entirely of 1s and 0s, are known as [[e]].</p>',
      blanks: {
        a: { kind: 'text', ans: ['pseudocode', 'pseudo code', 'pseudo-code'], w: 12 },
        b: { kind: 'text', ans: ['programming language', 'high-level language', 'high level language', 'programming languages'], w: 14 },
        c: { kind: 'text', ans: translateWords, w: 12 },
        d: { kind: 'text', ans: translateWords, w: 12 },
        e: { kind: 'text', ans: ['machine language', 'machine code', 'machine instructions'], w: 14 }
      },
      explain: 'Pseudocode → programming language → (compiled or interpreted) → machine language. ' +
               'Compilation translates the whole program ahead of time; interpretation translates it ' +
               'statement-by-statement as it runs. Python is interpreted.'
    };
  });

  // [description, term] pairs for the vocabulary matching problem.
  var DEFINITIONS = [
    ['A set of instructions a CPU can execute directly, made entirely of 1s and 0s', 'Machine language'],
    ['Mnemonics that stand for machine-code instructions (e.g. <code>mov</code>)', 'Assembly language'],
    ['A tool that translates a whole program into machine language before it runs', 'Compiler'],
    ['Translates and runs a program one statement at a time as it executes', 'Interpreter'],
    ['Software that lets you write, run and debug programs in one place (e.g. IDLE)', 'IDE'],
    ['A program is a sequence of commands (statements) the computer follows', 'Imperative paradigm'],
    ['A collection of tested, reusable subprograms for common problems', 'Software library'],
    ['A named block of statements that can return a value to its caller', 'Function']
  ];

  concepts.push(function (r) {
    var five = r.sample(DEFINITIONS, 5);
    var allTerms = DEFINITIONS.map(function (d) { return d[1]; });

    return {
      type: 'match',
      prompt: '<p>Match each description with the correct term.</p>',
      pairs: five,
      choices: allTerms
    };
  });

  // [description, construct] pairs for sequence / selection / repetition.
  var CONSTRUCTS = [
    ['Statements run one after another, in the order they are written', 'Sequence'],
    ['<code>x = 1</code>, then <code>y = 2</code>, then <code>print(x + y)</code>', 'Sequence'],
    ['An <code>if</code>/<code>elif</code>/<code>else</code> chooses which block of code to run', 'Selection'],
    ['A block runs only when a condition is true (otherwise it is skipped)', 'Selection'],
    ['A <code>while</code> loop repeats a block while a condition stays true', 'Repetition'],
    ['A <code>for</code> loop runs its body once for each item in a list', 'Repetition'],
    ['A function that calls itself (recursion) is a kind of…', 'Repetition']
  ];

  // Exam question 5: classify four descriptions as sequence, selection or repetition.
  concepts.push(function (r) {
    function ofKind(kind) {
      return CONSTRUCTS.filter(function (c) { return c[1] === kind; });
    }

    // One of each kind first, so every answer choice appears at least once...
    var picked = [r.pick(ofKind('Sequence')), r.pick(ofKind('Selection')), r.pick(ofKind('Repetition'))];
    // ...then a fourth, different description of any kind.
    picked.push(r.pick(CONSTRUCTS.filter(function (c) { return picked.indexOf(c) < 0; })));

    return {
      type: 'match',
      prompt: '<p>Is each description <b>sequence</b>, <b>selection</b> or <b>repetition</b>?</p>',
      pairs: r.shuffle(picked),
      choices: ['Sequence', 'Selection', 'Repetition']
    };
  });

  // A pool of short conceptual multiple-choice questions. `a` is the index of
  // the correct option in `o`; `e` is the (optional) explanation.
  var CONCEPT_QUESTIONS = [
    {
      q: 'In Scratch you could write <i>repeat until n = 10</i>. Which Python loop is equivalent?',
      o: ['<code>while n != 10:</code>', '<code>while n == 10:</code>', '<code>until n == 10:</code>', '<code>for n == 10:</code>'], a: 0,
      e: 'Python has no repeat-until. Repeating <i>until</i> a condition is true is the same as repeating <i>while</i> it is false.'
    },
    {
      q: 'What data type does <code>input()</code> return in Python 3?',
      o: ['A string (text)', 'An integer', 'A float', 'It depends on what the user types'], a: 0,
      e: 'Input is always text. Convert it with <code>int()</code> or <code>float()</code> if you need a number.'
    },
    {
      q: 'Python is best described as…',
      o: ['an interpreted, imperative language', 'a compiled, functional language', 'a machine language', 'an assembly language'], a: 0
    },
    {
      q: 'What does an IDE like IDLE let you do?',
      o: ['Design, execute and debug programs in one environment', 'Convert Python to machine language only',
          'Draw flowcharts', 'Replace the operating system'], a: 0
    },
    {
      q: 'Which is <b>not</b> a primitive Python data type used in this course?',
      o: ['<code>flowchart</code>', '<code>int</code>', '<code>float</code>', '<code>str</code>'], a: 0
    },
    {
      q: 'What does a <b>comment</b> do?',
      o: ['Nothing when the program runs — it is for human readers', 'Prints text to the screen', 'Stops the program', 'Declares a variable'], a: 0,
      e: 'Single-line comments start with <code>#</code>; multi-line comments are wrapped in <code>"""</code> or <code>\'\'\'</code>.'
    },
    {
      q: 'Why does <code>print("Age: " + 20)</code> fail?',
      o: ['You cannot add a string and an integer; convert with <code>str(20)</code>', 'print needs two arguments',
          '20 is a reserved word', 'Strings cannot contain colons'], a: 0
    }
  ];

  concepts.push(function (r) {
    return conceptQuestion(r.pick(CONCEPT_QUESTIONS));
  });

  // Match five values / expressions to their Python data type.
  concepts.push(function (r) {
    var values = [
      ['42', 'int'], ['3.14', 'float'], ['"42"', 'str'], ['True', 'bool'], ['-7', 'int'], ['2.0', 'float'],
      ['"True"', 'str'], ['10 / 4', 'float'], ['10 // 4', 'int'], ['str(5)', 'str'], ['len("abc")', 'int']
    ];
    var five = r.sample(values, 5);

    return {
      type: 'match',
      prompt: '<p>What is the Python data type of each value or expression?</p>',
      pairs: five.map(function (v) { return ['<code>' + v[0] + '</code>', v[1]]; }),
      choices: ['int', 'float', 'str', 'bool'],
      explain: 'Quotes make a string, even around digits. <code>/</code> always gives a float; ' +
               '<code>//</code> on two ints gives an int.'
    };
  });


  /* ==========================================================================
     3. Section "operators": expressions and operators
     ========================================================================== */
  var ops = [];

  // Exam question 6: evaluate five Boolean expressions for given x and y.
  ops.push(function (r) {
    var x = r.int(10, 30);
    var y = r.int(x - 12, x + 25);
    if (y === x) y += 3;                       // keep x and y different so "!=" and ">" are interesting

    var offsetA = r.int(5, 25);
    var offsetB = r.int(5, 15);
    // Half the time the target sum is correct, half the time it is deliberately wrong.
    var targetSum = r.chance(0.5) ? x + y : x + y + r.pick([-10, 10, 5]);

    // One randomly chosen relational operator, with a function that computes it.
    var relation = r.pick([
      ['>',  function (a, b) { return a > b; }],
      ['<',  function (a, b) { return a < b; }],
      ['>=', function (a, b) { return a >= b; }],
      ['!=', function (a, b) { return a !== b; }],
      ['<=', function (a, b) { return a <= b; }]
    ]);

    // [expression text, value] for each of the five rows.
    var expressions = [
      ['x ' + relation[0] + ' y', relation[1](x, y)],
      ['x + ' + offsetA + ' >= y', x + offsetA >= y],
      ['x + ' + offsetA + ' > y - ' + offsetB, x + offsetA > y - offsetB],
      ['x + y == ' + targetSum, x + y === targetSum],
      ['x - y < 0', x - y < 0]
    ];

    var blanks = {};
    var template = '';
    expressions.forEach(function (e, i) {
      blanks['e' + i] = trueFalse(e[1]);
      template += '<p>' + String.fromCharCode(97 + i) + '. <code>' + e[0] + '</code> → [[e' + i + ']]</p>';
    });

    return {
      type: 'blanks',
      prompt: '<p>Given <code>x = ' + x + '</code> and <code>y = ' + y + '</code>, evaluate each Boolean expression.</p>',
      template: template,
      blanks: blanks,
      explain: 'Substitute the values and evaluate the arithmetic first, then compare. For example ' +
               '<code>x - y &lt; 0</code> is <code>' + (x - y) + ' &lt; 0</code>.'
    };
  });

  // Arithmetic operators: //, %, **, /, and operator precedence.
  ops.push(function (r) {
    var a = r.int(12, 60);
    var b = r.int(3, 9);
    var c = r.int(2, 4);
    var d = b * r.int(2, 6);       // a multiple of b, so d / b is a tidy whole-number float

    var q = {
      type: 'blanks',
      prompt: '<p>With <code>a = ' + a + '</code>, <code>b = ' + b + '</code>, <code>c = ' + c + '</code> and ' +
              '<code>d = ' + d + '</code>, what does each expression evaluate to?</p>',
      template: '<p><code>a // b</code> = [[a1]]</p>' +
                '<p><code>a % b</code> = [[a2]]</p>' +
                '<p><code>b ** c</code> = [[a3]]</p>' +
                '<p><code>d / b</code> = [[a4]] (a float, so it prints like <code>4.0</code>)</p>' +
                '<p><code>a + b * c</code> = [[a5]]</p>',
      blanks: {
        a1: num(Math.floor(a / b)),
        a2: num(a % b),
        a3: num(Math.pow(b, c)),
        a4: num(d / b),
        a5: num(a + b * c)
      },
      explain: '<code>//</code> is floor division, <code>%</code> is the remainder, <code>**</code> is ' +
               'exponentiation, and <code>*</code> happens before <code>+</code>.'
    };

    // Real Python must print the same five values.
    q._pycheck = {
      code: 'a=' + a + '\nb=' + b + '\nc=' + c + '\nd=' + d + '\nprint(a // b, a % b, b ** c, d / b, a + b * c)',
      out: [Math.floor(a / b), a % b, Math.pow(b, c), (d / b).toFixed(1), a + b * c].join(' ')
    };
    return q;
  });

  // Assignment operators: +=, -=, *=, //=, %=, **=.
  ops.push(function (r) {
    var a = r.int(20, 60);
    var b = r.int(3, 9);
    var chosen = r.sample(['+=', '-=', '*=', '//=', '%=', '**='], 4);
    var smallExponent = r.int(2, 3);    // ** uses a small right-hand side so the result stays readable

    var apply = {
      '+=':  function (x, y) { return x + y; },
      '-=':  function (x, y) { return x - y; },
      '*=':  function (x, y) { return x * y; },
      '//=': function (x, y) { return Math.floor(x / y); },
      '%=':  function (x, y) { return x % y; },
      '**=': function (x, y) { return Math.pow(x, y); }
    };

    var blanks = {};
    var template = '';
    chosen.forEach(function (op, i) {
      var rhs = op === '**=' ? smallExponent : b;
      blanks['p' + i] = num(apply[op](a, rhs));
      template += '<p><code>a = ' + a + '</code> then <code>a ' + op + ' ' + rhs + '</code> → ' +
                  '<code>a</code> is now [[p' + i + ']]</p>';
    });

    return {
      type: 'blanks',
      prompt: '<p>Each line starts fresh with the value of <code>a</code> shown. What is <code>a</code> afterwards?</p>',
      template: template,
      blanks: blanks,
      explain: '<code>a += b</code> means <code>a = a + b</code>, and likewise for the other operators.'
    };
  });

  // [expression, what it prints ("error" for a TypeError), explanation].
  var STRING_EXPRESSIONS = [
    ['"ab" * 3', 'ababab', 'Multiplying a string repeats it.'],
    ['"1" + "1"', '11', 'Adding two strings concatenates them.'],
    ['1 + "1"', 'error', 'You cannot add an int and a string: TypeError.'],
    ['"one" + str(1)', 'one1', '<code>str(1)</code> turns the number into text first.'],
    ['1 + int("1")', '2', '<code>int("1")</code> is the number 1.'],
    ['"Hi" + " " + "there"', 'Hi there', ''],
    ['"a" * 0', '', ''],                        // prints an empty line; filtered out below (cannot be typed)
    ['str(5) + str(5)', '55', ''],
    ['"7" * 2', '77', 'The string "7" is repeated twice (not multiplied).'],
    ['"one" + 1', 'error', 'TypeError: cannot concatenate str and int.']
  ];

  ops.push(function (r) {
    var printable = STRING_EXPRESSIONS.filter(function (s) { return s[1] !== ''; });
    var picked = r.sample(printable, 5);

    var blanks = {};
    var template = '';
    picked.forEach(function (p, i) {
      var accepted = p[1] === 'error' ? ['error', 'typeerror', 'type error'] : p[1];
      blanks['s' + i] = { kind: 'text', ans: accepted, w: 9 };
      template += '<p><code>print(' + p[0] + ')</code> → [[s' + i + ']]</p>';
    });

    return {
      type: 'blanks',
      prompt: '<p>What does each statement print? Type <b>error</b> if Python would raise an error instead. ' +
              '(Don\'t type quotes.)</p>',
      template: template,
      blanks: blanks,
      explain: picked.map(function (p) { return p[2]; }).filter(Boolean).join(' ')
    };
  });


  /* ==========================================================================
     4. Section "identifiers": identifiers, reserved words, comments
     ========================================================================== */
  var ids = [];

  var VALID_IDENTIFIERS = [
    'average', 'Average', 'average_grade', 'averageScore', '_mustard', '_7a69_', 'a1b2c3X7Y9Z0',
    'total', 'myAge', 'x_2', 'Num1', 'student_count', '__init'
  ];
  // [text, why it is not a valid identifier]
  var INVALID_IDENTIFIERS = [
    ['2nd_place', 'starts with a digit'], ['my-age', 'contains a hyphen'], ['total score', 'contains a space'],
    ['class', 'reserved word'], ['while', 'reserved word'], ['for', 'reserved word'],
    ['$cost', 'starts with a symbol'], ['price!', 'contains a symbol'], ['3d', 'starts with a digit'],
    ['def', 'reserved word'], ['return', 'reserved word'], ['x.y', 'contains a dot'], ['True', 'reserved word']
  ];

  // Check every valid Python identifier in a mixed list of valid and invalid names.
  ids.push(function (r) {
    var valid = r.sample(VALID_IDENTIFIERS, 4);
    var invalid = r.sample(INVALID_IDENTIFIERS, 4);

    // [text, isValid, reason]; shuffled so valid and invalid names are mixed together.
    var all = r.shuffle(
      valid.map(function (name) { return [name, true, '']; })
        .concat(invalid.map(function (item) { return [item[0], false, item[1]]; }))
    );

    var validIndexes = [];
    all.forEach(function (entry, i) { if (entry[1]) validIndexes.push(i); });

    var reasons = all.filter(function (entry) { return !entry[1]; }).map(function (entry) {
      return '<code>' + U.esc(entry[0]) + '</code> (' + entry[2] + ')';
    });

    return {
      type: 'multi',
      prompt: '<p>Which of these are <b>valid Python identifiers</b>? Check all that apply. ' +
              '(Remember: Python is case-sensitive.)</p>',
      options: all.map(function (entry) { return '<code>' + U.esc(entry[0]) + '</code>'; }),
      answers: validIndexes,
      noShuffle: true,            // `all` is already shuffled; answers refer to these positions
      explain: 'An identifier starts with a letter or underscore, followed by letters, digits or underscores, ' +
               'and cannot be a reserved word. Not valid: ' + reasons.join(', ') + '.'
    };
  });

  var RESERVED_WORDS = [
    'while', 'if', 'else', 'elif', 'def', 'return', 'for', 'in', 'and', 'or', 'not', 'True', 'False', 'None',
    'import', 'from', 'class', 'break', 'pass', 'is'
  ];
  var NOT_RESERVED = [
    'print', 'input', 'int', 'str', 'len', 'range', 'max', 'sum', 'list', 'float', 'total', 'name'
  ];

  // Check the reserved words in a mixed list.
  ids.push(function (r) {
    var reserved = r.sample(RESERVED_WORDS, 3);
    var ordinary = r.sample(NOT_RESERVED, 4);
    var all = r.shuffle(reserved.concat(ordinary));

    var reservedIndexes = [];
    all.forEach(function (word, i) { if (reserved.indexOf(word) >= 0) reservedIndexes.push(i); });

    return {
      type: 'multi',
      prompt: '<p>Which of these words are <b>reserved words</b> (keywords) that <i>cannot</i> be used as ' +
              'variable names?</p>',
      options: all.map(function (word) { return '<code>' + word + '</code>'; }),
      answers: reservedIndexes,
      noShuffle: true,
      explain: 'Reserved words: False, None, True, and, as, assert, async, await, break, class, continue, def, ' +
               'del, elif, else, except, finally, for, from, global, if, import, in, is, lambda, nonlocal, not, ' +
               'or, pass, raise, return, try, while, with, yield. Functions like <code>print</code> and ' +
               '<code>len</code> are <i>not</i> reserved (though redefining them is a bad idea).'
    };
  });

  // A program full of comments: what does it print, and how many lines are comments?
  ids.push(function (r) {
    var a = r.int(2, 9);
    var b = r.int(2, 9);

    var source = [
      '"""',                       // 1  ┐
      'Author: Pat',               // 2  │ lines 1-4: a multi-line comment
      'Description: demo',         // 3  │
      '"""',                       // 4  ┘
      'a = ' + a,                  // 5
      'b = ' + b,                  // 6
      '# b = b * 10',              // 7  whole-line comment
      'total = a + b  # add them', // 8  code followed by a comment (not counted)
      "'''",                       // 9  ┐
      'total = total * 100',       // 10 │ lines 9-11: another multi-line comment
      "'''",                       // 11 ┘
      'print(total)'               // 12
    ];

    var q = {
      type: 'blanks',
      prompt: '<p>What does this program print?</p>' + code(source.join('\n'), true),
      template: '<p>Output: [[o]]</p>' +
                '<p>How many lines of the program are <i>entirely</i> comment (or part of a multi-line comment)? [[c]]</p>',
      blanks: { o: num(a + b), c: num(8) },
      explain: 'Text inside <code>"""…"""</code> or <code>\'\'\'…\'\'\'</code> and everything after <code>#</code> ' +
               'is ignored. Lines 1–4, 7 and 9–11 are comments (8 lines); line 8 has code followed by a comment.'
    };
    q._pycheck = { code: source.join('\n'), out: String(a + b) };
    return q;
  });


  /* ==========================================================================
     5. Section "tracing": predicting output and execution order
     ========================================================================== */
  var trace = [];

  // Builds a pool of small functions together with a call and its expected
  // result, for the exam q8 "show what each print outputs" problem. Each entry:
  //   defs  – the function definition(s) as Python source
  //   call  – the expression that gets printed
  //   val   – what it prints
  // All random numbers are drawn here, in a fixed order.
  function functionCallPool(r) {
    var pool = [];

    // add(p, q)
    var p = r.int(2, 9);
    var q = r.int(2, 9);
    var k = r.int(2, 8);
    pool.push({
      defs: 'def add(a, b):\n    return a + b',
      call: 'add(' + p + ', ' + q + ')',
      val: String(p + q)
    });

    // nested calls: square(double(k))
    pool.push({
      defs: 'def square(x):\n    return x * x\ndef double(x):\n    return 2 * x',
      call: 'square(double(' + k + '))',
      val: String(Math.pow(2 * k, 2))
    });

    // f-string greeting
    var name = r.pick(['Alice', 'Bo', 'Casey', 'Dana', 'Eli']);
    pool.push({
      defs: 'def greet(name):\n    return f"Hello, {name}"',
      call: 'greet("' + name + '")',
      val: 'Hello, ' + name
    });

    // nested if / elif / else grading
    var score = r.pick([92, 96, 85, 70, 95, 88, 100, 79, 90, 80]);
    pool.push({
      defs: 'def grade(score):\n    if (score >= 90):\n        if (score >= 95):\n            return "A+"\n' +
            '        return "A"\n    elif (score >= 80):\n        return "B"\n    else:\n        return "C"',
      call: 'grade(' + score + ')',
      val: score >= 95 ? 'A+' : score >= 90 ? 'A' : score >= 80 ? 'B' : 'C'
    });

    // while loop accumulating squares
    var n = r.int(2, 6);
    var sumOfSquares = 0;
    for (var i = 0; i <= n; i++) sumOfSquares += i * i;
    pool.push({
      defs: 'def sum_of_squares(n):\n    total = 0\n    i = 0\n    while (i <= n):\n        total += (i * i)\n' +
            '        i += 1\n    return total',
      call: 'sum_of_squares(' + n + ')',
      val: String(sumOfSquares)
    });

    // factorial
    var f = r.int(3, 6);
    var factorial = 1;
    for (var j = 2; j <= f; j++) factorial *= j;
    pool.push({
      defs: 'def factorial(n):\n    result = 1\n    while (n > 1):\n        result *= n\n        n -= 1\n    return result',
      call: 'factorial(' + f + ')',
      val: String(factorial)
    });

    // is_even
    var e = r.int(4, 21);
    pool.push({
      defs: 'def is_even(x):\n    return x % 2 == 0',
      call: 'is_even(' + e + ')',
      val: pyBool(e % 2 === 0)
    });

    // bigger of two
    var m1 = r.int(3, 40);
    var m2 = r.int(3, 40);
    pool.push({
      defs: 'def bigger(a, b):\n    if (a > b):\n        return a\n    else:\n        return b',
      call: 'bigger(' + m1 + ', ' + m2 + ')',
      val: String(Math.max(m1, m2))
    });

    return pool;
  }

  // Exam question 8: predict the output of five print() calls.
  trace.push(function (r) {
    var picked = r.sample(functionCallPool(r), 5);

    var definitions = picked.map(function (t) { return t.defs; }).join('\n');
    var calls = picked.map(function (t) { return 'print(' + t.call + ')'; });
    var source = definitions + '\n' + calls.join('\n');
    var expected = picked.map(function (t) { return t.val; });

    var q = {
      type: 'table',
      prompt: '<p>Show what each <code>print</code> statement at the bottom outputs. (Output text only — no quotes.)</p>' +
              code(source),
      head: ['Statement', 'Output'],
      rows: calls.map(function (call, i) {
        return ['<code>' + call + '</code>', { kind: 'text', ans: expected[i], w: 10 }];
      }),
      leftCols: [0],
      explain: 'Work from the inside out: evaluate nested calls like <code>square(double(k))</code> first.'
    };
    q._pycheck = { code: source, out: expected.join('\n') };
    return q;
  });

  // Simulates the two-while-loop program below and records the order in which
  // its seven lines execute. A `while` line counts every time its condition is
  // tested, so line 2 / line 5 appear once more than the body does.
  //   trace  – the sequence of line numbers executed
  //   states – counter_2's value at each step (undefined before it exists)
  //   out    – final value of counter_1 (what the program prints)
  function simulateTwoLoops(start1, limit1, op1, step1, limit2, step2) {
    var lines = [];
    var states = [];
    var counter1 = start1;
    var counter2;

    function execute(lineNumber) {
      lines.push(lineNumber);
      states.push({ c1: counter1, c2: counter2 });
    }

    execute(1);
    execute(2);
    while (counter1 < limit1) {
      execute(3);
      if (op1 === '*=') counter1 *= step1; else counter1 += step1;
      execute(2);
    }
    counter2 = 0;
    execute(4);
    execute(5);
    while (counter2 < limit2) {
      execute(6);
      counter2 += step2;
      execute(5);
    }
    execute(7);

    return { tr: lines, states: states, out: counter1 };
  }

  // Exam question 2: follow the order lines execute in a program with two while loops.
  trace.push(function (r) {
    // Retry with new random numbers until the program is long enough to ask about.
    for (var attempt = 0; attempt < 50; attempt++) {
      var start1 = r.int(1, 3);
      var op1 = r.pick(['*=', '+=']);
      var step1 = op1 === '*=' ? 2 : r.int(2, 4);
      var limit1 = r.int(6, 12);
      var limit2 = r.int(4, 7);
      var step2 = r.int(1, 3);

      var sim = simulateTwoLoops(start1, limit1, op1, step1, limit2, step2);
      var lineSource = [
        'counter_1 = ' + start1,
        'while (counter_1 < ' + limit1 + '):',
        '    counter_1 ' + op1 + ' ' + step1,
        'counter_2 = 0',
        'while (counter_2 < ' + limit2 + '):',
        '    counter_2 += ' + step2,
        'print(counter_1)'
      ];

      // Visits to line 5 that still have at least three lines left after them.
      var visits = [];
      sim.tr.forEach(function (line, i) {
        if (line === 5 && sim.states[i].c2 !== undefined && i + 3 < sim.tr.length) visits.push(i);
      });
      if (visits.length < 2) continue;

      // Ask about the first and last visit, which have different values of counter_2.
      var firstVisit = visits[0];
      var lastVisit = visits[visits.length - 1];
      var counter2First = sim.states[firstVisit].c2;
      var counter2Last = sim.states[lastVisit].c2;
      var lineBeforeSeven = sim.tr[sim.tr.length - 2];
      var nextThree = function (i) { return sim.tr.slice(i + 1, i + 4); };

      var q = {
        type: 'blanks',
        prompt: '<p>Use the code below and its line numbers. A line counts each time it is executed ' +
                '(a <code>while</code> line is executed every time its condition is tested).</p>' +
                code(lineSource.join('\n'), true),
        template: '<p>a. Line 5 was just executed when <code>counter_2</code> was <b>' + counter2First + '</b>. ' +
                  'The next three lines executed are: [[a1]], [[a2]], [[a3]]</p>' +
                  '<p>b. Line 5 was just executed when <code>counter_2</code> was <b>' + counter2Last + '</b>. ' +
                  'The next three lines executed are: [[b1]], [[b2]], [[b3]]</p>' +
                  '<p>c. The line executed immediately before line 7 is: [[c]]</p>' +
                  '<p>d. The output of the whole program is: [[d]]</p>',
        blanks: {
          a1: num(nextThree(firstVisit)[0]), a2: num(nextThree(firstVisit)[1]), a3: num(nextThree(firstVisit)[2]),
          b1: num(nextThree(lastVisit)[0]),  b2: num(nextThree(lastVisit)[1]),  b3: num(nextThree(lastVisit)[2]),
          c: num(lineBeforeSeven),
          d: num(sim.out)
        },
        explain: 'Full execution order: ' + sim.tr.join(', ') + '. The condition line is re-evaluated after ' +
                 'each pass through the loop body.'
      };
      q._pycheck = { code: lineSource.join('\n'), out: String(sim.out) };
      return q;
    }
    throw new Error('no loop');
  });

  // The program for the function-call tracing problem (exam question 9),
  // one string per line, so the array index + 1 is the line number.
  var LETTER_PROGRAM = [
    'def getUserLetter():',                                          // 1
    '    return input("Enter a letter: ")',                          // 2
    'def comesBefore(a, b):',                                        // 3
    '    if (a < b):',                                               // 4
    '        return True',                                           // 5
    '    else:',                                                     // 6
    '        return False',                                          // 7
    'def comesAfter(a, b):',                                         // 8
    '    if (a > b):',                                               // 9
    '        return True',                                           // 10
    '    else:',                                                     // 11
    '        return False',                                          // 12
    'letter1 = getUserLetter()',                                     // 13
    'letter2 = getUserLetter()',                                     // 14
    'result1 = comesBefore(letter1, letter2)',                       // 15
    'print(f"{letter1} comes before {letter2} is {result1}")',       // 16
    'result2 = comesAfter(letter1, letter2)',                        // 17
    'print(f"{letter1} comes after {letter2} is {result2}")'         // 18
  ];

  // The order of executed lines in LETTER_PROGRAM for the two letters typed.
  // Function definitions (lines 1-12) only run when they are called.
  function letterProgramTrace(letter1, letter2) {
    var order = [13, 1, 2, 14, 1, 2, 15, 3, 4];     // both inputs, then the comesBefore call up to its if
    if (letter1 < letter2) order.push(5); else order.push(6, 7);
    order.push(16, 17, 8, 9);                         // print, then the comesAfter call up to its if
    if (letter1 > letter2) order.push(10); else order.push(11, 12);
    order.push(18);
    return order;
  }

  // Exam question 9: follow the order lines execute across function calls.
  trace.push(function (r) {
    var alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    var letters = r.sample(alphabet, 6);

    var pairA = [letters[0], letters[1]];
    var pairB = [letters[2], letters[3]];
    var pairEqual = [letters[4], letters[4]];       // equal letters: both comparisons are false

    // Make pairA and pairB come out opposite ways (one before, one after) so the
    // two traces take different branches.
    if (pairA[0] < pairA[1] === pairB[0] < pairB[1]) {
      var swap = pairB[0];
      pairB[0] = pairB[1];
      pairB[1] = swap;
    }

    // [letters typed, line to start from, name used in the blanks]
    var parts = [
      [pairA, 15, 'a'],
      [pairB, 17, 'b'],
      [pairEqual, 3, 'c'],
      [pairEqual, 8, 'd']
    ];

    var blanks = {};
    var template = '';
    parts.forEach(function (part) {
      var typed = part[0];
      var startLine = part[1];
      var key = part[2];

      var order = letterProgramTrace(typed[0], typed[1]);
      var at = order.indexOf(startLine);
      var next = order.slice(at + 1, at + 5);      // the four lines executed after startLine

      var blankNames = next.map(function (line, i) {
        blanks[key + i] = num(line);
        return '[[' + key + i + ']]';
      });
      template += '<p>' + key + '. The user types <b>\'' + typed[0] + '\'</b> then <b>\'' + typed[1] + '\'</b>. ' +
                  'Starting at line ' + startLine + ', the next four lines executed are: ' + blankNames.join(', ') + '</p>';
    });

    var fullOrder = letterProgramTrace(pairA[0], pairA[1]);

    return {
      type: 'blanks',
      prompt: '<p>Use the program below. Remember: <b>function definitions are not executed until they are ' +
              'called</b>; when a function is called, control jumps to its <code>def</code> line and, when it ' +
              'returns, continues with the line <i>after</i> the one that made the call.</p>' +
              code(LETTER_PROGRAM.join('\n'), true),
      template: '<p>First line executed in the whole program: [[first]]. Name of the first function to run: [[fname]]</p>' +
                template,
      blanks: Object.assign({
        first: num(13),
        fname: { kind: 'text', ans: ['getUserLetter', 'getuserletter', 'getUserLetter()'], w: 12 }
      }, blanks),
      explain: 'For letters \'' + pairA[0] + '\', \'' + pairA[1] + '\' the whole execution order is: ' +
               fullOrder.join(', ') + '. (In <code>comesBefore</code>, the <code>else:</code> line is executed ' +
               'when the <code>if</code> is false.)'
    };
  });


  /* ==========================================================================
     6. Section "errors": finding errors (exam question 7)
     ========================================================================== */
  var errors = [];

  // Lines that run without error when `name = "Sam"` and `count = 4` exist.
  var VALID_LINES = [
    'print("Hello, " + name)', 'total = count * 3', 'print(count + 1)', 'print(name * 2)', 'result = count / 2',
    'age = int(input("How old are you? "))'
  ];

  // Lines that fail, grouped by the kind of error Python reports.
  var ERROR_LINES = {
    SyntaxError: ['print("Total is " + str(count)', 'if count > 3', 'while count < 10', 'def show(a, b)', 'print("Hi)'],
    NameError: ['print(nam)', 'Print(name)', 'total = cnt + 1', 'print(Count)'],
    TypeError: ['print("Count: " + count)', 'print(name + 1)', 'result = name - 2', 'print(len(count))'],
    ZeroDivisionError: ['result = count / 0', 'print(10 // (count - 4))', 'x = count % 0']
  };

  var ERROR_REASONS = {
    SyntaxError: 'the code is not valid Python (missing parenthesis, colon or quote)',
    NameError: 'a name is used that was never defined (Python is case-sensitive)',
    TypeError: 'the operation does not work on that mix of types',
    ZeroDivisionError: 'it divides by zero'
  };

  errors.push(function (r) {
    // Two setup lines, then one line per error kind plus two lines that are fine.
    var rows = [['name = "Sam"', 'ok'], ['count = 4', 'ok']];

    var extra = Object.keys(ERROR_LINES).map(function (kind) {
      return [r.pick(ERROR_LINES[kind]), kind];
    });
    var firstOk = r.pick(VALID_LINES);
    var secondOk = r.pick(VALID_LINES.filter(function (line) { return line !== firstOk; }));
    extra.push([firstOk, 'ok']);
    extra.push([secondOk, 'ok']);

    rows = rows.concat(r.shuffle(extra));
    var choices = ['OK', 'SyntaxError', 'NameError', 'TypeError', 'ZeroDivisionError'];

    return {
      type: 'table',
      prompt: '<p>Some lines of this program would produce an error when run. For each line, choose what happens ' +
              '(judge each line on its own, as if Python reached it; <code>name</code> and <code>count</code> are ' +
              'defined by the first two lines).</p>',
      head: ['Line', 'Code', 'What happens?'],
      rows: rows.map(function (row, i) {
        return [i + 1, '<code>' + U.esc(row[0]) + '</code>',
                { kind: 'select', choices: choices, ans: row[1] === 'ok' ? 'OK' : row[1] }];
      }),
      leftCols: [1],
      explain: rows.filter(function (row) { return row[1] !== 'ok'; }).map(function (row) {
        return '<code>' + U.esc(row[0]) + '</code>: ' + row[1] + ' — ' + ERROR_REASONS[row[1]] + '.';
      }).join('<br>')
    };
  });


  /* ==========================================================================
     7. Section "writing": writing functions and programs (exam question 3)

     Code problems provide:
       starter  – the text initially placed in the editor
       solution – a reference solution (used by "Show answer")
       tests    – a list of checks run against the student's code in the browser:
                    check     a Python expression to evaluate after the code runs
                    expect    its expected value (as printed by repr)
                    expectOut the exact text the program must print
                    stdin     text fed to input()
     ========================================================================== */
  var write = [];

  // Exam question 3: a program that prints all multiples of a divisor in a range,
  // using a user-defined Boolean function.
  write.push(function (r) {
    var divisor = r.pick([3, 4, 5, 6, 7]);
    var low = r.int(10, 60);
    var high = low + r.int(18, 30);
    var fn = r.pick(['isDivisible', 'isMultiple', 'divides']);

    var multiples = [];
    for (var i = low; i <= high; i++) {
      if (i % divisor === 0) multiples.push(i);
    }

    var tests = [
      { label: 'program prints the right numbers', expectOut: multiples.join('\n') },
      { label: fn + '(10, 5) is True', check: fn + '(10, 5)', expect: 'True' },
      { label: fn + '(11, 5) is False', check: fn + '(11, 5)', expect: 'False' },
      { label: fn + '(' + (divisor * 7) + ', ' + divisor + ') is True',
        check: fn + '(' + divisor * 7 + ', ' + divisor + ')', expect: 'True' },
      { label: fn + '(' + (divisor * 7 + 1) + ', ' + divisor + ') is False',
        check: fn + '(' + (divisor * 7 + 1) + ', ' + divisor + ')', expect: 'False' }
    ];

    return {
      type: 'code',
      prompt: '<p>Write a complete Python program that uses a user-defined function to meet these requirements:</p>' +
              '<ol type="i">' +
              '<li>The program outputs (one per line) all the numbers between, and including, <b>' + low +
              '</b> and <b>' + high + '</b> that are divisible by <b>' + divisor + '</b>.</li>' +
              '<li>The function is called <code>' + fn + '</code>.</li>' +
              '<li><code>' + fn + '</code> takes two parameters: a value and a divisor.</li>' +
              '<li><code>' + fn + '</code> <b>returns</b> a Boolean based on whether the value is divisible by ' +
              'the divisor.</li></ol>',
      starter: 'def ' + fn + '(value, divisor):\n    # return True or False\n    pass\n\n# main program\n',
      tests: tests,
      solution: 'def ' + fn + '(value, divisor):\n    return value % divisor == 0\n\nnumber = ' + low +
                '\nwhile (number <= ' + high + '):\n    if (' + fn + '(number, ' + divisor + ')):\n' +
                '        print(number)\n    number += 1\n'
    };
  });

  // Small functions to write. For each: the signature `n`, a description `d`,
  // test cases `t` as [arguments, expected result] (a list of arguments means
  // several parameters; string arguments are given pre-quoted), and a
  // reference solution `sol`.
  var FUNCTION_TASKS = [
    {
      n: 'factorial(x)', d: 'returns x! (x × (x−1) × … × 1; 0! is 1)',
      t: [[0, 1], [1, 1], [5, 120], [7, 5040]],
      sol: 'def factorial(x):\n    result = 1\n    while x > 1:\n        result *= x\n        x -= 1\n    return result\n'
    },
    {
      n: 'isprime(x)', d: 'returns True if x is prime and False otherwise (assume x ≥ 2)',
      t: [[2, true], [9, false], [13, true], [25, false], [29, true]],
      sol: 'def isprime(x):\n    i = 2\n    while i < x:\n        if x % i == 0:\n            return False\n' +
           '        i += 1\n    return True\n'
    },
    {
      n: 'countvowels(a)', d: 'returns the number of vowels (a, e, i, o, u — lower case) in the string a',
      t: [['"hello"', 2], ['"rhythm"', 0], ['"education"', 5], ['"queue"', 4]],
      sol: 'def countvowels(a):\n    count = 0\n    for letter in a:\n        if letter in "aeiou":\n' +
           '            count += 1\n    return count\n'
    },
    {
      n: 'celstofahr(x)', d: 'converts a temperature in Celsius to Fahrenheit (F = C × 9/5 + 32)',
      t: [[0, 32], [100, 212], [37, 98.6], [-40, -40]],
      sol: 'def celstofahr(x):\n    return x * 9 / 5 + 32\n'
    },
    {
      n: 'max2(x, y)', d: 'returns the larger of x and y (do not use the built-in max)',
      t: [[[3, 9], 9], [[9, 3], 9], [[-2, -7], -2], [[5, 5], 5]],
      sol: 'def max2(x, y):\n    if x > y:\n        return x\n    else:\n        return y\n'
    },
    {
      n: 'average3(x, y, z)', d: 'returns the average of its three arguments',
      t: [[[3, 6, 9], 6], [[1, 2, 6], 3], [[10, 10, 10], 10]],
      sol: 'def average3(x, y, z):\n    return (x + y + z) / 3\n'
    },
    {
      n: 'iseven(x)', d: 'returns True if x is even, False otherwise',
      t: [[4, true], [7, false], [0, true], [-3, false]],
      sol: 'def iseven(x):\n    return x % 2 == 0\n'
    },
    {
      n: 'isin(a, b)', d: 'returns True if the string a appears somewhere inside the string b',
      t: [[['"cat"', '"concatenate"'], true], [['"dog"', '"concatenate"'], false], [['"a"', '"abc"'], true]],
      sol: 'def isin(a, b):\n    return a in b\n'
    }
  ];

  write.push(function (r) {
    var task = r.pick(FUNCTION_TASKS);
    var name = task.n.split('(')[0];

    // Python source text for a JavaScript value.
    function literal(value) {
      return typeof value === 'boolean' ? pyBool(value) : String(value);
    }

    var tests = task.t.map(function (testCase) {
      var args = Array.isArray(testCase[0]) ? testCase[0].join(', ') : literal(testCase[0]);
      return {
        label: name + '(' + args + ') → ' + literal(testCase[1]),
        check: name + '(' + args + ')',
        expect: literal(testCase[1])
      };
    });

    return {
      type: 'code',
      prompt: '<p>Write a function <code>' + task.n + '</code> that ' + task.d + '.</p>',
      starter: 'def ' + task.n + ':\n    # your code here\n    pass\n',
      tests: tests,
      solution: task.sol
    };
  });

  // Functions that print instead of returning, plus a program that reads input.
  write.push(function (r) {
    var kind = r.pick(['stars', 'table', 'quot']);

    // printstarsquare(x): an x-by-x square of asterisks.
    if (kind === 'stars') {
      var starTests = [2, 3, 5].map(function (n) {
        var row = new Array(n + 1).join('*');                 // n stars
        return {
          label: 'printstarsquare(' + n + ')',
          check: 'printstarsquare(' + n + ')',
          expect: 'None',                                     // it prints, it does not return
          expectOut: new Array(n + 1).join(row + '\n')        // n rows
        };
      });
      return {
        type: 'code',
        prompt: '<p>Write a function <code>printstarsquare(x)</code> that <b>prints</b> a square of size <i>x</i> ' +
                'made of <code>*</code> characters (x lines, each with x stars). It does not need to return anything.</p>',
        starter: 'def printstarsquare(x):\n    pass\n',
        tests: starTests,
        solution: 'def printstarsquare(x):\n    for row in range(x):\n        print("*" * x)\n'
      };
    }

    // printmulttable(x): 1*x up to 10*x.
    if (kind === 'table') {
      var tableTests = [3, 7].map(function (n) {
        var products = [];
        for (var i = 1; i <= 10; i++) products.push(i * n);
        return {
          label: 'printmulttable(' + n + ')',
          check: 'printmulttable(' + n + ')',
          expect: 'None',
          expectOut: products.join('\n')
        };
      });
      return {
        type: 'code',
        prompt: '<p>Write a function <code>printmulttable(x)</code> that prints the values 1×x through 10×x, one ' +
                'per line (just the products, e.g. for x = 2: 2, 4, 6 … 20).</p>',
        starter: 'def printmulttable(x):\n    pass\n',
        tests: tableTests,
        solution: 'def printmulttable(x):\n    for i in range(1, 11):\n        print(i * x)\n'
      };
    }

    // A whole program: read two numbers, print the quotient and remainder.
    var inputs = [[17, 3], [20, 4], [9, 2], [100, 7]];
    return {
      type: 'code',
      prompt: '<p>Write a program that asks the user for two numbers (with <code>input()</code>) and prints the ' +
              'quotient and remainder when the first is divided by the second, in exactly this form ' +
              '(example for 17 and 3):</p><pre class="pr-code">The quotient of 17 divided by 3 is 5 with a remainder of 2</pre>',
      starter: 'a = int(input("Enter a number: "))\n',
      tests: inputs.map(function (pair) {
        return {
          label: 'user types ' + pair[0] + ' and ' + pair[1],
          stdin: pair[0] + '\n' + pair[1],
          expectOut: 'The quotient of ' + pair[0] + ' divided by ' + pair[1] + ' is ' +
                     Math.floor(pair[0] / pair[1]) + ' with a remainder of ' + (pair[0] % pair[1])
        };
      }),
      solution: 'a = int(input("Enter a number: "))\nb = int(input("Enter another number: "))\n' +
                'print(f"The quotient of {a} divided by {b} is {a // b} with a remainder of {a % b}")\n'
    };
  });


  /* ==========================================================================
     8. Registration
     ========================================================================== */
  P.register('programming', {
    sections: [
      {
        id: 'concepts',
        title: 'Programs, languages and constructs',
        intro: '<p>Vocabulary: machine language, compilers vs. interpreters, paradigms, and the three control constructs.</p>',
        problems: concepts
      },
      {
        id: 'operators',
        title: 'Operators, expressions and data types',
        intro: '<p>Arithmetic, relational and assignment operators, and what Python does with strings and numbers.</p>',
        problems: ops
      },
      { id: 'identifiers', title: 'Identifiers, reserved words and comments', problems: ids },
      {
        id: 'tracing',
        title: 'Tracing programs and program flow',
        intro: '<p>Predict output and the <b>order in which lines execute</b>. Remember that function definitions only run when called.</p>',
        problems: trace
      },
      { id: 'errors', title: 'Finding errors', problems: errors },
      {
        id: 'writing',
        title: 'Writing functions and programs',
        intro: '<p>Write real Python. <b>Run tests</b> executes your code in your browser (the first run downloads the Python runtime).</p>',
        problems: write
      }
    ]
  });
})();
