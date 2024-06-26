> [!IMPORTANT]
> This project is considered deprecated and abandoned. It may not be actively maintained or updated. Please use it with caution and consider alternative solutions for your needs.

# Magenta Interpreter

Magenta Interpreter is a simple interpreter designed to parse and execute math-like expressions. It provides functionalities for lexical analysis (tokenize), syntax analysis (parse), and code execution (execute).

## License

The code in this repository is released under the [Mozilla Public License Version 2.0](https://www.mozilla.org/en-US/MPL/2.0/), an open-source license that governs the usage, modification, and distribution of the code. The license provides rights and responsibilities for users and contributors, ensuring the project remains accessible and transparent.

## Usage

Instantiate the `Magenta` class by providing the `codes` parameter, which represents the code to be interpreted. The interpreter supports variable storage using the `symbolTable` property.

`
const interpreter = new Magenta(codes);
`

### Tokenize

The `tokenize` method converts the input code string into a sequence of tokens. It traverses each character in the code string and converts it into the corresponding token based on its type (number, letter, operator, etc.). The tokens are stored in an array.

`
const tokens = interpreter.tokenize(code);
`

### Parse

The `parse` method performs syntax analysis on the obtained tokens and executes the code. It uses a recursive descent approach to parse expressions and build an abstract syntax tree. During the parsing process, it handles variable assignment statements by storing variables in the `symbolTable` and returning the variable names as expression results. It also handles operators such as addition, subtraction, multiplication, and division by constructing the corresponding abstract syntax tree nodes.

`
const result = interpreter.parse(tokens);
`

## Contact Information

If you have any questions or suggestions regarding this machine learning project, please feel free to contact me at [carson.developer1125@gmail.com](mailto:carson.developer1125@gmail.com).

Thank you for your interest to the project!
