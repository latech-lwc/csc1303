"""Test harness for the interactive "write code" practice problems.

Loaded by engine.js into Pyodide (Python running in the browser). It is also
unit-tested directly with CPython by the verification scripts.

`run_tests(student_source, tests_json)` returns a JSON string:
    {"syntax": null | "message", "results": [{"ok": bool, "label": str, "msg": str}]}

Each test is a dictionary with these optional keys:
  * label     - name shown next to the pass/fail mark
  * setup     - Python run before the student's code (e.g. to define a list)
  * stdin     - text the student's input() calls will read, one line per call
  * check     - Python expression evaluated after the student's code runs
  * expect    - Python literal compared with the value of `check`
  * expectOut - exact text the student's code should print (surrounding
                whitespace and trailing spaces on each line are ignored)
"""
import builtins
import io
import json
import sys

# Maximum number of traced events (roughly: lines/calls executed) before the
# student's program is stopped. This catches infinite loops.
MAX_STEPS = 400000


def _same(got, want):
    """Compare a result with the expected value.

    True and 1 are treated as different (a function that should return a
    Boolean must not return a number), and floats only need to agree to six
    decimal places.
    """
    if isinstance(got, bool) != isinstance(want, bool):
        return False
    if isinstance(got, float) or isinstance(want, float):
        try:
            return abs(got - want) < 1e-6
        except TypeError:
            return False
    return got == want


def _normalize_output(text):
    """Strip leading/trailing blank space and trailing spaces on each line."""
    return "\n".join(line.rstrip() for line in text.strip().splitlines())


def run_tests(student, tests_json):
    """Run the student's code once per test and report the results as JSON."""
    tests = json.loads(tests_json)

    # Report syntax errors once, up front, instead of once per test.
    try:
        compile(student, "<your code>", "exec")
    except SyntaxError as e:
        where = " (line %s)" % e.lineno if e.lineno else ""
        return json.dumps({"syntax": "SyntaxError: %s%s" % (e.msg, where), "results": []})

    results = []
    for test in tests:
        label = test.get("label", "")
        namespace = {"__name__": "__main__"}      # the student's code runs like a script
        printed = io.StringIO()                   # captures everything the code prints
        input_lines = iter(test.get("stdin", "").split("\n")) if test.get("stdin") is not None else iter(())
        real_stdout, real_input = sys.stdout, builtins.input

        def fake_input(prompt=""):
            # Prompts are not echoed, so expected output only needs what the
            # program prints itself.
            try:
                return next(input_lines)
            except StopIteration:
                raise EOFError("input() was called more times than expected")

        steps = [0]    # a list so the nested function below can change it

        def tracer(frame, event, arg):
            # Called by Python for every call/line/return while tracing is on.
            steps[0] += 1
            if steps[0] > MAX_STEPS:
                raise TimeoutError("your code ran for too long (is there an infinite loop?)")
            return tracer

        sys.stdout, builtins.input = printed, fake_input
        try:
            exec(test.get("setup", ""), namespace)

            # Only the student's own code is traced (not the setup or the checks).
            sys.settrace(tracer)
            try:
                exec(compile(student, "<your code>", "exec"), namespace)
            finally:
                sys.settrace(None)

            ok, msg = True, ""

            # Compare the value of an expression with what was expected.
            if "check" in test:
                got = eval(test["check"], namespace)
                want = eval(test["expect"], {})
                ok = _same(got, want)
                if not ok:
                    msg = "expected %r but got %r" % (want, got)

            # Compare what was printed.
            if ok and "expectOut" in test:
                got_output = _normalize_output(printed.getvalue())
                want_output = _normalize_output(test["expectOut"])
                if got_output != want_output:
                    ok = False
                    msg = "expected output %r but got %r" % (want_output, got_output)
        except BaseException as e:  # noqa: BLE001 - report any student error
            ok, msg = False, "%s: %s" % (type(e).__name__, e)
        finally:
            sys.stdout, builtins.input = real_stdout, real_input

        results.append({"ok": ok, "label": label, "msg": msg})

    return json.dumps({"syntax": None, "results": results})
