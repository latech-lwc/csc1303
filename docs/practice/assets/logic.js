/* ==========================================================================
   Boolean algebra and digital-logic helpers for the practice problems.

   This file adds, on top of engine.js:
     * a tiny syntax-tree ("AST") representation of Boolean expressions,
       with evaluation, truth tables, a text parser, and pretty-printing;
     * a random-expression generator for building problems;
     * SVG drawing for logic-gate circuits and series/parallel switch circuits;
     * the 'expr' question type (the student types a Boolean expression);
     * the 'logicSandbox' widget (type an expression, see its circuit and table).

   Everything is exposed as `Practice.logic` (the bank files call it `L`).

   THE AST
   -------
   An expression is a tree of plain objects:
       { t: 'var',   n: 'A' }                      an input variable
       { t: 'const', v: 0 | 1 }                    the constant 0 or 1
       { t: 'not',   a: <node> }                   NOT
       { t: 'bin',   op: 'and', a: <n>, b: <n> }   a two-input gate; op is one of
                                                   'and' 'or' 'xor' 'nand' 'nor'
   Truth values are the numbers 0 and 1.

   The file is organised as:
     1. Building and evaluating expressions
     2. The text parser
     3. Printing expressions (HTML and plain text)
     4. Random expressions
     5. Drawing logic circuits (SVG)
     6. Drawing switch circuits (SVG)
     7. Truth-table question helper
     8. The 'expr' question type
     9. The logic sandbox widget
   ========================================================================== */
(function () {
  'use strict';

  var P = window.Practice;
  var U = P.util;
  var esc = U.esc;
  var L = P.logic = {};


  /* ==========================================================================
     1. Building and evaluating expressions
     ========================================================================== */

  function makeBinary(op, a, b) {
    return { t: 'bin', op: op, a: a, b: b };
  }

  L.V = function (name) { return { t: 'var', n: name }; };
  L.NOT = function (a) { return { t: 'not', a: a }; };
  L.AND = function (a, b) { return makeBinary('and', a, b); };
  L.OR = function (a, b) { return makeBinary('or', a, b); };
  L.XOR = function (a, b) { return makeBinary('xor', a, b); };
  L.NAND = function (a, b) { return makeBinary('nand', a, b); };
  L.NOR = function (a, b) { return makeBinary('nor', a, b); };

  var V = L.V;
  var NOT = L.NOT;

  // Evaluates an expression. `env` maps variable names to 0/1, e.g. { A: 1, B: 0 }.
  L.evalAst = function (node, env) {
    switch (node.t) {
      case 'var':
        if (!(node.n in env)) throw new Error('Unknown input ' + node.n);
        return env[node.n];
      case 'const':
        return node.v;
      case 'not':
        return L.evalAst(node.a, env) ? 0 : 1;
      default:
        var a = L.evalAst(node.a, env);
        var b = L.evalAst(node.b, env);
        switch (node.op) {
          case 'and':  return a & b;
          case 'or':   return a | b;
          case 'xor':  return a ^ b;
          case 'nand': return (a & b) ^ 1;
          case 'nor':  return (a | b) ^ 1;
        }
    }
  };

  // The sorted list of variable names an expression uses.
  L.varsOf = function (node, found) {
    found = found || [];
    if (node.t === 'var') {
      if (found.indexOf(node.n) < 0) found.push(node.n);
    } else if (node.t === 'not') {
      L.varsOf(node.a, found);
    } else if (node.t === 'bin') {
      L.varsOf(node.a, found);
      L.varsOf(node.b, found);
    }
    return found.sort();
  };

  // Every combination of inputs in numeric (truth-table) order; the first
  // variable is the most significant bit. For ['A','B']:
  //   {A:0,B:0} {A:0,B:1} {A:1,B:0} {A:1,B:1}
  L.rows = function (vars) {
    var rows = [];
    var n = vars.length;
    for (var i = 0; i < (1 << n); i++) {
      var env = {};
      vars.forEach(function (v, k) { env[v] = (i >> (n - 1 - k)) & 1; });
      rows.push(env);
    }
    return rows;
  };

  // The output column of an expression's truth table.
  L.truth = function (ast, vars) {
    return L.rows(vars).map(function (env) { return L.evalAst(ast, env); });
  };

  // How many gates an expression needs.
  L.countGates = function (node) {
    if (node.t === 'var' || node.t === 'const') return 0;
    if (node.t === 'not') return 1 + L.countGates(node.a);
    return 1 + L.countGates(node.a) + L.countGates(node.b);
  };


  /* ==========================================================================
     2. The text parser

     Accepts what students are likely to type:
       AND:  ·  *  .  &  ∧  AND  or just writing terms next to each other (AB)
       OR:   +  |  ∨  OR
       NOT:  !A  ~A  ¬A  A'  NOT A
       XOR:  ^  ⊕  XOR
       NAND: NAND     NOR: NOR
       plus parentheses, and the constants 0 and 1.

     Precedence, loosest to tightest:  OR/NOR  <  XOR  <  AND/NAND  <  NOT
     ========================================================================== */
  L.parse = function (source) {
    // Spell-out operators (NAND, NOR, ...) are first replaced by single symbols
    // so that the tokenizer below only has to deal with one character at a time.
    var text = String(source)
      .replace(/\b(NAND)\b/gi, ' @ ')
      .replace(/\b(NOR)\b/gi, ' # ')
      .replace(/\b(XOR)\b/gi, ' ^ ')
      .replace(/\b(AND)\b/gi, ' & ')
      .replace(/\b(OR)\b/gi, ' | ')
      .replace(/\b(NOT)\b/gi, ' ! ')
      .toUpperCase();

    var tokens = text.match(/[A-Z]|[01]|[().+*&|!~¬∧∨⊕·^'@#]/g) || [];

    // Anything left over after removing every legal character is an error.
    var leftover = text.replace(/[A-Z01().+*&|!~¬∧∨⊕·^'@#\s]/g, '');
    if (leftover) throw new Error('I don\'t understand "' + leftover[0] + '".');
    if (!tokens.length) throw new Error('Type an expression.');

    var pos = 0;    // index of the next token to read
    function peek() { return tokens[pos]; }

    // Can this token begin a new operand? (Used for implicit AND: "AB" or "A(B+C)".)
    function startsOperand(t) {
      return t && (/[A-Z01(]/.test(t) || t === '!' || t === '~' || t === '¬');
    }

    // orExpr := xorExpr ( ('+' | '|' | '∨' | '#') xorExpr )*
    function parseOr() {
      var left = parseXor();
      while (peek() === '+' || peek() === '|' || peek() === '∨' || peek() === '#') {
        var op = tokens[pos++];
        var right = parseXor();
        left = makeBinary(op === '#' ? 'nor' : 'or', left, right);
      }
      return left;
    }

    // xorExpr := andExpr ( ('^' | '⊕') andExpr )*
    function parseXor() {
      var left = parseAnd();
      while (peek() === '^' || peek() === '⊕') {
        pos++;
        left = makeBinary('xor', left, parseAnd());
      }
      return left;
    }

    // andExpr := unary ( (AND-symbol | '@' | <nothing>) unary )*
    function parseAnd() {
      var left = parseUnary();
      for (;;) {
        var t = peek();
        if (t === '.' || t === '*' || t === '&' || t === '∧' || t === '·') {
          pos++;
          left = makeBinary('and', left, parseUnary());
        } else if (t === '@') {
          pos++;
          left = makeBinary('nand', left, parseUnary());
        } else if (startsOperand(t)) {
          left = makeBinary('and', left, parseUnary());      // implicit AND
        } else {
          return left;
        }
      }
    }

    // unary := ('!' | '~' | '¬') unary  |  atom "'"*
    function parseUnary() {
      var t = peek();
      if (t === '!' || t === '~' || t === '¬') {
        pos++;
        return NOT(parseUnary());
      }
      var node = parseAtom();
      while (peek() === "'") {          // A' means NOT A
        pos++;
        node = NOT(node);
      }
      return node;
    }

    // atom := variable | 0 | 1 | '(' orExpr ')'
    function parseAtom() {
      var t = tokens[pos++];
      if (t === undefined) throw new Error('The expression ends too early.');
      if (t === '(') {
        var inner = parseOr();
        if (tokens[pos++] !== ')') throw new Error('Missing a closing parenthesis.');
        return inner;
      }
      if (/[A-Z]/.test(t)) return V(t);
      if (t === '0' || t === '1') return { t: 'const', v: +t };
      throw new Error('Unexpected "' + t + '".');
    }

    var ast = parseOr();
    if (pos < tokens.length) throw new Error('Unexpected "' + tokens[pos] + '".');
    return ast;
  };


  /* ==========================================================================
     3. Printing expressions
     ========================================================================== */

  // Operator precedence: bigger binds tighter.
  var PRECEDENCE = { or: 1, nor: 1, xor: 2, and: 3, nand: 3 };

  // HTML form, using overlines for NOT (CSS class "ov") and · + ⊕ for the operators.
  // `parentPrecedence` is used to decide when parentheses are needed.
  L.html = function (node, parentPrecedence) {
    parentPrecedence = parentPrecedence || 0;

    if (node.t === 'var') return esc(node.n);
    if (node.t === 'const') return String(node.v);
    if (node.t === 'not') {
      var inner = node.a.t === 'var' ? esc(node.a.n) : L.html(node.a, 0);
      return '<span class="ov">' + inner + '</span>';
    }

    var symbol = { and: '·', nand: '·', or: '+', nor: '+', xor: '⊕' }[node.op];
    var core = L.html(node.a, PRECEDENCE[node.op]) + symbol + L.html(node.b, PRECEDENCE[node.op]);

    // NAND / NOR are shown as an overline over the whole AND / OR.
    if (node.op === 'nand' || node.op === 'nor') return '<span class="ov">' + core + '</span>';
    return PRECEDENCE[node.op] < parentPrecedence ? '(' + core + ')' : core;
  };

  // Plain-text form that L.parse can read back (used to fill in "Show answer").
  L.text = function (node, parentPrecedence) {
    parentPrecedence = parentPrecedence || 0;

    if (node.t === 'var') return node.n;
    if (node.t === 'const') return String(node.v);
    if (node.t === 'not') {
      return node.a.t === 'var' ? node.a.n + "'" : '!(' + L.text(node.a, 0) + ')';
    }

    var symbol = { and: '·', or: '+', xor: '⊕', nand: '@', nor: '#' }[node.op];
    var text = L.text(node.a, PRECEDENCE[node.op]) + symbol + L.text(node.b, PRECEDENCE[node.op]);
    return PRECEDENCE[node.op] <= parentPrecedence ? '(' + text + ')' : text;
  };


  /* ==========================================================================
     4. Random expressions
     ========================================================================== */

  // Builds a random expression with `leaves` variable occurrences over `vars`.
  // `r` is the seeded random generator. Options `o`:
  //   ops         gates to use (default ['and', 'or'])
  //   notP        chance that each variable is inverted (default 0.3)
  //   groupNotP   chance that each gate's output is inverted (default 0)
  //   maxNots     reject expressions with more NOTs than this (default 2)
  //   noRepeat    require each variable to appear exactly once
  // Candidates are rejected (and a new one tried) if they are constant, if some
  // variable has no effect on the output, or if they have too many NOTs.
  L.randExpr = function (r, vars, leaves, o) {
    o = o || {};
    var ops = o.ops || ['and', 'or'];

    for (var tries = 0; tries < 200; tries++) {
      // Use every variable at least once, fill the rest with random repeats, then shuffle.
      var pool = vars.slice();
      while (pool.length < leaves) pool.push(r.pick(vars));
      pool = r.shuffle(pool);
      var nextLeaf = 0;

      // Recursively splits the leaves between a left and right subtree.
      var build = function (count) {
        if (count === 1) {
          var leaf = V(pool[nextLeaf++]);
          return r.chance(o.notP == null ? 0.3 : o.notP) ? NOT(leaf) : leaf;
        }
        var leftCount = r.int(1, count - 1);
        var left = build(leftCount);
        var right = build(count - leftCount);
        var node = makeBinary(r.pick(ops), left, right);
        return r.chance(o.groupNotP || 0) ? NOT(node) : node;
      };

      var ast = build(leaves);
      var table = L.truth(ast, vars);

      // Rejection tests.
      var isConstant = table.every(function (x) { return x === table[0]; });
      var everyVariableMatters = vars.every(function (v) {
        // Flipping v must change the output for at least one combination of the others.
        return L.rows(vars).some(function (env) {
          var flipped = Object.assign({}, env);
          flipped[v] ^= 1;
          return L.evalAst(ast, env) !== L.evalAst(ast, flipped);
        });
      });
      var notCount = (function count(node) {
        if (node.t === 'not') return 1 + count(node.a);
        if (node.t === 'bin') return count(node.a) + count(node.b);
        return 0;
      })(ast);
      var tooManyNots = notCount > (o.maxNots || 2);
      var repeatsVariable = o.noRepeat && JSON.stringify(ast).match(/"n":"(\w)"/g).length !== vars.length;

      if (!isConstant && everyVariableMatters && !tooManyNots && !repeatsVariable) return ast;
    }
    throw new Error('could not build expression');
  };


  /* ==========================================================================
     5. Drawing logic circuits (SVG)

     The layout: input variables run down the left as vertical "bus" lines.
     Each variable occurrence (a leaf) gets its own row. Gates are placed in
     columns by depth (their distance from the leaves), each gate vertically
     centred between its inputs, with the final output on the right.
     ========================================================================== */
  var GATE_WIDTH = 58;
  var GATE_HEIGHT = 44;
  var ROW_SPACING = 56;
  var COLUMN_SPACING = 112;

  // The SVG shape of a gate whose left edge is at x and whose vertical centre is y.
  function gateShape(op, x, y) {
    var top = y - GATE_HEIGHT / 2;
    var svg = '';

    switch (op) {
      case 'and':
      case 'nand':
        // Flat back, rounded front.
        svg = '<path class="gate" d="M' + x + ',' + top + ' H' + (x + GATE_WIDTH / 2) +
              ' A' + GATE_WIDTH / 2 + ',' + GATE_HEIGHT / 2 + ' 0 0 1 ' + (x + GATE_WIDTH / 2) + ',' + (top + GATE_HEIGHT) +
              ' H' + x + ' Z"/>';
        break;

      case 'or':
      case 'nor':
      case 'xor':
        // Curved back, pointed front.
        svg = '<path class="gate" d="M' + x + ',' + top +
              ' Q' + (x + GATE_WIDTH * 0.6) + ',' + top + ' ' + (x + GATE_WIDTH) + ',' + y +
              ' Q' + (x + GATE_WIDTH * 0.6) + ',' + (top + GATE_HEIGHT) + ' ' + x + ',' + (top + GATE_HEIGHT) +
              ' Q' + (x + 14) + ',' + y + ' ' + x + ',' + top + ' Z"/>';
        if (op === 'xor') {
          // XOR has a second curved line behind the back.
          svg += '<path class="wire" d="M' + (x - 8) + ',' + top + ' Q' + (x + 6) + ',' + y + ' ' +
                 (x - 8) + ',' + (top + GATE_HEIGHT) + '"/>';
        }
        break;

      case 'not':
        // A triangle.
        svg = '<path class="gate" d="M' + x + ',' + (y - 18) + ' L' + (x + 38) + ',' + y + ' L' + x + ',' + (y + 18) + ' Z"/>';
        break;
    }

    // The small circle ("bubble") on the output means "inverted".
    if (op === 'nand' || op === 'nor') {
      svg += '<circle class="gate" cx="' + (x + GATE_WIDTH + 5) + '" cy="' + y + '" r="5"/>';
    }
    if (op === 'not') {
      svg += '<circle class="gate" cx="' + (x + 43) + '" cy="' + y + '" r="5"/>';
    }
    return svg;
  }

  // x coordinate where a gate's output wire starts.
  function gateOutputX(op, x) {
    if (op === 'not') return x + 48;
    if (op === 'nand' || op === 'nor') return x + GATE_WIDTH + 10;
    return x + GATE_WIDTH;
  }

  // x coordinate where a gate's input wires end (XOR's curved back sits slightly further in).
  function gateInputX(op, x) {
    return op === 'xor' ? x + 2 : x;
  }

  // Draws `ast` as a circuit. `vars` lists the inputs in the order they appear
  // on the left (default: the variables the expression uses). Options:
  //   labels   print each gate's name (AND, OR, ...) inside it
  //   out      label for the output wire (default 'Z')
  L.circuitSVG = function (ast, vars, opts) {
    opts = opts || {};
    vars = vars || L.varsOf(ast);

    // x position of each input's vertical bus line.
    var busX = {};
    vars.forEach(function (v, i) { busX[v] = 36 + i * 30; });
    var busEnd = 36 + vars.length * 30 + 10;     // where the buses stop and the gates begin

    var row = 0;                  // next free row for a leaf
    var maxDepth = 0;
    var parts = [];               // SVG fragments, in drawing order
    var lastTap = {};             // lowest y at which each bus line is tapped (sets its length)

    // Step 1: give every node a vertical position (y) and a depth (column).
    // Leaves take consecutive rows; a gate sits halfway between its inputs.
    function layout(node) {
      if (node.t === 'var' || node.t === 'const') {
        node.y = 52 + (row++) * ROW_SPACING;
        node.depth = 0;
        return node;
      }
      if (node.t === 'not') {
        layout(node.a);
        node.y = node.a.y;
        node.depth = node.a.depth + 1;
      } else {
        layout(node.a);
        layout(node.b);
        node.y = (node.a.y + node.b.y) / 2;
        node.depth = Math.max(node.a.depth, node.b.depth) + 1;
      }
      maxDepth = Math.max(maxDepth, node.depth);
      return node;
    }
    ast = JSON.parse(JSON.stringify(ast));      // work on a copy; layout() adds fields to the nodes
    layout(ast);

    function gateOf(node) { return node.t === 'not' ? 'not' : node.op; }
    function gateX(node) { return busEnd + 24 + (node.depth - 1) * COLUMN_SPACING; }

    // Where the wire leaving a node starts: on its bus line (for a variable) or at its gate's output.
    function outputPoint(node) {
      if (node.depth === 0) return { x: busX[node.n] || busEnd - 10, y: node.y };
      return { x: gateOutputX(gateOf(node), gateX(node)), y: node.y };
    }

    // A wire from `from` to (toX, toY). When the heights differ, it runs
    // horizontally to x = jogX, vertically, then horizontally again.
    function wire(from, toX, toY, jogX) {
      var d = 'M' + from.x + ',' + from.y;
      if (Math.abs(from.y - toY) < 0.5) d += ' H' + toX;
      else d += ' H' + jogX + ' V' + toY + ' H' + toX;
      parts.push('<path class="wire" d="' + d + '"/>');
    }

    // Step 2: draw a node and, recursively, everything feeding it.
    function draw(node) {
      if (node.t === 'var') {
        lastTap[node.n] = Math.max(lastTap[node.n] || 0, node.y);
        parts.push('<circle class="dot" cx="' + busX[node.n] + '" cy="' + node.y + '" r="3.5"/>');
        return;
      }
      if (node.t === 'const') {
        parts.push('<text x="' + (busEnd - 20) + '" y="' + (node.y + 5) + '">' + node.v + '</text>');
        return;
      }

      var op = gateOf(node);
      var x = gateX(node);
      var inputs = node.t === 'not' ? [node.a] : [node.a, node.b];

      inputs.forEach(function (input, i) {
        draw(input);
        // Two-input gates attach their inputs 12px above and below the centre.
        var pinY = node.t === 'not' ? node.y : node.y + (i === 0 ? -12 : 12);
        wire(outputPoint(input), gateInputX(op, x), pinY, x - 16 - i * 6);
      });

      parts.push(gateShape(op, x, node.y));
      if (opts.labels) {
        var label = op === 'not' ? '' : op.toUpperCase();
        parts.push('<text x="' + (x + (op === 'not' ? 6 : 10)) + '" y="' + (node.y + 4) + '" font-size="10">' + label + '</text>');
      }
    }
    draw(ast);

    // The final output wire and label.
    var root = outputPoint(ast);
    var width = busEnd + 24 + Math.max(0, maxDepth - 1) * COLUMN_SPACING + GATE_WIDTH + 90;
    var height = 52 + (row - 1) * ROW_SPACING + 36;
    var outputLabel = opts.out || 'Z';
    parts.push('<path class="wire" d="M' + root.x + ',' + root.y + ' H' + (width - 30) + '"/>' +
               '<text x="' + (width - 22) + '" y="' + (root.y + 5) + '" font-weight="700">' + outputLabel + '</text>');

    // The vertical bus line (and name) of each input.
    var buses = vars.map(function (v) {
      var bottom = lastTap[v] || 52;
      return '<path class="wire" d="M' + busX[v] + ',28 V' + bottom + '"/>' +
             '<text x="' + (busX[v] - 5) + '" y="18" font-weight="700">' + v + '</text>';
    }).join('');

    return '<svg class="pr-svg" viewBox="0 0 ' + width + ' ' + height + '" width="' + Math.min(width, 640) +
           '" role="img" aria-label="logic circuit">' + buses + parts.join('') + '</svg>';
  };


  /* ==========================================================================
     6. Drawing switch circuits (SVG)

     Series switches (one after another) act as AND; parallel branches (side
     by side) act as OR. Only AND/OR of input variables can be drawn.
     ========================================================================== */

  // One switch with its left terminal at (x, y): two contacts and a slanted blade, plus a label.
  function switchSymbol(x, y, label) {
    return '<path class="wire" d="M' + x + ',' + y + ' h18 M' + (x + 52) + ',' + y + ' h18"/>' +
           '<circle class="gate" cx="' + (x + 20) + '" cy="' + y + '" r="3"/>' +
           '<circle class="gate" cx="' + (x + 50) + '" cy="' + y + '" r="3"/>' +
           '<path class="wire" d="M' + (x + 21) + ',' + (y - 2) + ' L' + (x + 46) + ',' + (y - 16) + '"/>' +
           '<text x="' + (x + 30) + '" y="' + (y - 22) + '" font-weight="700" text-anchor="middle">' + label + '</text>';
  }

  // Draws the sub-network for `node` starting at (x, y), pushing SVG fragments
  // into `out`. Returns its size: width, and how far it extends above (`up`)
  // and below (`down`) the main wire at y.
  function drawNetwork(node, x, y, out) {
    if (node.t === 'var') {
      out.push(switchSymbol(x, y, node.n));
      return { w: 70, up: 26, down: 8 };
    }

    // AND: place the two sub-networks one after the other.
    if (node.t === 'bin' && node.op === 'and') {
      var first = drawNetwork(node.a, x, y, out);
      var second = drawNetwork(node.b, x + first.w, y, out);
      return {
        w: first.w + second.w,
        up: Math.max(first.up, second.up),
        down: Math.max(first.down, second.down)
      };
    }

    // OR: place the second sub-network on its own branch below the first.
    if (node.t === 'bin' && node.op === 'or') {
      var firstParts = [];
      var secondParts = [];
      var upper = drawNetwork(node.a, x + 10, y, firstParts);

      // How far below the first branch does the second need to sit? (Measure its height by drawing it offscreen.)
      var secondHeightAbove = drawNetwork(node.b, 0, 0, []).up;
      var offset = upper.down + 14 + secondHeightAbove;

      var lower = drawNetwork(node.b, x + 10, y + offset, secondParts);
      var width = Math.max(upper.w, lower.w) + 20;

      out.push(firstParts.join(''), secondParts.join(''));
      // Wires joining the two branches at the left and right ends.
      out.push('<path class="wire" d="M' + x + ',' + y + ' h10 M' + (x + 10 + upper.w) + ',' + y + ' H' + (x + width) +
               ' M' + x + ',' + (y + offset) + ' h10 M' + (x + 10 + lower.w) + ',' + (y + offset) + ' H' + (x + width) +
               ' M' + x + ',' + y + ' V' + (y + offset) + ' M' + (x + width) + ',' + y + ' V' + (y + offset) + '"/>');
      out.push('<circle class="dot" cx="' + x + '" cy="' + y + '" r="3"/>' +
               '<circle class="dot" cx="' + (x + width) + '" cy="' + y + '" r="3"/>');
      return { w: width, up: upper.up, down: offset + lower.down };
    }

    throw new Error('switch circuits only support AND/OR of inputs');
  }

  // Draws `ast` as a power source, a network of switches, and a light bulb in a loop.
  L.switchSVG = function (ast) {
    var parts = [];
    var left = 70;       // x where the switches start
    var top = 60;        // y of the top wire
    var size = drawNetwork(ast, left, top, parts);

    var bottom = top + size.down + 50;       // y of the return wire
    var right = left + size.w + 70;          // x of the right side (where the bulb sits)
    var middle = (top + bottom) / 2;

    // The loop of wire around the outside, with gaps for the battery (left) and the bulb (right).
    var loop = '<path class="wire" d="M' + (left + size.w) + ',' + top + ' H' + (right - 20) + ' V' + (middle - 22) +
               ' M' + (right - 20) + ',' + (middle + 22) + ' V' + bottom + ' H' + 30 + ' V' + (middle + 14) +
               ' M30,' + (middle - 14) + ' V' + top + ' H' + left + '"/>';
    var battery = '<path class="wire" d="M20,' + (middle - 14) + ' h20 M26,' + (middle - 6) + ' h8 M20,' + (middle + 6) +
                  ' h20 M26,' + (middle + 14) + ' h8"/>' +
                  '<text x="46" y="' + (middle + 4) + '" font-size="11">Power</text>';
    var bulb = '<circle class="gate" cx="' + (right - 20) + '" cy="' + middle + '" r="16"/>' +
               '<path class="wire" d="M' + (right - 30) + ',' + (middle - 10) + ' l20,20 M' + (right - 10) + ',' +
               (middle - 10) + ' l-20,20"/>';

    return '<svg class="pr-svg" viewBox="0 0 ' + (right + 10) + ' ' + (bottom + 10) + '" width="' +
           Math.min(right + 10, 560) + '" role="img" aria-label="switch circuit with a light bulb">' +
           loop + battery + parts.join('') + bulb + '</svg>';
  };


  /* ==========================================================================
     7. Truth-table helper for table questions
     ========================================================================== */

  // Builds `head` and `rows` for a 'table' question about a truth table.
  //   vars   input names
  //   outs   output columns the student fills in: [{ head, fn(env) -> 0|1 }, ...]
  //   o      options; { words: true } labels inputs "Open/Closed" and outputs
  //          "Off/On" (for switch circuits) instead of 0/1.
  L.ttQuestion = function (vars, outs, o) {
    o = o || {};
    var inputWords = o.words ? ['Open', 'Closed'] : ['0', '1'];
    var outputWords = o.words ? ['Off', 'On'] : ['0', '1'];

    var head = vars.map(function (v) { return o.words ? 'Switch ' + v : v; })
                   .concat(outs.map(function (c) { return c.head; }));

    var rows = L.rows(vars).map(function (env) {
      var cells = vars.map(function (v) { return inputWords[env[v]]; });
      outs.forEach(function (c) {
        cells.push({ kind: 'select', choices: outputWords, ans: outputWords[c.fn(env)] });
      });
      return cells;
    });

    return { head: head, rows: rows };
  };


  /* ==========================================================================
     8. The 'expr' question type: the student types a Boolean expression

       q.ast         one correct expression (also used to draw/print the answer)
       q.vars        the allowed input names
       q.truth       optional: the target output column (default: computed from q.ast)
       q.label       the output name shown before the "=" (default 'Z')
       q.answerText  optional text to fill in for "Show answer"

     The student's expression is graded by comparing truth tables, so any
     equivalent expression is accepted.
     ========================================================================== */
  P.types.expr = {
    render: function (q, body) {
      var input = U.el('input', {
        type: 'text', class: 'pr-wide', autocomplete: 'off', spellcheck: 'false',
        placeholder: q.placeholder || "e.g.  (A + B) · C'   or   !(A·B)"
      });
      var line = U.el('div');
      line.appendChild(document.createTextNode((q.label || 'Z') + ' = '));
      line.appendChild(input);

      var message = U.el('div', { class: 'pr-explain' });
      body.appendChild(line);
      body.appendChild(message);
      body.appendChild(U.el('div', { class: 'pr-explain' },
        '<small>Type AND as <code>·</code>, <code>*</code>, <code>.</code> or <code>AND</code>; OR as ' +
        '<code>+</code> or <code>OR</code>; NOT as <code>!A</code>, <code>A\'</code> or <code>NOT A</code>. ' +
        'Any equivalent expression is accepted.</small>'));

      var vars = q.vars;
      var target = q.truth || L.truth(q.ast, vars);

      return {
        grade: function () {
          input.classList.remove('pr-f-ok', 'pr-f-bad');
          message.innerHTML = '';

          var ast;
          try {
            ast = L.parse(input.value);
          } catch (e) {
            input.classList.add('pr-f-bad');
            return { ok: false, msg: e.message };
          }

          var unknown = L.varsOf(ast).filter(function (v) { return vars.indexOf(v) < 0; });
          if (unknown.length) {
            input.classList.add('pr-f-bad');
            return { ok: false, msg: 'Unknown input ' + unknown.join(', ') + '.' };
          }

          var got = L.truth(ast, vars);
          var ok = got.every(function (x, i) { return x === target[i]; });
          input.classList.add(ok ? 'pr-f-ok' : 'pr-f-bad');

          if (!ok) {
            // Point out the first row where the student's expression disagrees.
            var rows = L.rows(vars);
            var k = got.findIndex(function (x, i) { return x !== target[i]; });
            var inputs = vars.map(function (v) { return v + '=' + rows[k][v]; }).join(', ');
            message.innerHTML = 'Your expression gives <b>' + got[k] + '</b> when ' + inputs +
                                ', but the circuit gives <b>' + target[k] + '</b>.';
          }
          return { ok: ok };
        },

        reveal: function () {
          input.value = q.answerText || (q.ast ? L.text(q.ast) : '');
          input.classList.remove('pr-f-bad');
          input.classList.add('pr-f-ok');
          message.innerHTML = q.ast ? 'One correct answer: ' + L.html(q.ast) : '';
        }
      };
    }
  };


  /* ==========================================================================
     9. The logic sandbox widget

     A free-play box at the top of the gates section: type any expression and
     see it drawn as a circuit with its truth table.
     ========================================================================== */
  P.widgets.logicSandbox = function (box) {
    box.innerHTML = '<h4>Try it: expression → circuit → truth table</h4>' +
      '<p>Type any Boolean expression (inputs are single capital letters, e.g. <code>(A + B)·C</code> or ' +
      '<code>A\'·B + A·B\'</code>). Use it to check your own work on the problems below.</p>';

    var input = U.el('input', { type: 'text', class: 'pr-wide', value: "(A + B)·C'" });
    box.appendChild(input);
    var output = U.el('div');
    box.appendChild(output);

    // Re-parse and redraw whenever the text changes.
    function update() {
      try {
        var ast = L.parse(input.value);
        var vars = L.varsOf(ast);
        if (vars.length > 4) throw new Error('Use at most 4 different inputs.');

        var table = '<table class="pr-table"><thead><tr>' +
          vars.map(function (v) { return '<th>' + v + '</th>'; }).join('') + '<th>Z</th></tr></thead><tbody>' +
          L.rows(vars).map(function (env) {
            return '<tr>' + vars.map(function (v) { return '<td>' + env[v] + '</td>'; }).join('') +
                   '<td><b>' + L.evalAst(ast, env) + '</b></td></tr>';
          }).join('') + '</tbody></table>';

        output.innerHTML = '<p>Z = ' + L.html(ast) + '</p>' + L.circuitSVG(ast, vars, { labels: true }) + table;
      } catch (e) {
        output.innerHTML = '<em>' + esc(e.message) + '</em>';
      }
    }

    input.addEventListener('input', update);
    update();
  };
})();
