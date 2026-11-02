/* ==========================================================================
   Practice bank: Lesson 01 – Introduction to Algorithms
   (covers exam 1, questions 1, 4 and 5)

   Every problem is a generator: a function that receives a seeded random
   number generator `r` and returns one question object. The engine
   (engine.js) turns that object into an interactive card. Pressing
   "New variant" simply calls the generator again with a fresh seed.

   Useful `r` methods (see engine.js): r.int(lo, hi), r.pick(list),
   r.sample(list, n), r.shuffle(list), r.chance(p).

   The file is organised as:
     1. Small helpers shared by the generators
     2. Flowchart drawing (SVG)
     3. Section "basics"      – problem statements, control flow, repetition
     4. Section "flowpseudo"  – tracing flowcharts and pseudocode
     5. Section "runtime"     – calculating and comparing runtimes
     6. Registration of the bank
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Practice;
  var U = P.util;
  var code = U.code;       // wraps text in a <pre> code block
  var fmtDur = U.fmtDur;   // 125 -> "2 min 5 sec"


  /* ------------------------------------------------------------------------
     1. Helpers
     ------------------------------------------------------------------------ */

  // An answer field that expects a whole number (graded exactly).
  function num(answer, width) {
    return { kind: 'num', ans: answer, tol: 0, w: width || 'sm' };
  }

  // An answer field that expects a duration such as "2 min 5 sec" (or plain seconds).
  function dur(seconds) {
    return { kind: 'dur', ans: seconds, w: 14, ph: 'e.g. 2 min 5 sec' };
  }

  function isPrime(n) {
    if (n < 2) return false;
    for (var i = 2; i * i <= n; i++) {
      if (n % i === 0) return false;
    }
    return true;
  }


  /* ------------------------------------------------------------------------
     2. Flowchart drawing
     ------------------------------------------------------------------------ */

  // The four standard flowchart blocks, each drawn inside a 100 x 40 box.
  var SHAPES = {
    terminal: '<ellipse class="gate" cx="50" cy="20" rx="44" ry="16"/>' +
              '<text x="50" y="24" text-anchor="middle" font-size="12">Start/Stop</text>',
    process:  '<rect class="gate" x="8" y="6" width="84" height="28"/>' +
              '<text x="50" y="24" text-anchor="middle" font-size="12">Process</text>',
    io:       '<path class="gate" d="M24,6 H98 L76,34 H2 Z"/>' +
              '<text x="50" y="24" text-anchor="middle" font-size="11">Input/Output</text>',
    decision: '<path class="gate" d="M50,2 L98,20 L50,38 L2,20 Z"/>' +
              '<text x="50" y="24" text-anchor="middle" font-size="11">Yes/No?</text>'
  };

  function shapeSVG(kind) {
    return '<svg class="pr-svg" viewBox="0 0 100 40" width="100" height="40" role="img" aria-label="flowchart block">' +
           SHAPES[kind] + '</svg>';
  }

  // Draws a complete do-while flowchart:
  //     Start -> v <- start -> Display v -> v <- v + step -> (v < limit ?) -> Stop
  // with a "Yes" arrow looping back up to the Display block.
  function loopChartSVG(start, step, limit, varName) {
    var cx = 130;   // x coordinate of the centre line every block hangs from

    // Centered text label; `y` is the vertical centre of the block it sits in.
    function label(text, y) {
      return '<text x="' + cx + '" y="' + (y + 5) + '" text-anchor="middle" font-size="13">' + text + '</text>';
    }
    // A straight downward arrow from y1 to y2 along the centre line.
    function arrowDown(y1, y2) {
      return '<path class="wire" marker-end="url(#ah)" d="M' + cx + ',' + y1 + ' V' + y2 + '"/>';
    }

    var svg = '<svg class="pr-svg" viewBox="0 0 330 420" width="300" role="img" aria-label="flowchart of a loop">' +
      // arrow-head used by every wire
      '<defs><marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">' +
      '<path d="M0,0 L8,4 L0,8 Z" fill="currentColor"/></marker></defs>';

    // Start oval
    svg += '<ellipse class="gate" cx="' + cx + '" cy="24" rx="44" ry="16"/>' + label('Start', 24);
    svg += arrowDown(40, 68);

    // Process: v <- start
    svg += '<rect class="gate" x="' + (cx - 55) + '" y="68" width="110" height="30"/>' +
           label(varName + ' ← ' + start, 83);
    svg += arrowDown(98, 126);

    // Output parallelogram: Display v
    svg += '<path class="gate" d="M' + (cx - 40) + ',126 H' + (cx + 62) + ' L' + (cx + 40) + ',156 H' + (cx - 62) + ' Z"/>' +
           label('Display ' + varName, 141);
    svg += arrowDown(156, 184);

    // Process: v <- v + step
    svg += '<rect class="gate" x="' + (cx - 60) + '" y="184" width="120" height="30"/>' +
           label(varName + ' ← ' + varName + ' + ' + step, 199);
    svg += arrowDown(214, 238);

    // Decision diamond: v < limit ?
    svg += '<path class="gate" d="M' + cx + ',238 L' + (cx + 62) + ',274 L' + cx + ',310 L' + (cx - 62) + ',274 Z"/>' +
           label(varName + ' < ' + limit + ' ?', 274);

    // "Yes" arrow: out of the diamond, up the right side, back into Display
    svg += '<path class="wire" marker-end="url(#ah)" d="M' + (cx + 62) + ',274 H300 V141 H' + (cx + 62) + '"/>' +
           '<text x="' + (cx + 70) + '" y="268" font-size="12">Yes</text>';

    // "No" arrow: straight down to Stop
    svg += '<path class="wire" marker-end="url(#ah)" d="M' + cx + ',310 V352"/>' +
           '<text x="' + (cx + 8) + '" y="332" font-size="12">No</text>';

    // Stop oval
    svg += '<ellipse class="gate" cx="' + cx + '" cy="368" rx="44" ry="16"/>' + label('Stop', 368) + '</svg>';
    return svg;
  }


  /* ==========================================================================
     3. Section "basics": algorithms, problem statements, control flow
     ========================================================================== */
  var basics = [];

  // Match each flowchart block (drawn as an SVG) to its name.
  basics.push(function (r) {
    var kinds = ['terminal', 'process', 'io', 'decision'];
    var names = {
      terminal: 'Terminal (start/stop)',
      process: 'Process',
      io: 'Input/Output',
      decision: 'Decision'
    };

    return {
      type: 'match',
      prompt: '<p>Name each flowchart block.</p>',
      pairs: r.shuffle(kinds).map(function (kind) { return [shapeSVG(kind), names[kind]]; }),
      choices: ['Terminal (start/stop)', 'Process', 'Input/Output', 'Decision'],
      explain: 'Oval = start/stop, rectangle = process (an action), parallelogram = input/output, ' +
               'diamond = decision (a yes/no question with two arrows out).'
    };
  });

  // Each scenario is [what we are trying to do, its input, its output].
  var SCENARIOS = [
    ['add three numbers', 'the three numbers', 'their sum'],
    ['determine the income tax owed this year', 'your income', 'the amount of tax owed'],
    ['find the largest value in a list', 'the list of values', 'the largest value'],
    ['convert a temperature from Celsius to Fahrenheit', 'the Celsius temperature', 'the Fahrenheit temperature'],
    ['decide whether a number is prime', 'the number', 'yes or no (prime or not)'],
    ['bake an apple pie', 'the ingredients', 'an apple pie'],
    ['compute the average of a class\'s exam scores', 'all of the exam scores', 'the average score']
  ];

  // Given a problem, pick out its input (or its output) from four candidates.
  basics.push(function (r) {
    var scenario = r.pick(SCENARIOS);
    var askForOutput = r.chance(0.5);
    var others = r.sample(SCENARIOS.filter(function (x) { return x !== scenario; }), 3);

    // Index 1 holds the input, index 2 holds the output.
    var which = askForOutput ? 2 : 1;
    var options = [scenario[which]].concat(others.map(function (o) { return o[which]; }));

    return {
      type: 'mc',
      prompt: '<p>A <b>problem statement</b> describes the inputs (starting conditions) and the valid outputs ' +
              '(solutions). For the problem "<i>' + scenario[0] + '</i>", which is the ' +
              (askForOutput ? '<b>output</b>' : '<b>input</b>') + '?</p>',
      options: options,
      answer: 0,                       // the correct option is first; the engine shuffles the display order
      explain: 'Inputs are what the algorithm starts with; outputs are the valid result it must produce.'
    };
  });

  // A pool of short conceptual multiple-choice questions. `a` is the index of
  // the correct option in `o`; `e` is the (optional) explanation.
  var CONCEPT_QUESTIONS = [
    {
      q: 'An algorithm produces a blueberry pie, but the problem statement asked for an apple pie. The algorithm is…',
      o: ['a wrong solution', 'correct but inefficient', 'correct and efficient', 'a flowchart'], a: 0,
      e: 'An algorithm is correct if it produces the valid output defined in the problem statement.'
    },
    {
      q: 'An algorithm tells you to throw away the ingredients and buy an apple pie from the store. It is…',
      o: ['technically correct, though not efficient', 'wrong, because it does not use the ingredients',
          'wrong, because it has no loop', 'not an algorithm'], a: 0,
      e: 'It produces the required output (an apple pie), so it is correct — just not efficient.'
    },
    {
      q: '<b>Control flow</b> is…',
      o: ['the order in which the instructions of an algorithm are executed', 'the speed of the computer',
          'the number of steps in an algorithm', 'a type of flowchart block'], a: 0
    },
    {
      q: 'Which statement about the order of steps is true?',
      o: ['Sometimes order matters a lot (shower before getting dressed) and sometimes it does not.',
          'The order of steps never matters.', 'The order of steps always matters.', 'Only loops care about order.'], a: 0
    },
    {
      q: 'A <b>decision block</b> (diamond) in a flowchart…',
      o: ['asks a yes/no question and has two arrows leading out', 'performs a calculation',
          'marks the start of the algorithm', 'displays output'], a: 0
    },
    {
      q: 'Which statement about "the best algorithm" is most accurate?',
      o: ['"Best" is subjective; it can mean fastest, fewest steps, least mess, etc.',
          'The shortest algorithm is always the best.', 'The one that uses loops is the best.',
          'The one with the most steps is the best.'], a: 0
    },
    {
      q: 'Pseudocode is…',
      o: ['a mix of English and programming-language ideas used to describe an algorithm',
          'machine language written in hex', 'a type of flowchart', 'a program that has been compiled'], a: 0
    },
    {
      q: 'In pseudocode in this course, the left arrow (←) means…',
      o: ['assign the value on the right to the variable on the left', 'compare two values',
          'repeat the loop', 'print the value'], a: 0
    }
  ];

  basics.push(function (r) {
    var c = r.pick(CONCEPT_QUESTIONS);
    return { type: 'mc', prompt: '<p>' + c.q + '</p>', options: c.o, answer: c.a, explain: c.e };
  });

  // Match descriptions to the four kinds of repetition.
  basics.push(function (r) {
    var descriptions = [
      ['Repeats <b>while</b> a condition is true (condition checked before each pass)', 'while'],
      ['Repeats <b>until</b> a condition becomes true', 'repeat-until'],
      ['Always runs at least once, then repeats while a condition is true', 'do-while'],
      ['Repeats a fixed, known number of times', 'for / repeat-n'],
      ['Stirring sugar into coffee until it dissolves — you cannot know how many stirs ahead of time', 'repeat-until'],
      ['Printing a message exactly 10 times', 'for / repeat-n']
    ];

    return {
      type: 'match',
      prompt: '<p>Match each description to the kind of repetition.</p>',
      pairs: r.sample(descriptions, 4),
      choices: ['while', 'repeat-until', 'do-while', 'for / repeat-n'],
      explain: 'Each pass through the body is an <b>iteration</b>; a condition controls when the repetition ends.'
    };
  });

  // Everyday multi-step routines used by the step-numbering problem below.
  var ROUTINES = [
    ['get out of bed', 'brush teeth', 'take shower', 'get dressed', 'eat breakfast', 'grab backpack', 'go to class'],
    ['preheat oven', 'make the dough', 'make the filling', 'combine them', 'bake', 'let it cool', 'serve'],
    ['collect laundry', 'sort by color', 'wash', 'dry', 'fold', 'put away'],
    ['open the app', 'sign in', 'choose a movie', 'start playback', 'enjoy', 'log out']
  ];

  // Exam-style step numbering: one step is expanded into several sub-steps,
  // and every later step is renumbered.
  basics.push(function (r) {
    var steps = r.pick(ROUTINES);
    var total = steps.length;
    var replaced = r.int(2, total - 2);   // 1-based number of the step that gets expanded
    var subSteps = r.int(3, 5);

    var mainList = steps.map(function (text, i) { return (i + 1) + '. ' + text; }).join('; ');
    var nextStep = steps[replaced];       // the step that originally followed (steps is 0-based)

    return {
      type: 'blanks',
      prompt: '<p>The main algorithm has ' + total + ' numbered steps: ' + mainList + '.</p>' +
              '<p>Step <b>' + replaced + '</b> ("' + steps[replaced - 1] + '") is replaced by its own algorithm ' +
              'with <b>' + subSteps + '</b> sub-steps. Number all the steps in sequence ' +
              '(the sub-steps are numbered in the main list, as in the lesson).</p>',
      template: '<p>First sub-step is numbered [[a]]; last sub-step is numbered [[b]]</p>' +
                '<p>"' + nextStep + '" (originally step ' + (replaced + 1) + ') becomes step [[c]]</p>' +
                '<p>The final step of the whole algorithm is numbered [[d]]</p>',
      blanks: {
        a: num(replaced),
        b: num(replaced + subSteps - 1),
        c: num(replaced + subSteps),
        d: num(total - 1 + subSteps)
      },
      explain: 'The sub-steps take the numbers ' + replaced + ' … ' + (replaced + subSteps - 1) +
               ', pushing every later step down by ' + (subSteps - 1) + '. Total steps = ' + total +
               ' − 1 + ' + subSteps + ' = ' + (total - 1 + subSteps) + '.'
    };
  });


  /* ==========================================================================
     4. Section "flowpseudo": tracing flowcharts and pseudocode
     ========================================================================== */
  var flow = [];

  // Trace the do-while flowchart drawn by loopChartSVG().
  flow.push(function (r) {
    var start = r.int(1, 4);
    var step = r.int(2, 4);
    var limit = start + step * r.int(2, 4) + r.int(0, 2);
    var varName = r.pick(['n', 'x', 'count']);

    // do-while: the body (display, then add) always runs once before the test.
    var displayed = [];
    var value = start;
    displayed.push(value);
    value += step;
    while (value < limit) {
      displayed.push(value);
      value += step;
    }

    return {
      type: 'blanks',
      prompt: '<p>Follow the flowchart.</p>' + loopChartSVG(start, step, limit, varName),
      template: '<p>Values displayed, in order (space-separated): [[o]]</p>' +
                '<p>How many times is the Display block executed? [[n]]</p>' +
                '<p>Final value of <code>' + varName + '</code> when the algorithm stops: [[f]]</p>' +
                '<p>What kind of repetition is this? [[t]]</p>',
      blanks: {
        o: { kind: 'list', ans: displayed.join(' '), w: 14 },
        n: num(displayed.length),
        f: num(value),
        t: {
          kind: 'select',
          choices: ['while (checks first)', 'do-while (runs at least once)', 'for (fixed count)'],
          ans: 'do-while (runs at least once)'
        }
      },
      explain: 'The body runs once <i>before</i> the decision is ever tested, so it executes at least once (do-while). ' +
               'It keeps repeating while ' + varName + ' &lt; ' + limit + '; it stops when ' + varName +
               ' reaches ' + value + '.'
    };
  });

  // Trace a repeat-until loop written in pseudocode.
  flow.push(function (r) {
    var start = r.int(1, 5);
    var step = r.int(2, 5);
    var limit = start + step * r.int(2, 4) + r.int(1, 3);

    // repeat-until: body first, then stop once `n >= limit`.
    var displayed = [];
    var value = start;
    do {
      displayed.push(value);
      value += step;
    } while (value < limit);

    var source = [
      'n ← ' + start,
      'repeat',
      '    display n',
      '    n ← n + ' + step,
      'until n >= ' + limit,
      'display "done"'
    ];

    return {
      type: 'blanks',
      prompt: '<p>Trace this pseudocode.</p>' +
              code(source.map(function (line, i) { return (i + 1) + ': ' + line; }).join('\n')),
      template: '<p>Values displayed by line 3 (space-separated): [[o]]</p>' +
                '<p>Number of iterations of the loop: [[i]]</p>' +
                '<p>Value of <code>n</code> when line 6 runs: [[f]]</p>',
      blanks: {
        o: { kind: 'list', ans: displayed.join(' '), w: 14 },
        i: num(displayed.length),
        f: num(value)
      },
      explain: 'A repeat-until loop always runs its body once, then stops when the <i>until</i> condition ' +
               'becomes true (<code>n >= ' + limit + '</code>).'
    };
  });

  // The "display the primes" pseudocode from the lesson, with different numbers.
  flow.push(function (r) {
    var limit = r.pick([10, 12, 15, 20, 25, 30]);
    var start = r.pick([1, 2]);

    var primes = [];
    for (var n = start; n < limit; n++) {
      if (isPrime(n)) primes.push(n);
    }

    var source = [
      'n ← ' + start,
      'repeat',
      '    if n is prime',
      '    then',
      '        display the value of n',
      '    end',
      '    increase n by 1',
      'until n >= ' + limit,
      'stop'
    ];
    var checks = limit - start;   // "n is prime" is tested once per value of n

    return {
      type: 'blanks',
      prompt: '<p>Trace this pseudocode (taken from the lesson, with different numbers).</p>' +
              code(source.map(function (line, i) { return (i + 1) + '. ' + line; }).join('\n')),
      template: '<p>Numbers displayed: [[o]]</p>' +
                '<p>How many times is "<code>n is prime</code>" evaluated? [[e]]</p>',
      blanks: {
        o: { kind: 'list', ans: primes.join(' '), w: 18 },
        e: num(checks)
      },
      explain: 'The check is made for every n from ' + start + ' up to ' + (limit - 1) + ', which is ' + checks +
               ' times. Larger limits mean more repetitions — a longer runtime.'
    };
  });

  // Put shuffled pseudocode lines into a correct order. The engine keeps the
  // indentation in each line, so it acts as a hint about the loop structure.
  flow.push(function (r) {
    var algorithms = [
      {
        name: 'stirring sugar into coffee',
        lines: ['put sugar into coffee', 'repeat', '    stir sugar into coffee', 'until sugar is dissolved', 'stop']
      },
      {
        name: 'displaying every even number below 10',
        lines: ['n ← 0', 'repeat', '    display n', '    n ← n + 2', 'until n >= 10', 'stop']
      },
      {
        name: 'finding the total of five numbers',
        lines: ['total ← 0', 'count ← 0', 'repeat', '    ask for a number', '    total ← total + number',
                '    count ← count + 1', 'until count = 5', 'display total']
      }
    ];
    var chosen = r.pick(algorithms);

    return {
      type: 'order',
      prompt: '<p>Arrange these pseudocode lines into a correct algorithm for <b>' + chosen.name + '</b>. ' +
              '(Indentation is shown; line numbers are not part of the answer.)</p>',
      items: chosen.lines,
      explain: 'Set things up first, then repeat the body until the exit condition holds, then finish.'
    };
  });


  /* ==========================================================================
     5. Section "runtime": efficiency and runtime
     ========================================================================== */
  var runtime = [];

  // Modelled on exam question 1 ("the candy bowl"): compare two algorithms by
  // adding up placing time, eating time and multiplication time.
  runtime.push(function (r) {
    var treat = r.pick([['KitKat bars', 100], ['cookies', 80], ['mini donuts', 120], ['fun-size Snickers', 90]]);
    var treatName = treat[0];
    var calories = treat[1];

    var capacity = r.pick([24, 30, 36, 40]);       // items the bowl holds
    var eatEvery = r.pick([6, 8, 10]);             // an item is eaten after every k items placed
    var placeSecs = r.pick([1, 2]);                // seconds to place one item
    var eatSecs = r.pick([20, 25, 30, 45]);        // seconds to eat one item
    var multiplySecs = r.pick([3, 4, 5, 6]);       // seconds for any multiplication
    var half = capacity / 2;
    var who = r.pick(['Thackery', 'Maya', 'Devon', 'Priya']);

    // Algorithm 1: fill the whole bowl, then one multiplication.
    var eaten1 = Math.floor(capacity / eatEvery);
    var time1 = capacity * placeSecs + eaten1 * eatSecs + multiplySecs;
    var calories1 = eaten1 * calories;

    // Algorithm 2: fill half the bowl, then two multiplications (x2, then x calories).
    var eaten2 = Math.floor(half / eatEvery);
    var time2 = half * placeSecs + eaten2 * eatSecs + 2 * multiplySecs;
    var calories2 = eaten2 * calories;

    return {
      type: 'blanks',
      prompt: '<p>' + who + ' is preparing for Halloween and wondering how many calories are in a bowl of ' +
              treatName + '. Two algorithms:</p>' +
              '<p><b>Algorithm 1:</b> Place each item in the bowl one at a time, counting while placing. ' +
              'When the bowl is full, multiply the count by the calories in one item.</p>' +
              '<p><b>Algorithm 2:</b> Place items until the bowl is exactly half full. Multiply the count by 2, ' +
              'then multiply that by the calories in one item.</p>' +
              '<ul>' +
              '<li>Placing one item in the bowl takes ' + placeSecs + ' second' + (placeSecs > 1 ? 's' : '') + '.</li>' +
              '<li>After every ' + eatEvery + ' items placed, ' + who + ' eats 1 item (it does <b>not</b> come out ' +
              'of the bowl being filled) and eating takes ' + eatSecs + ' seconds.</li>' +
              '<li>Any multiplication takes ' + multiplySecs + ' seconds.</li>' +
              '<li>The bowl holds ' + capacity + ' items; one item is ' + calories + ' calories.</li>' +
              '</ul>' +
              '<p>Give times as hours/minutes/seconds, e.g. <code>2 min 5 sec</code> (or just total seconds).</p>',
      template: '<p>a. Runtime of Algorithm 1: [[a]]</p>' +
                '<p>b. Calories eaten during Algorithm 1: [[b]]</p>' +
                '<p>c. Runtime of Algorithm 2: [[c]]</p>' +
                '<p>d. Calories eaten during Algorithm 2: [[d]]</p>',
      blanks: { a: dur(time1), b: num(calories1, 6), c: dur(time2), d: num(calories2, 6) },
      explain: '<b>Algorithm 1:</b> ' + capacity + ' × ' + placeSecs + ' s placing + ⌊' + capacity + '/' + eatEvery +
               '⌋ = ' + eaten1 + ' snacks × ' + eatSecs + ' s + 1 multiplication × ' + multiplySecs + ' s = ' +
               time1 + ' s = <b>' + fmtDur(time1) + '</b>; calories eaten = ' + eaten1 + ' × ' + calories + ' = ' +
               calories1 + '.<br>' +
               '<b>Algorithm 2:</b> ' + half + ' × ' + placeSecs + ' + ⌊' + half + '/' + eatEvery + '⌋ × ' + eatSecs +
               ' + 2 × ' + multiplySecs + ' = ' + time2 + ' s = <b>' + fmtDur(time2) + '</b>; calories eaten = ' +
               eaten2 + ' × ' + calories + ' = ' + calories2 + '.'
    };
  });

  // Tile-laying from the lesson: tiling a whole floor grows like n^2, tiling one wall like n.
  runtime.push(function (r) {
    var breakEven = r.int(2, 6);                 // wall length where both algorithms take equally long
    var tileSecs = r.pick([5, 10, 15, 20]);

    // Choose the calculation cost so the two runtimes cross exactly at `breakEven`:
    //   w^2 * t  =  w * t + c   =>   c = t * (w^2 - w)
    var calcSecs = tileSecs * (breakEven * breakEven - breakEven);

    var wall = breakEven + r.int(4, 14);         // the room asked about
    var time1 = wall * wall * tileSecs;          // Algorithm 1: every tile
    var time3 = wall * tileSecs + calcSecs;      // Algorithm 3: one wall + the calculation

    return {
      type: 'blanks',
      prompt: '<p>Two algorithms tile a square room. <b>Algorithm 1</b> lays tiles over the <i>entire</i> floor. ' +
              '<b>Algorithm 3</b> lays tiles along <i>one wall</i> only, then multiplies the count by itself ' +
              '(one calculation). Each tile takes <b>' + tileSecs + ' s</b> to lay and the calculation takes <b>' +
              calcSecs + ' s</b>. Tiles are 1 ft × 1 ft.</p>',
      template: '<p>For a <b>' + wall + ' ft × ' + wall + ' ft</b> room: Algorithm 1 takes [[a]] and ' +
                'Algorithm 3 takes [[b]]</p>' +
                '<p>The two algorithms take the same time when the wall length is [[w]] ft.</p>' +
                '<p>For a room smaller than that, the faster algorithm is: [[f]]</p>',
      blanks: {
        a: dur(time1),
        b: dur(time3),
        w: num(breakEven),
        f: { kind: 'select', choices: ['Algorithm 1', 'Algorithm 3'], ans: 'Algorithm 1' }
      },
      explain: 'Algorithm 1: ' + wall + '² × ' + tileSecs + ' = ' + time1 + ' s (' + fmtDur(time1) + '). ' +
               'Algorithm 3: ' + wall + ' × ' + tileSecs + ' + ' + calcSecs + ' = ' + time3 + ' s (' + fmtDur(time3) + '). ' +
               'Setting <i>w</i>² · ' + tileSecs + ' = <i>w</i> · ' + tileSecs + ' + ' + calcSecs + ' gives <i>w</i> = ' +
               breakEven + '. Below that size the fixed cost of the calculation outweighs the savings, so laying ' +
               'every tile is faster.'
    };
  });

  // Convert a number of seconds to hours / minutes / seconds.
  runtime.push(function (r) {
    var hours = r.int(0, 3);
    var minutes = r.int(1, 59);
    var seconds = r.int(1, 59);
    var total = hours * 3600 + minutes * 60 + seconds;

    return {
      type: 'blanks',
      prompt: '<p>An algorithm takes <b>' + total.toLocaleString() + ' seconds</b>. ' +
              'Express this in hours, minutes and seconds.</p>',
      template: '<p>[[h]] hr  [[m]] min  [[s]] sec</p>',
      blanks: { h: num(hours), m: num(minutes), s: num(seconds) },
      explain: total + ' ÷ 3600 = ' + hours + ' hr (remainder ' + (total % 3600) + '); ' +
               (total % 3600) + ' ÷ 60 = ' + minutes + ' min (remainder ' + seconds + ' s).'
    };
  });

  // Compare a quadratic algorithm (A) with one that has a fixed cost (B) at one input size.
  runtime.push(function (r) {
    var unitSecs = r.pick([2, 3, 4, 5]);
    var fixedSecs = r.int(3, 12) * unitSecs * 2;
    var n = r.int(1, 14);

    var timeA = n * n * unitSecs;
    var timeB = n * unitSecs + fixedSecs;

    return {
      type: 'mc',
      prompt: '<p>Algorithm A takes <i>n</i><sup>2</sup> × ' + unitSecs + ' seconds for an input of size <i>n</i>. ' +
              'Algorithm B takes <i>n</i> × ' + unitSecs + ' + ' + fixedSecs + ' seconds. ' +
              'Which is faster for <i>n</i> = ' + n + '?</p>',
      options: ['Algorithm A', 'Algorithm B', 'They take the same time'],
      answer: timeA < timeB ? 0 : timeA > timeB ? 1 : 2,
      noShuffle: true,                 // options stay in this order because the third one is a "tie"
      explain: 'A = ' + n + '² × ' + unitSecs + ' = ' + timeA + ' s; B = ' + n + ' × ' + unitSecs + ' + ' + fixedSecs +
               ' = ' + timeB + ' s. An algorithm whose time grows with <i>n</i>² loses as the input gets large, ' +
               'but its lack of a fixed cost can win for small inputs.'
    };
  });


  /* ==========================================================================
     6. Registration
     ========================================================================== */
  P.register('algorithms', {
    sections: [
      { id: 'basics', title: 'Algorithms, problem statements and control flow', problems: basics },
      { id: 'flowpseudo', title: 'Flowcharts, repetition and pseudocode', problems: flow },
      {
        id: 'runtime',
        title: 'Efficiency and runtime',
        intro: '<p>Compare algorithms by calculating runtimes. Show your formulas on paper first, then type your answers.</p>',
        problems: runtime
      }
    ]
  });
})();
