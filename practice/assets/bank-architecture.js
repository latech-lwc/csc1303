/* ==========================================================================
   Practice bank: Lesson 03 – Introduction to Computer Architecture
   (covers exam 2)

   Every problem is a generator: a function that receives a seeded random
   number generator `r` and returns one question object. The engine
   (engine.js) turns that object into an interactive card. Pressing
   "New variant" simply calls the generator again with a fresh seed.

   Useful `r` methods (see engine.js): r.int(lo, hi), r.pick(list),
   r.sample(list, n), r.shuffle(list), r.chance(p).

   Logic problems are built on logic.js (`Practice.logic`, imported below as
   `L`). Boolean expressions are stored as small syntax trees ("ASTs"):
       L.V('A')            a variable
       L.NOT(x)            a NOT gate
       L.AND(x, y)         an AND gate (L.OR, L.NAND, L.NOR work the same way)
       { t:'bin', op:'xor', a:x, b:y }   any other two-input gate
   and that logic.js can draw as circuits, evaluate, and print as text.

   The file is organised as:
     1. Helpers shared by the generators
     2. Section "concepts"   – layers, hardware, vocabulary
     3. Section "gates"      – gates, Boolean algebra, truth tables
     4. Section "switches"   – series and parallel switch circuits
     5. Section "ohm"        – Ohm's law, power and LED resistor design
     6. Section "breadboard" – which breadboard holes are connected
     7. Registration of the bank
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Practice;
  var L = P.logic;


  /* ------------------------------------------------------------------------
     1. Helpers
     ------------------------------------------------------------------------ */

  // The input variables used by the circuit problems.
  var A = L.V('A');
  var B = L.V('B');
  var C = L.V('C');

  // An answer field that expects a number within `tolerance` (default 0.01).
  function num(answer, tolerance, width) {
    return { kind: 'num', ans: answer, tol: tolerance == null ? 0.01 : tolerance, w: width || 'sm' };
  }

  // A 0/1 drop-down, used for the cells of a truth table.
  function bit(value) {
    return { kind: 'select', choices: ['0', '1'], ans: String(value) };
  }

  // Wraps a wide SVG so it scrolls sideways on narrow screens instead of overflowing.
  function svgBox(svg) {
    return '<div style="overflow-x:auto">' + svg + '</div>';
  }

  // A pool-style multiple-choice question: { q, o: options, a: index of correct option, e: explanation }.
  function conceptQuestion(c) {
    return { type: 'mc', prompt: '<p>' + c.q + '</p>', options: c.o, answer: c.a, explain: c.e };
  }

  // Builds a truth table whose output cells are fill-in drop-downs.
  //   vars – input variable names, e.g. ['A', 'B']; one table row per combination
  //   cols – output columns, each { head: 'Z', fn: function (env) -> 0|1 }
  // Returns { html, blanks } to be used as the `template` and `blanks` of a
  // 'blanks' question; each output cell becomes a placeholder like [[t0]].
  function ttBlanks(vars, cols) {
    var blanks = {};
    var counter = 0;

    var headers = vars.concat(cols.map(function (c) { return c.head; }));
    var html = '<table class="pr-table"><thead><tr>' +
               headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') +
               '</tr></thead><tbody>';

    L.rows(vars).forEach(function (env) {
      html += '<tr>' + vars.map(function (v) { return '<td>' + env[v] + '</td>'; }).join('');
      cols.forEach(function (col) {
        var key = 't' + (counter++);
        blanks[key] = bit(col.fn(env));
        html += '<td>[[' + key + ']]</td>';
      });
      html += '</tr>';
    });

    return { html: html + '</tbody></table>', blanks: blanks };
  }

  // A question that asks for a Boolean expression. `ast` is one correct answer;
  // the engine grades the student's expression by comparing truth tables, so any
  // equivalent form is accepted. `extra` overrides fields such as `explain`.
  function exprQuestion(prompt, ast, vars, extra) {
    return Object.assign({
      type: 'expr',
      prompt: prompt,
      ast: ast,
      vars: vars,
      explain: 'One correct answer: <b>Z = ' + L.html(ast) + '</b>. Read the circuit from the inputs toward ' +
               'the output: each gate becomes an operator (AND = ·, OR = +, NOT = bar).'
    }, extra || {});
  }


  /* ==========================================================================
     2. Section "concepts": layers, hardware and vocabulary
     ========================================================================== */
  var concepts = [];

  // Put the layers of a computer system in order (the answer is the order listed).
  concepts.push(function () {
    return {
      type: 'order',
      prompt: '<p>Put the layers of a computer system in order from the <b>top</b> (closest to the user) to the ' +
              '<b>bottom</b>.</p>',
      items: ['User', 'Application layer', 'Operating system (and system utilities)',
              'Hardware abstraction layer (device drivers)', 'Hardware layer'],
      explain: 'Each layer hides (abstracts away) the details of the layer beneath it.'
    };
  });

  // Match descriptions with either the instruction-cycle phases or the hardware components.
  concepts.push(function (r) {
    var instructionCycle = [
      ['Retrieve the next instruction from memory', 'Fetch'],
      ['Work out what the instruction is asking the CPU to do', 'Decode'],
      ['Carry out the requested operation', 'Execute']
    ];
    var components = [
      ['Executes the instructions of a program', 'CPU'],
      ['Stores the programs and data currently in use', 'Main memory'],
      ['A highway the components use to communicate', 'Data bus'],
      ['Lets the outside world talk to the computer (keyboard, display)', 'I/O devices']
    ];
    var useInstructionCycle = r.chance(0.5);

    return {
      type: 'match',
      prompt: useInstructionCycle
        ? '<p>Match each description with its phase of the <b>instruction cycle</b>.</p>'
        : '<p>Match each description with the hardware component.</p>',
      pairs: r.shuffle(useInstructionCycle ? instructionCycle : components),
      choices: useInstructionCycle ? ['Fetch', 'Decode', 'Execute'] : ['CPU', 'Main memory', 'Data bus', 'I/O devices']
    };
  });

  // Fill-in-the-blank statements (exam question 2). `t` is the sentence with a
  // [[a]] blank, `a` the accepted answers, and `w` an optional field width.
  var STATEMENTS = [
    { t: 'If both inputs to an AND gate are 1, the output is [[a]].', a: ['1'] },
    { t: 'If one input to an OR gate is 0 and the other is 1, the output is [[a]].', a: ['1'] },
    { t: 'If both inputs to an OR gate are 0, the output is [[a]].', a: ['0'] },
    { t: 'The output of a NOT gate whose input is 1 is [[a]].', a: ['0'] },
    {
      t: 'A/an [[a]] defines the meaning of a gate or circuit by listing every possible configuration of its ' +
         'inputs along with the corresponding output.',
      a: ['truth table', 'a truth table'], w: 11
    },
    {
      t: '[[a]] are digital circuits that do not involve any kind of feedback (their output cannot be fed back ' +
         'in as input).',
      a: ['combinational circuits', 'combinational circuit', 'combinational'], w: 13
    },
    { t: 'A truth table for a circuit with 4 inputs has [[a]] rows.', a: ['16'] },
    { t: 'The three basic logic gates are AND, OR and [[a]].', a: ['not'] },
    { t: 'The unit of electrical resistance is the [[a]].', a: ['ohm', 'ohms'] },
    {
      t: 'Two switches on the same path from the power source back to itself are in [[a]]; the light turns on ' +
         'only when both are closed.',
      a: ['series'], w: 8
    },
    {
      t: 'Switches placed on separate paths between the power source and the bulb are in [[a]]; the light turns ' +
         'on if either is closed.',
      a: ['parallel'], w: 8
    }
  ];

  concepts.push(function (r) {
    var picked = r.sample(STATEMENTS, 4);

    var blanks = {};
    var template = '';
    picked.forEach(function (statement, i) {
      var key = 's' + i;     // each statement uses [[a]]; rename it so the four blanks have unique names
      blanks[key] = { kind: 'text', ans: statement.a, w: statement.w || 'sm' };
      template += '<p>' + String.fromCharCode(97 + i) + '. ' + statement.t.replace('[[a]]', '[[' + key + ']]') + '</p>';
    });

    return { type: 'blanks', prompt: '<p>Complete each statement.</p>', template: template, blanks: blanks };
  });

  // A pool of short conceptual multiple-choice questions. `a` is the index of
  // the correct option in `o`; `e` is the (optional) explanation.
  var CONCEPT_QUESTIONS = [
    {
      q: 'A truth table for a circuit with <i>n</i> inputs has how many rows?',
      o: ['2<sup>n</sup>', '2n', 'n²', 'n'], a: 0,
      e: 'Each input can be 0 or 1, so there are 2 × 2 × … × 2 = 2<sup>n</sup> configurations.'
    },
    {
      q: 'Which type of current comes from a battery or the Raspberry Pi?',
      o: ['DC (direct current)', 'AC (alternating current)', 'Neither', 'Both'], a: 0,
      e: 'DC has one fixed positive and one fixed negative terminal. Wall outlets supply AC, which swaps ' +
         'polarity 60 times per second.'
    },
    {
      q: 'Which leg of an LED must connect toward the <b>positive</b> side of the supply?',
      o: ['The longer leg (anode)', 'The shorter leg (cathode)', 'Either one', 'Neither: LEDs need AC'], a: 0,
      e: 'LEDs only allow current in one direction. The long leg is the anode (+); the short, flat-side leg ' +
         'is the cathode (−).'
    },
    {
      q: 'Why is a resistor placed in series with an LED?',
      o: ['To limit the current so the LED is not damaged', 'To make the LED brighter than its rating',
          'To convert DC to AC', 'To store energy'], a: 0
    },
    {
      q: 'On a breadboard, which holes are connected to each other?',
      o: ['Those in the same column group on one side of the center gap (and each long rail row)',
          'Every hole in the same row across the whole board', 'All holes on the board',
          'Holes on opposite sides of the center gap'], a: 0,
      e: 'There is a disconnect across the center gap, so components bridging the gap need their two sides in ' +
         'different halves.'
    },
    {
      q: 'Using the lesson\'s convention, a <b>black</b> wire on a circuit usually connects to…',
      o: ['ground (negative)', 'positive voltage', '3.3 V', 'the LED anode'], a: 0
    },
    {
      q: 'A <b>circuit diagram</b> (schematic) differs from a <b>layout diagram</b> because it…',
      o: ['shows connections with standard symbols rather than the physical layout',
          'shows exactly where each part sits on the breadboard', 'uses colors for each wire',
          'only works for LEDs'], a: 0
    },
    {
      q: 'The <b>hardware abstraction layer</b> (HAL)…',
      o: ['makes hardware look the same to the operating system, regardless of the computer\'s design',
          'is the physical keyboard and monitor', 'is the application the user runs',
          'translates Python into machine language'], a: 0
    },
    {
      q: 'A NAND gate is equivalent to…',
      o: ['an AND gate followed by a NOT', 'a NOT gate followed by an AND', 'an OR gate followed by a NOT',
          'two AND gates'], a: 0
    }
  ];

  concepts.push(function (r) {
    return conceptQuestion(r.pick(CONCEPT_QUESTIONS));
  });


  /* ==========================================================================
     3. Section "gates": logic gates and Boolean algebra
     ========================================================================== */

  // The first item is not a problem but an interactive widget (see logic.js).
  var gates = [{ widget: 'logicSandbox' }];

  // Name four gates from their drawn symbols and give their output for the inputs shown.
  gates.push(function (r) {
    var gateNames = r.sample(['and', 'or', 'not', 'nand', 'nor', 'xor'], 4);

    return {
      type: 'table',
      prompt: '<p>Name each gate and give its output for the inputs shown (for a 1-input gate, use only input A).</p>',
      head: ['Gate', 'Name', 'Inputs', 'Output'],
      rows: gateNames.map(function (op) {
        var isNot = op === 'not';
        var ast = isNot ? L.NOT(A) : { t: 'bin', op: op, a: A, b: B };
        var inputA = r.int(0, 1);
        var inputB = r.int(0, 1);
        var output = L.evalAst(ast, { A: inputA, B: inputB });

        return [
          svgBox(L.circuitSVG(ast, isNot ? ['A'] : ['A', 'B'], { out: 'Z' })),
          { kind: 'select', choices: ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'], ans: op.toUpperCase() },
          isNot ? 'A = ' + inputA : 'A = ' + inputA + ', B = ' + inputB,
          bit(output)
        ];
      }),
      explain: 'A bubble on an output means NOT. AND has a flat back, OR has a curved back, XOR has an extra ' +
               'curved line behind it.'
    };
  });

  // Complete the truth table of one two-input gate.
  gates.push(function (r) {
    var op = r.pick(['and', 'or', 'nand', 'nor', 'xor']);
    var ast = { t: 'bin', op: op, a: A, b: B };

    var explanations = {
      and: 'AND outputs 1 only when both inputs are 1.',
      or: 'OR outputs 1 when either (or both) input is 1.',
      nand: 'NAND is the opposite of AND.',
      nor: 'NOR is the opposite of OR.',
      xor: 'XOR is 1 when the inputs are different ("either, but not both").'
    };

    return {
      type: 'table',
      prompt: '<p>Complete the truth table for this <b>' + op.toUpperCase() + '</b> gate.</p>' +
              svgBox(L.circuitSVG(ast, ['A', 'B'])),
      head: ['A', 'B', 'Z'],
      rows: L.rows(['A', 'B']).map(function (env) { return [env.A, env.B, bit(L.evalAst(ast, env))]; }),
      explain: explanations[op]
    };
  });

  // Exam question 3: write the Boolean expression for a circuit.
  gates.push(function (r) {
    var numVars = r.pick([2, 2, 3]);
    var vars = ['A', 'B', 'C'].slice(0, numVars);
    var gateCount = numVars === 2 ? r.int(2, 3) : 3;
    var ast = L.randExpr(r, vars, gateCount, { notP: 0.3, maxNots: 2 });

    return exprQuestion(
      '<p>Write the Boolean algebra expression for the output <b>Z</b> of this circuit. (Do not simplify.)</p>' +
        svgBox(L.circuitSVG(ast, vars)),
      ast, vars);
  });

  // The reverse direction: given an expression, fill in its truth table.
  gates.push(function (r) {
    var vars = ['A', 'B', 'C'];
    var ast = L.randExpr(r, vars, 3, { notP: 0.4, maxNots: 2 });
    var table = ttBlanks(vars, [{ head: 'Z', fn: function (env) { return L.evalAst(ast, env); } }]);

    return {
      type: 'blanks',
      prompt: '<p>Complete the truth table for <b>Z = ' + L.html(ast) + '</b>. Keep the inputs in numeric order.</p>',
      template: table.html,
      blanks: table.blanks,
      explain: 'Evaluate the innermost parts first. Overlines (NOT) flip a value; · is AND; + is OR. ' +
               'Circuit for reference:' + svgBox(L.circuitSVG(ast, vars, { labels: true }))
    };
  });

  // Exam question 8: a 4-input circuit has a 16-row truth table.
  gates.push(function (r) {
    var vars = ['A', 'B', 'C', 'D'];
    var ast = L.randExpr(r, vars, 4, { notP: 0.25, maxNots: 2 });
    var table = ttBlanks(vars, [{ head: 'Z', fn: function (env) { return L.evalAst(ast, env); } }]);

    return {
      type: 'blanks',
      prompt: '<p>Complete the truth table (16 rows!) for this circuit. Keep the inputs in proper numeric order.</p>' +
              svgBox(L.circuitSVG(ast, vars)),
      template: table.html,
      blanks: table.blanks,
      explain: 'Z = ' + L.html(ast) + '. Work out the output of each gate for every row.'
    };
  });

  // Two gates chained together, with a column for the first gate's (intermediate) output.
  gates.push(function (r) {
    var vars = ['A', 'B', 'C'];
    var firstOp = r.pick(['and', 'or']);
    var secondOp = r.pick(['and', 'or']);

    var firstGate = { t: 'bin', op: firstOp, a: A, b: B };
    var ast = { t: 'bin', op: secondOp, a: firstGate, b: C };

    var table = ttBlanks(vars, [
      { head: 'Z (A ' + firstOp.toUpperCase() + ' B)', fn: function (env) { return L.evalAst(firstGate, env); } },
      { head: "Z' (Z " + secondOp.toUpperCase() + " C)", fn: function (env) { return L.evalAst(ast, env); } }
    ]);

    return {
      type: 'blanks',
      prompt: '<p>Fill in the truth table for this circuit, including the <b>intermediate</b> output Z of the ' +
              'first gate.</p>' + svgBox(L.circuitSVG(ast, vars, { labels: true })),
      template: table.html,
      blanks: table.blanks,
      explain: 'Expression: <b>' + L.html(ast) + '</b>. Computing Z first makes Z\' easy.'
    };
  });

  // [name of the single equivalent gate, a circuit built from other gates that behaves like it].
  // Several are De Morgan's laws in disguise.
  var EQUIVALENT_CIRCUITS = [
    ['AND',  L.NOT(L.OR(L.NOT(A), L.NOT(B)))],
    ['OR',   L.NOT(L.AND(L.NOT(A), L.NOT(B)))],
    ['NOR',  L.AND(L.NOT(A), L.NOT(B))],
    ['NAND', L.OR(L.NOT(A), L.NOT(B))],
    ['XOR',  L.AND(L.OR(A, B), L.NOT(L.AND(A, B)))],
    ['XOR',  L.OR(L.AND(L.NOT(A), B), L.AND(A, L.NOT(B)))],
    ['AND',  L.NOR(L.NOT(A), L.NOT(B))],
    ['OR',   L.NAND(L.NOT(A), L.NOT(B))]
  ];

  // Exam questions 5/6: which single gate is this circuit equivalent to?
  gates.push(function (r) {
    var picked = r.pick(EQUIVALENT_CIRCUITS);
    var gateName = picked[0];
    var circuit = picked[1];
    var table = ttBlanks(['A', 'B'], [{ head: 'Z', fn: function (env) { return L.evalAst(circuit, env); } }]);

    return {
      type: 'blanks',
      prompt: '<p>Determine which <b>basic gate</b> is equivalent to the circuit shown. Fill in its truth table ' +
              'to prove it.</p>' + svgBox(L.circuitSVG(circuit, ['A', 'B'])),
      template: table.html + '<p>Equivalent to a single [[g]] gate.</p>',
      blanks: Object.assign({
        g: { kind: 'select', choices: ['AND', 'OR', 'NAND', 'NOR', 'XOR'], ans: gateName }
      }, table.blanks),
      explain: 'Z = ' + L.html(circuit) + '. Its truth table matches a single ' + gateName +
               ' gate (this is one of De Morgan\'s laws in action).'
    };
  });

  // Exam question 7: build a circuit (expression) from a truth table using the
  // "sum of products" method: one AND term per row where Z = 1, all OR-ed together.
  gates.push(function (r) {
    var numVars = r.chance(0.7) ? 2 : 3;
    var vars = ['A', 'B', 'C'].slice(0, numVars);
    var rows = L.rows(vars);

    // Choose which rows output 1 (between 1 and 3 of them).
    var allRowIndexes = rows.map(function (_, i) { return i; });
    var oneCount = r.int(1, 3);
    var onesRows = r.sample(allRowIndexes, oneCount).sort(function (a, b) { return a - b; });

    var output = rows.map(function (_, i) { return onesRows.indexOf(i) >= 0 ? 1 : 0; });

    // One product term per row with Z = 1: each variable, inverted where the row has a 0.
    var terms = onesRows.map(function (rowIndex) {
      var literals = vars.map(function (v) {
        return rows[rowIndex][v] ? L.V(v) : L.NOT(L.V(v));
      });
      return literals.reduce(function (x, y) { return L.AND(x, y); });
    });
    var sumOfProducts = terms.reduce(function (x, y) { return L.OR(x, y); });

    // The truth table shown to the student, with the output filled in.
    var tableHtml = '<table class="pr-table"><thead><tr>' +
      vars.map(function (v) { return '<th>' + v + '</th>'; }).join('') + '<th>Z</th></tr></thead><tbody>' +
      rows.map(function (env, i) {
        return '<tr>' + vars.map(function (v) { return '<td>' + env[v] + '</td>'; }).join('') +
               '<td>' + output[i] + '</td></tr>';
      }).join('') + '</tbody></table>';

    return exprQuestion(
      '<p>Using only AND, OR and NOT, write a Boolean expression for this truth table. Method from the lesson: ' +
        'for each row where Z = 1, build a sub-circuit that is 1 only for that row, then OR the sub-circuits ' +
        'together.</p>' + tableHtml,
      sumOfProducts, vars,
      {
        truth: output,    // lets the engine grade directly against the table
        explain: 'One solution (a sum of products, one term per row with Z = 1): <b>Z = ' + L.html(sumOfProducts) +
                 '</b>. Circuit:' + svgBox(L.circuitSVG(sumOfProducts, vars, { labels: true }))
      });
  });


  /* ==========================================================================
     4. Section "switches": series and parallel switch circuits
     ========================================================================== */
  var switches = [];

  // Exam question 4: complete the table of switch settings and bulb state.
  switches.push(function (r) {
    var numVars = r.pick([2, 3]);
    var vars = ['A', 'B', 'C'].slice(0, numVars);
    // Series = AND, parallel = OR, so a switch circuit is an AND/OR expression with no NOTs.
    var ast = L.randExpr(r, vars, numVars, { ops: ['and', 'or'], notP: 0 });
    var table = L.ttQuestion(vars, [{ head: 'Light bulb', fn: function (env) { return L.evalAst(ast, env); } }], { words: true });

    return {
      type: 'table',
      prompt: '<p>Complete the table of every switch setting (open/closed) and the light bulb (on/off) for this ' +
              'circuit. Switches in <b>series</b> (one after the other) must <i>all</i> be closed; switches in ' +
              '<b>parallel</b> (side by side) need only <i>one</i> closed.</p>' + svgBox(L.switchSVG(ast)),
      head: table.head,
      rows: table.rows,
      explain: 'This circuit is the Boolean expression <b>' + L.html(ast) + '</b> (series = AND, parallel = OR).'
    };
  });

  // Write the Boolean expression of a switch circuit.
  switches.push(function (r) {
    var numVars = r.pick([2, 3]);
    var vars = ['A', 'B', 'C'].slice(0, numVars);
    var ast = L.randExpr(r, vars, numVars, { ops: ['and', 'or'], notP: 0 });

    return exprQuestion(
      '<p>Treat each switch as an input (closed = 1) and the bulb as the output <b>Z</b> (on = 1). Write the ' +
        'Boolean expression for this circuit.</p>' + svgBox(L.switchSVG(ast)),
      ast, vars,
      {
        explain: 'Series switches combine with AND (·); parallel branches combine with OR (+). One answer: <b>Z = ' +
                 L.html(ast) + '</b>.'
      });
  });


  /* ==========================================================================
     5. Section "ohm": Ohm's law, power and LEDs
     ========================================================================== */
  var ohm = [];

  var FORMULAS = [
    'V = I × R',                              // 0
    'I = V / R',                              // 1
    'R = V / I',                              // 2
    'P = V × I',                              // 3
    'I = P / V',                              // 4
    'V(resistor) = V(source) − V(LED)'        // 5
  ];

  // Exam question 9: seven short problems, each asking for the formula used and the answer.
  ohm.push(function (r) {
    // a. voltage drop across the resistor in an LED circuit
    var sourceVolts = r.pick([9, 12, 15, 5]);
    var ledVolts = r.pick([2, 3]);
    var resistorA = r.pick([150, 220, 300, 470]);

    // b. current from resistance and voltage
    var resistorB = r.pick([100, 150, 200, 300, 500]);
    var milliampsB = r.pick([10, 15, 20, 30, 40]);
    var voltsB = resistorB * milliampsB / 1000;

    // c. voltage from resistance and current
    var resistorC = r.pick([100, 220, 330, 470]);
    var milliampsC = r.pick([10, 20, 25, 30]);
    var voltsC = resistorC * milliampsC / 1000;

    // d. resistance from voltage and current
    var voltsD = r.pick([3, 5, 6, 9, 12]);
    var milliampsD = r.pick([10, 15, 20, 30, 40]);
    var ohmsD = voltsD / milliampsD * 1000;

    // e. power dissipated by an LED
    var ledVoltsE = r.pick([1.8, 2, 2.2, 3]);
    var milliampsE = r.pick([10, 15, 20, 30]);
    var milliwattsE = ledVoltsE * milliampsE;

    // f. current from power and voltage
    var ledVoltsF = r.pick([2, 3]);
    var milliampsF = r.pick([10, 20, 25, 30]);
    var milliwattsF = ledVoltsF * milliampsF;

    // g. power supplied by a battery
    var sourceVoltsG = r.pick([5, 9, 12, 15]);
    var milliampsG = r.pick([10, 20, 30, 40, 50]);
    var milliwattsG = sourceVoltsG * milliampsG;

    // [question text, accepted formulas, numeric answer, unit]
    var parts = [
      ['a. A series circuit has a ' + sourceVolts + ' V battery, a ' + resistorA + ' Ω resistor and an LED with a ' +
         ledVolts + ' V forward voltage. Voltage drop across the resistor?', [FORMULAS[5]], sourceVolts - ledVolts, 'V'],
      ['b. A ' + resistorB + ' Ω resistor has ' + voltsB + ' V across it. Current through it?',
        [FORMULAS[1], FORMULAS[0]], milliampsB, 'mA'],
      ['c. A ' + resistorC + ' Ω resistor carries ' + milliampsC + ' mA. Voltage drop across it?',
        [FORMULAS[0]], voltsC, 'V'],
      ['d. A resistor has ' + voltsD + ' V across it with ' + milliampsD + ' mA flowing through it. Its resistance?',
        [FORMULAS[2], FORMULAS[0]], ohmsD, 'Ω'],
      ['e. An LED has a ' + ledVoltsE + ' V drop with ' + milliampsE + ' mA flowing through it. Power it dissipates?',
        [FORMULAS[3]], milliwattsE, 'mW'],
      ['f. An LED has a ' + ledVoltsF + ' V drop and dissipates ' + milliwattsF + ' mW. Current through it?',
        [FORMULAS[4], FORMULAS[3]], milliampsF, 'mA'],
      ['g. A ' + sourceVoltsG + ' V battery supplies ' + milliampsG + ' mA to a circuit. Power dissipated in the circuit?',
        [FORMULAS[3]], milliwattsG, 'mW']
    ];

    var blanks = {};
    var template = '';
    parts.forEach(function (part, i) {
      blanks['f' + i] = { kind: 'select', choices: FORMULAS, ans: part[1] };
      blanks['v' + i] = { kind: 'num', ans: Math.round(part[2] * 1000) / 1000, tol: 0.011, w: 'sm' };
      template += '<p>' + part[0] + '<br>Formula: [[f' + i + ']] &nbsp; Answer: [[v' + i + ']] ' + part[3] + '</p>';
    });

    return {
      type: 'blanks',
      prompt: '<p>For each question choose the formula you use and give your answer. ' +
              '(Remember 1 A = 1000 mA and 1 W = 1000 mW.)</p>',
      template: template,
      blanks: blanks,
      explain: 'Convert milliamps to amps before using V = IR (e.g. 20 mA = 0.02 A) — or keep everything in mA ' +
               'and mW as long as you are consistent. Power: P = V × I.'
    };
  });

  // Standard resistor values the student may choose from.
  var STANDARD_RESISTORS = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82, 100, 120, 150, 180, 220, 270, 330,
                            390, 470, 560, 680, 820, 1000];

  // Design the resistor for an LED (from the lesson): size it, pick a real part, check its power rating.
  ohm.push(function (r) {
    var sourceVolts = r.pick([3.3, 5, 9]);
    var ledVolts = r.pick([1.8, 2, 2.2, 3]);
    var milliamps = r.pick([10, 15, 20, 25]);
    if (sourceVolts - ledVolts < 0.5) sourceVolts = 5;     // keep enough voltage left over for the resistor

    var resistorVolts = sourceVolts - ledVolts;
    var ohms = resistorVolts / (milliamps / 1000);
    var nearest = STANDARD_RESISTORS.reduce(function (best, candidate) {
      return Math.abs(candidate - ohms) < Math.abs(best - ohms) ? candidate : best;
    });

    var resistorMilliwatts = resistorVolts * milliamps;
    var ledMilliwatts = ledVolts * milliamps;
    var totalMilliwatts = sourceVolts * milliamps;

    // The resistor must stay below 60% of its power rating.
    var ratingNeeded = resistorMilliwatts / 0.6;
    var rating = ratingNeeded <= 125 ? '1/8 W (125 mW)' : ratingNeeded <= 250 ? '1/4 W (250 mW)' : '1/2 W (500 mW)';

    return {
      type: 'blanks',
      prompt: '<p>A power source of <b>' + sourceVolts + ' V</b> lights an LED in series with a resistor. The LED ' +
              'data sheet says forward voltage <b>' + ledVolts + ' V</b> and forward current <b>' + milliamps +
              ' mA</b>.</p><p>Available resistor values: ' + STANDARD_RESISTORS.join(', ') + ' Ω.</p>',
      template: '<p>Resistance needed (Ω, round to nearest whole): [[r]]</p>' +
                '<p>Closest available resistor: [[s]] Ω</p>' +
                '<p>Power dissipated by the resistor (mW): [[pr]] &nbsp; by the LED (mW): [[pl]] &nbsp; ' +
                'total (mW): [[pt]]</p>' +
                '<p>The resistor should not exceed 60% of its rating. The smallest sufficient rating is: [[w]]</p>',
      blanks: {
        r: num(Math.round(ohms), 1),
        s: { kind: 'select', choices: STANDARD_RESISTORS, ans: nearest },
        pr: num(Math.round(resistorMilliwatts * 10) / 10, 0.11),
        pl: num(Math.round(ledMilliwatts * 10) / 10, 0.11),
        pt: num(Math.round(totalMilliwatts * 10) / 10, 0.11),
        w: { kind: 'select', choices: ['1/8 W (125 mW)', '1/4 W (250 mW)', '1/2 W (500 mW)'], ans: rating }
      },
      explain: 'Voltage across the resistor = ' + sourceVolts + ' − ' + ledVolts + ' = ' +
               Math.round(resistorVolts * 100) / 100 + ' V. R = V / I = ' + Math.round(resistorVolts * 100) / 100 +
               ' / ' + milliamps / 1000 + ' = ' + ohms.toFixed(1) + ' Ω → nearest available ' + nearest +
               ' Ω. Resistor power = ' + resistorMilliwatts.toFixed(1) + ' mW (needs a rating of at least ' +
               ratingNeeded.toFixed(0) + ' mW), LED ' + ledMilliwatts.toFixed(1) + ' mW, total ' +
               totalMilliwatts.toFixed(1) + ' mW.'
    };
  });


  /* ==========================================================================
     6. Section "breadboard": which holes are electrically connected?

     The board has two halves separated by a center gap. In each half, the five
     holes of one column are wired together (rows a-e on top, f-j on the
     bottom). Four long power rails run along the edges; every hole on the same
     rail is wired together.

     A "hole" is described by one of:
       { col: 3, row: 'c' }       a main-area hole
       { col: 3, rail: '+T' }     a rail hole (+T/-T = top rails, +B/-B = bottom rails)
     ========================================================================== */
  var board = [];

  var BOARD_ROWS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  var BOARD_COLUMNS = 12;
  var PAIR_COLORS = ['#1971c2', '#e8590c', '#2f9e44', '#9c36b5', '#c2255c'];   // one color per question

  // Pixel position of a hole in the SVG.
  function holePosition(hole) {
    var x = 40 + (hole.col - 1) * 24;

    if (hole.rail) {
      return { x: x, y: { '+T': 20, '-T': 38, '-B': 292, '+B': 310 }[hole.rail] };
    }
    var rowIndex = BOARD_ROWS.indexOf(hole.row);
    var gapOffset = rowIndex > 4 ? 18 : 0;       // rows f-j sit below the center gap
    return { x: x, y: 68 + rowIndex * 20 + gapOffset };
  }

  // Draws the breadboard and circles each pair of holes the questions ask about.
  function boardSVG(pairs) {
    var svg = '<svg class="pr-svg" viewBox="0 0 340 330" width="480" role="img" aria-label="breadboard diagram">';

    // Column numbers along the top, row letters down the left side.
    for (var col = 1; col <= BOARD_COLUMNS; col++) {
      svg += '<text x="' + (40 + (col - 1) * 24) + '" y="58" font-size="9" text-anchor="middle">' + col + '</text>';
    }
    BOARD_ROWS.forEach(function (row) {
      var y = holePosition({ col: 1, row: row }).y;
      svg += '<text x="10" y="' + (y + 3) + '" font-size="10">' + row + '</text>';
    });

    // Every hole on the board.
    var allHoles = [];
    for (var c = 1; c <= BOARD_COLUMNS; c++) {
      BOARD_ROWS.forEach(function (row) { allHoles.push({ col: c, row: row }); });
      ['+T', '-T', '+B', '-B'].forEach(function (rail) { allHoles.push({ col: c, rail: rail }); });
    }
    allHoles.forEach(function (hole) {
      var p = holePosition(hole);
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="none" stroke="currentColor" opacity="0.55"/>';
    });

    // Rail polarity labels and the center gap marker.
    svg += '<text x="318" y="24" font-size="10" fill="#d33" style="fill:#d33">+</text>' +
           '<text x="318" y="42" font-size="10">−</text>' +
           '<text x="318" y="296" font-size="10">−</text>' +
           '<text x="318" y="314" font-size="10" style="fill:#d33">+</text>';
    svg += '<text x="318" y="182" font-size="9" opacity="0.7">gap</text>' +
           '<path d="M30,166 H306" stroke="currentColor" stroke-dasharray="3 3" opacity="0.5"/>';

    // Highlight each question's two holes with a colored, numbered ring.
    pairs.forEach(function (pair, i) {
      pair.forEach(function (hole) {
        var p = holePosition(hole);
        svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="7" fill="none" stroke="' + PAIR_COLORS[i] +
               '" stroke-width="2.5"/>' +
               '<text x="' + (p.x + 9) + '" y="' + (p.y - 5) + '" font-size="10" font-weight="700" style="fill:' +
               PAIR_COLORS[i] + '">' + (i + 1) + '</text>';
      });
    });

    return svgBox(svg + '</svg>') +
           '<div style="font-size:.8rem;opacity:.8">Each numbered, colored pair of circles is one question ' +
           'below. Rails (+ and −) run the full length of the board.</div>';
  }

  // A hole described in words, for the question text.
  function holeName(hole) {
    if (hole.rail) {
      var railNames = { '+T': 'top + rail', '-T': 'top − rail', '+B': 'bottom + rail', '-B': 'bottom − rail' };
      return railNames[hole.rail] + ', hole ' + hole.col;
    }
    return 'column ' + hole.col + ', row ' + hole.row;
  }

  // Are two holes wired together?
  function isConnected(a, b) {
    if (a.rail || b.rail) {
      // A rail hole connects only to holes on the same rail.
      return !!(a.rail && b.rail && a.rail === b.rail);
    }
    // Same column and the same side of the center gap.
    var sameColumn = a.col === b.col;
    var sameHalf = (BOARD_ROWS.indexOf(a.row) < 5) === (BOARD_ROWS.indexOf(b.row) < 5);
    return sameColumn && sameHalf;
  }

  board.push(function (r) {
    // Five of these six situations, in random order, become the five questions.
    var kinds = r.shuffle(['same', 'gap', 'rowdiff', 'rail', 'railx', 'railcol']);
    var pairs = [];

    kinds.slice(0, 5).forEach(function (kind) {
      var col = r.int(1, BOARD_COLUMNS);
      var otherCol = (col + r.int(1, 5) - 1) % BOARD_COLUMNS + 1;     // a different column, wrapping around
      var topHalf = r.chance(0.5);
      var pickRow = function (inTop) { return r.pick(inTop ? BOARD_ROWS.slice(0, 5) : BOARD_ROWS.slice(5)); };
      var otherColumn = otherCol === col ? col % BOARD_COLUMNS + 1 : otherCol;   // guarantee it differs from `col`

      var a, b;
      if (kind === 'same') {
        // Two different holes in the same column and half: connected.
        a = { col: col, row: pickRow(topHalf) };
        do { b = { col: col, row: pickRow(topHalf) }; } while (b.row === a.row);
      } else if (kind === 'gap') {
        // Same column but across the center gap: not connected.
        a = { col: col, row: pickRow(true) };
        b = { col: col, row: pickRow(false) };
      } else if (kind === 'rowdiff') {
        // Same row letter but different columns: not connected.
        var row = pickRow(topHalf);
        a = { col: col, row: row };
        b = { col: otherColumn, row: row };
      } else if (kind === 'rail') {
        // Two holes on the same rail: connected.
        var rail = r.pick(['+T', '-T', '+B', '-B']);
        a = { col: col, rail: rail };
        b = { col: otherColumn, rail: rail };
      } else if (kind === 'railx') {
        // The + and − rails next to each other: not connected.
        a = { col: col, rail: '+T' };
        b = { col: col, rail: '-T' };
      } else {
        // A rail hole and a main-area hole in the same column: not connected.
        a = { col: col, rail: r.pick(['+T', '-T']) };
        b = { col: col, row: pickRow(true) };
      }
      pairs.push([a, b]);
    });

    var blanks = {};
    var template = '';
    pairs.forEach(function (pair, i) {
      blanks['p' + i] = { kind: 'select', choices: ['Yes', 'No'], ans: isConnected(pair[0], pair[1]) ? 'Yes' : 'No' };
      template += '<p><b style="color:' + PAIR_COLORS[i] + '">' + (i + 1) + '.</b> ' + holeName(pair[0]) + ' and ' +
                  holeName(pair[1]) + ' — electrically connected? [[p' + i + ']]</p>';
    });

    return {
      type: 'blanks',
      prompt: '<p>On this breadboard, the five holes in a column group (a–e on top, f–j on the bottom) are ' +
              'connected to each other. There is <b>no</b> connection across the center gap. Each long power rail ' +
              'row is connected along its length.</p>' + boardSVG(pairs),
      template: template,
      blanks: blanks,
      explain: 'Same column on the <i>same side</i> of the gap = connected. Different columns, or opposite sides ' +
               'of the gap = not connected. Two holes on the same rail row are connected; the + and − rails are ' +
               'separate.'
    };
  });


  /* ==========================================================================
     7. Registration
     ========================================================================== */
  P.register('architecture', {
    sections: [
      { id: 'concepts', title: 'Layers, hardware and digital-logic vocabulary', problems: concepts },
      {
        id: 'gates',
        title: 'Logic gates, Boolean algebra and truth tables',
        intro: '<p>Read circuits, write expressions (any equivalent form is accepted), and fill in truth tables. Use the sandbox to check your own work.</p>',
        problems: gates
      },
      { id: 'switches', title: 'Switch circuits: series and parallel', problems: switches },
      { id: 'ohm', title: "Ohm's law, power and LED circuits", problems: ohm },
      { id: 'breadboard', title: 'Breadboards', problems: board }
    ]
  });
})();
