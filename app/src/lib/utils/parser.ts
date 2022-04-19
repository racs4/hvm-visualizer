// Type
// ====

import { compose } from "./utils";

type State = { code: string; index: number };
type Parser<A> = (state: State) => [State, A];

// Skippers
// ========

// Skips "//..." comments
const skip_comment: Parser<boolean> = (state: State) => {
  var state = { ...state };
  var skips = state.code.slice(state.index, state.index + 2) === "//";
  if (skips) {
    state.index += 2;
    while (
      state.index < state.code.length &&
      !/\n/.test(state.code[state.index])
    ) {
      state.index += 1;
    }
  }
  return [state, skips];
};

// Skips whitespaces
const skip_spaces: Parser<boolean> = (state: State) => {
  var state = { ...state };
  var skips = /\s/.test(state.code[state.index]);
  while (/\s/.test(state.code[state.index])) {
    state.index += 1;
  }
  return [state, skips];
};

// Skips whitespaces and comments
const skip: Parser<boolean> = (state: State) => {
  var [state, comment] = skip_comment(state);
  var [state, spaces] = skip_spaces(state);
  if (comment || spaces) {
    var [state] = skip(state);
    return [state, true];
  } else {
    return [state, false];
  }
};

// Strings
// =======

// Attempts to match a string right after the cursor.
// If it matches, consume it and return true.
// Otherwise, return false.
function match_here(str: string): Parser<boolean> {
  return (state) => {
    if (state.code.slice(state.index, state.index + str.length) === str) {
      return [{ ...state, index: state.index + str.length }, true];
    } else {
      return [state, false];
    }
  };
}

// Attempts to match a string right after the cursor.
// If it matches, consume it and return true.
// Otherwise, return false.
function match_here_regex(regex: RegExp): Parser<boolean> {
  return (state) => {
    var matched = state.code.slice(state.index).match(regex);
    if (matched && matched.index === 0) {
      return [{ ...state, index: state.index + matched[0].length }, true];
    } else {
      return [state, false];
    }
  };
}

// Like match, but skipping spaces and comments before.
function match(matcher: string | RegExp): Parser<boolean> {
  return (state) => {
    var [state] = skip(state);
    if (typeof matcher === "string") {
      return match_here(matcher)(state);
    } else {
      return match_here_regex(matcher)(state);
    }
  };
}

// Forces consuming a string. If it fails, throws.
function consume(str: string): Parser<null> {
  return (state) => {
    var [state, matched] = match(str)(state);
    if (matched) {
      return [state, null];
    } else {
      var fail: Parser<null> = expected_string(str);
      return fail(state);
    }
  };
}

// Consumes one character. Returns it.

// Returns true if we are at the end of the file, skipping spaces and comments.

// Blocks
// ======

// Checks if a boolean parser returns true. If so, revert it and apply another
// parser. This is usually used to select parsing variants.
function guard<A>(head: Parser<boolean>, body: Parser<A>): Parser<A | null> {
  return (state) => {
    var [state] = skip(state);
    var [state, matched] = dry(head)(state);
    if (matched) {
      return body(state);
    } else {
      return [state, null];
    }
  };
}

// Attempts several `A | null` parsers, returning the first one that succeeds.
// If no parser succeeds, throws.
function grammar<A>(name: string, choices: Array<Parser<A | null>>): Parser<A> {
  return (state) => {
    for (var i = 0; i < choices.length; ++i) {
      var [state, got] = choices[i](state);
      if (got) {
        return [state, got];
      }
    }
    var fail: Parser<A> = expected_type(name);
    return fail(state);
  };
}

// Combinators
// ===========

// Evaluates a parser and returns its result, but reverts its effect.
function dry<A>(parser: Parser<A>): Parser<A> {
  return (state) => {
    var [, result] = parser(state);
    return [state, result];
  };
}

// Evaluates a parser until a condition is met. Returns an array of results.
function until<A>(delim: Parser<boolean>, parser: Parser<A>): Parser<Array<A>> {
  return (state) => {
    var [state, delimited] = delim(state);
    if (delimited) {
      return [state, []];
    } else {
      var [state, a] = parser(state);
      var [state, b] = until(delim, parser)(state);
      return [state, [a].concat(b)];
    }
  };
}

// Evaluates a list-like parser, with an opener, separator, and closer.

// Name
// ====

// Parses a name right after the parsing cursor.
const name_here: Parser<string> = (state) => {
  var state = { ...state };
  var name = "";
  while (
    state.index < state.code.length &&
    /[a-zA-Z0-9_.]|[+|\-|*|/|%|&|||^|<|>|=|!]/.test(state.code[state.index])
  ) {
    name += state.code[state.index];
    state.index += 1;
  }
  return [state, name];
};

// Parses a name after skipping.
const name0: Parser<string> = (state) => {
  var [state] = skip(state);
  return name_here(state);
};

// Parses a non-empty name after skipping.
const name1: Parser<string> = (state) => {
  var [state, name1] = name0(state);
  if (name1.length > 0) {
    return [state, name1];
  } else {
    var fail: Parser<string> = expected_type("name");
    return fail(state);
  }
};

// Parses a character right after the parsing cursor.
const char_here: Parser<string> = (state) => {
  var state = { ...state };
  var char = "";
  if (state.index < state.code.length) {
    char += state.code[state.index];
    state.index += 1;
  }
  return [state, char.charCodeAt(0).toString()];
};

// Errors
// ======

function expected_string<A>(str: string): Parser<A> {
  return (state) => {
    throw (
      "Expected '" +
      str +
      "':\n" +
      highlight(state.index, state.index + str.length, state.code)
    );
  };
}

function expected_type<A>(name: string): Parser<A> {
  return (state) => {
    throw (
      "Expected " +
      name +
      ":\n" +
      highlight(state.index, state.index + 1, state.code)
    );
  };
}

// Pretty highligts a slice of the code, between two given indexes.
function highlight(from_index: number, to_index: number, code: string): string {
  let open = "«";
  let close = "»";
  let open_color = "\x1b[4m\x1b[31m";
  let close_color = "\x1b[0m";
  let from_line = 0;
  let to_line = 0;
  for (let i = 0; i < from_index; ++i) {
    if (code[i] === "\n") ++from_line;
  }
  for (let i = 0; i < to_index; ++i) {
    if (code[i] === "\n") ++to_line;
  }
  let colored =
    code.slice(0, from_index) +
    open +
    code.slice(from_index, to_index) +
    close +
    code.slice(to_index);
  let lines = colored.split("\n");
  let block_from_line = Math.max(from_line - 3, 0);
  let block_to_line = Math.min(to_line + 3, lines.length);
  lines = lines.slice(block_from_line, block_to_line);
  let text = "";
  for (let i = 0; i < lines.length; ++i) {
    let numb = block_from_line + i;
    let line = lines[i] + "\n";
    if (numb === from_line && numb === to_line) {
      line =
        line.slice(0, line.indexOf(open)) +
        open_color +
        line.slice(line.indexOf(open), line.indexOf(close) + 1) +
        close_color +
        line.slice(line.indexOf(close) + 1);
    } else if (numb === from_line) {
      line =
        line.slice(0, line.indexOf(open)) +
        open_color +
        line.slice(line.indexOf(open)) +
        close_color;
    } else if (numb > from_line && numb < to_line) {
      line = open_color + line + close_color;
    } else if (numb === to_line) {
      line =
        open_color +
        line.slice(0, line.indexOf(close) + 1) +
        close_color +
        line.slice(line.indexOf(close) + 1);
    }
    line = ("    " + numb).slice(-4) + " | " + line;
    text += line;
  }
  return text;
}

// function maybe<A>(parser: Parser<A>): Parser<A | undefined> {
//   return (state) => {
//     parser(state);
//   }
//   let result = parser(state);
//   match result {
//     Ok((state, result)) => Ok((state, Some(result))),
//     Err(_) => Ok((state, None)),
//   }
// }

type HVMDebug = (HVMDebugTerm | HVMDebugDup)[];

type HVMDebugTerm = HVMDebugTermValue & { here: boolean };
type HVMDebugTermValue =
  | HVMDebugNode
  | HVMDebugName
  | HVMDebugNumber
  | HVMDebugLam
  | HVMDebugVar
  | HVMDebugSup;
type HVMDebugNode = {
  type: "Node";
  parent: HVMDebugTerm;
  children: HVMDebugTerm[];
};
type HVMDebugName = {
  type: "Name";
  name: string;
};
type HVMDebugNumber = {
  type: "Number";
  name: string;
};
type HVMDebugVar = {
  type: "Var";
  name: HVMDebugName;
};
type HVMDebugLam = {
  type: "Lam";
  name: string;
  body: HVMDebugTerm;
};
type HVMDebugSup = {
  type: "Sup";
  term1: HVMDebugTerm;
  term2: HVMDebugTerm;
};
type HVMDebugDup = {
  name1: HVMDebugTerm;
  name2: HVMDebugTerm;
  term: HVMDebugTerm;
  type: "Dup";
};

const hvm_debug_parser: Parser<HVMDebug> = (state) => {
  // parses a node (Ctr or App/Cal)
  const term_node: Parser<HVMDebugTermValue> = guard(match("("), (state) => {
    let [state1] = consume("(")(state);
    let [state2, parent] = term(state1);
    let [state3, children] = until(match(")"), term)(state2);
    return [state3, { parent, children: children, type: "Node" }];
  });

  // parses a list
  const term_items = (
    open: string,
    close: string,
    accName: string,
    emptyName: string,
    itemParser: Parser<HVMDebugTerm>
  ): Parser<HVMDebugTermValue> =>
    guard(match(open), (state) => {
      let [state1] = consume(open)(state);
      let [state2, terms] = until(match(close), (childState) => {
        let [childState1, termResult] = itemParser(childState);
        let [childState2] = match(",")(childState1);
        return [childState2, termResult];
      })(state1);

      let empty: HVMDebugTerm = {
        type: "Node",
        parent: { type: "Name", name: emptyName, here: false },
        children: [],
        here: false,
      };

      let list: HVMDebugTermValue = terms.reduceRight(
        (a: HVMDebugTerm, b: HVMDebugTerm) => ({
          type: "Node",
          parent: { type: "Name", name: accName, here: false },
          children: [b, a],
          here: false,
        }),
        empty
      );

      return [state2, list];
    });

  const term_list = term_items("[", "]", "Cons", "Nil", (state) => term(state));
  const term_str = term_items('"', '"', "StrCons", "StrNil", (state) => {
    let [state1, charCode] = char_here(state);
    let term: HVMDebugTerm = {
      type: "Var",
      name: { name: charCode, type: "Name" },
      here: false,
    };
    return [state1, term];
  });

  // parses a lambda
  const term_lam: Parser<HVMDebugTermValue> = guard(match("λ"), (state) => {
    let [state1] = consume("λ")(state);
    let [state2, name] = name1(state1);
    let [state3, body] = term(state2);
    return [state3, { name, body, type: "Lam" }];
  });

  // parses a name (Ctr names, Ope symbols, numbers, etc)
  const term_name: Parser<HVMDebugTermValue> = (state) => {
    let [new_state, name] = name1(state);
    let first_letter = name.charAt(0);

    // if starts with a number
    if (first_letter >= "0" && first_letter <= "0") {
      // return a number term
      return [new_state, { name, type: "Number" }];
    }
    // if starts with a capital letter or its a symbol
    else if (first_letter.toUpperCase() === first_letter) {
      // return it just as a name (for Ctr, App, Cal, Ope, etc)
      return [new_state, { name, type: "Name" }];
    } else {
      // else return as a variable
      return [new_state, { name: { name, type: "Name" }, type: "Var" }];
    }
  };

  const term_sup: Parser<HVMDebugTermValue> = guard(match("{"), (state) => {
    const [state1] = match("{")(state);
    const [state2, term1] = term(state1);
    const [state3, term2] = term(state2);
    const [state4] = match("}")(state3);
    return [state4, { term1, term2, type: "Sup" }];
  });

  const term: Parser<HVMDebugTerm> = (state) => {
    const [state1, here] = match("$")(state);
    const [state2, term] = grammar("DebugTerm", [
      term_list,
      term_str,
      term_node,
      term_lam,
      term_sup,
      term_name,
    ])(state1);

    return [state2, { here, ...term }];
  };

  const dup: Parser<HVMDebugDup> = guard(match("dup"), (state) => {
    const [state1] = match("dup")(state);
    const [state2, name1] = term(state1);
    const [state3, name2] = term(state2);
    const [state4] = match("=")(state3);
    const [state5, dup_term] = term(state4);
    const [state6] = match(";")(state5);
    return [state6, { name1, name2, term: dup_term, type: "Dup" }];
  });

  const hvm: Parser<HVMDebug> = until(
    match("\0"),
    grammar<HVMDebugDup | HVMDebugTerm>("HVMDebug", [dup, term])
  );

  return hvm(state);
};

// hvm_debug_parser_test();

// UTILS
// =========
const sep = /--+\n/;

export function removeFlattener(code: string[]): string[] {
  return code.filter((text) => text.match(/\.[0-9]+/) == null);
}

export function sanitize(code: string): string {
  return code
    .replace(sep, "")
    .replace(/Rewrites(.*)\n/, "")
    .replace(/Mem.Size(.*)\n\n/, "--\n");
}

function divide(code: string): string[] {
  return code.split(sep).map((str) => str + "\0");
}

// export
export const hvmDebugPreParser = compose(removeFlattener, divide, sanitize);
export const hvmDebugParser = (code: string) =>
  hvm_debug_parser({ code, index: 0 })[1];
