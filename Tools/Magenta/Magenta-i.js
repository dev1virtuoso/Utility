// Copyright © 2024 Carson. All rights reserved.

class Magenta {
  constructor(codes) {
    this.codes = codes;
    this.symbolTable = {}; // symbol table for storing variables
  }

  // tokenize the code into tokens
  tokenize(code) {
    const tokens = [];
    let pos = 0;

    while (pos < code.length) {
      let char = code[pos];

      // if the current character is a space or a newline, skip it
      if (char === ' ' || char === '\n') {
        pos++;
        continue;
      }

      // if the current character is a number or a decimal point, read the whole number
      if (/[0-9\.]/.test(char)) {
        let numStr = '';
        while (/[0-9\.]/.test(char)) {
          numStr += char;
          char = code[++pos];
        }
        tokens.push(parseFloat(numStr));
        continue;
      }

      // if the current character is a letter, read the whole word
      if (/[a-zA-Z]/.test(char)) {
        let word = '';
        while (/[a-zA-Z]/.test(char)) {
          word += char;
          char = code[++pos];
        }

        // if it's a keyword, add it directly to the token array
        if (word === 'let' || word === 'print') {
          tokens.push(word);
        } else { // otherwise, treat it as a variable name
          tokens.push({ type: 'identifier', value: word });
        }
        continue;
      }

      // if the current character is an equal sign, check if it's an assignment statement
      if (char === '=') {
        if (tokens.length === 0 || typeof tokens[tokens.length - 1] !== 'object') {
          throw new Error('Invalid assignment');
        }
        tokens.push(char);
        pos++;
        continue;
      }

      // if the current character is a plus, minus, multiplication, or division sign, add it directly to the token array
      if (/\+|\-|\*|\//.test(char)) {
        tokens.push(char);
        pos++;
        continue;
      }

      // if the current character is a left or right parenthesis, add it directly to the token array
      if (/\(|\)/.test(char)) {
        tokens.push(char);
        pos++;
        continue;
      }

      // if the current character is none of the above symbols, throw an error
      throw new Error(`Invalid character: ${char}`);
    }

    return tokens;
  }

  // parse the tokens and execute the code
  parse(tokens) {
    let pos = 0;

    // parse the expression
    function parseExpression() {
      let left = parseTerm();

      while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
        let op = tokens[pos];
        pos++;
        let right = parseTerm();
        left = { type: 'binary', operator: op, left, right };
      }

      return left;
    }

    // parse the term
    function parseTerm() {
      let left = parseFactor();

      while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
        let op = tokens[pos];
        pos++;
        let right = parseFactor();
        left = { type: 'binary', operator: op, left, right };
      }

      return left;
    }

    // parse the factor
    function parseFactor() {
      let token = tokens[pos];

      if (typeof token === 'number') {
        pos++;
        return { type: 'number', value: token };
      } else if (token.type === 'identifier') {
        pos++;
        if (tokens[pos] === '=') { // if it's an assignment statement, store the variable in the symbol table and return the variable name
          pos++;
          let value = parseExpression();
          this.symbolTable[token.value] = value;
          return token.value;
        } else { // if it's a variable name, read the value from the symbol table and return it
          return this.symbolTable[token.value];
        }
      } else if (token === '(') {
        pos++;
        let expr = parseExpression();
        if (tokens[pos] !== ')') {
          throw new Error('Expecting closing parenthesis');
        }
        pos++;
        return expr;
      } else {
        throw new Error('Expecting number or identifier');
      }
    }

    // execute the code
    function execute(node) {
      // code execution logic
    }
  }
}
