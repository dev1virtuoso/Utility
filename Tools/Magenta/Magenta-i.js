class Magenta {
  constructor(codes) {
    this.codes = codes;
    this.symbolTable = {};
  }

  tokenize(code) {
    const tokens = [];
    let pos = 0;

    while (pos < code.length) {
      let char = code[pos];

      if (char === ' ' || char === '\n') {
        pos++;
        continue;
      }

      if (/[0-9\.]/.test(char)) {
        let numStr = '';
        while (/[0-9\.]/.test(char)) {
          numStr += char;
          char = code[++pos];
        }
        tokens.push(parseFloat(numStr));
        continue;
      }

      if (/[a-zA-Z]/.test(char)) {
        let word = '';
        while (/[a-zA-Z]/.test(char)) {
          word += char;
          char = code[++pos];
        }

        if (word === 'let' || word === 'print') {
          tokens.push(word);
        } else {
          tokens.push({ type: 'identifier', value: word });
        }
        continue;
      }

      if (char === '=') {
        if (tokens.length === 0 || typeof tokens[tokens.length - 1] !== 'object') {
          throw new Error('Invalid assignment');
        }
        tokens.push(char);
        pos++;
        continue;
      }

      if (/\+|\-|\*|\//.test(char)) {
        tokens.push(char);
        pos++;
        continue;
      }

      if (/\(|\)/.test(char)) {
        tokens.push(char);
        pos++;
        continue;
      }

      throw new Error(`Invalid character: ${char}`);
    }

    return tokens;
  }

  parse(tokens) {
    let pos = 0;

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

    function parseFactor() {
      let token = tokens[pos];

      if (typeof token === 'number') {
        pos++;
        return { type: 'number', value: token };
      } else if (token.type === 'identifier') {
        pos++;
        if (tokens[pos] === '=') {
          pos++;
          let value = parseExpression();
          this.symbolTable[token.value] = value;
          return token.value;
        } else {
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

    function execute(node) {
    }
  }
}
