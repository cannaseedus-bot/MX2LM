/**
 * GENERATED FILE - DO NOT EDIT DIRECTLY.
 * Source: runtime/kql.ts
 * Regenerate with: npm run build:kql
 */

"use strict";
/**
 * K'UHUL Query Language (KQL)
 * --------------------------------------------
 * A minimal, deterministic implementation that
 * bridges Kuhul control flow with inference data.
 *
 * Components:
 *  - Lexer: converts glyph-rich text into tokens.
 *  - Parser: builds a typed AST with source locations.
 *  - Executor: runs statements against IndexedDB,
 *              handling tensors, RLHF, events, and vocab.
 *  - Compressor: SCXQ2-inspired compression helpers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KQLCompressor = exports.KQLExecutor = exports.KQLParser = exports.KQLLexer = void 0;
exports.initializeKQL = initializeKQL;
exports.createTokens = createTokens;
const SINGLE_GLYPHS = {
    "⟁": "BLOCK_START",
    "=": "EQUALS",
    "+": "PLUS",
    "-": "MINUS",
    "*": "STAR",
    "/": "SLASH",
    "%": "PERCENT",
    ">": "GT",
    "<": "LT",
    "(": "LPAREN",
    ")": "RPAREN",
    "[": "LBRACKET",
    "]": "RBRACKET",
    ",": "COMMA",
    ":": "COLON",
    ".": "DOT"
};
class KQLLexer {
    constructor(input) {
        this.position = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
        this.input = input;
    }
    tokenize() {
        while (this.position < this.input.length) {
            const current = this.input[this.position];
            if (/\s/.test(current)) {
                this.consumeWhitespace();
                continue;
            }
            const multiGlyph = this.checkMultiGlyph();
            if (multiGlyph) {
                this.tokens.push(multiGlyph);
                continue;
            }
            if (current in SINGLE_GLYPHS) {
                this.tokens.push({
                    type: SINGLE_GLYPHS[current],
                    value: current,
                    location: this.getLocation()
                });
                this.position += 1;
                this.column += 1;
                continue;
            }
            if (/\d/.test(current)) {
                this.tokens.push(this.consumeNumber());
                continue;
            }
            if (current === '"') {
                this.tokens.push(this.consumeString());
                continue;
            }
            if (/[a-zA-Z_]/.test(current)) {
                this.tokens.push(this.consumeIdentifier());
                continue;
            }
            if (/[+\-*/%=<>!&|]/.test(current)) {
                this.tokens.push(this.consumeOperator());
                continue;
            }
            throw new Error(`Unexpected character: ${current} at ${this.line}:${this.column}`);
        }
        return this.tokens;
    }
    getLocation() {
        return {
            start: { line: this.line, column: this.column },
            end: { line: this.line, column: this.column }
        };
    }
    consumeWhitespace() {
        while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
            const current = this.input[this.position];
            this.position += 1;
            this.column += 1;
            if (current === "\n") {
                this.line += 1;
                this.column = 1;
            }
        }
    }
    checkMultiGlyph() {
        const multiGlyphs = [
            { glyph: "⟁Xul⟁", type: "BLOCK_END" },
            { glyph: "⟁STORE⟁", type: "STORE" },
            { glyph: "⟁LOAD⟁", type: "LOAD" },
            { glyph: "⟁TENSOR⟁", type: "TENSOR" },
            { glyph: "⟁RLHF⟁", type: "RLHF" },
            { glyph: "⟁EVENTS⟁", type: "EVENTS" },
            { glyph: "⟁VOCAB⟁", type: "VOCAB" },
            { glyph: "⟁SHAPE⟁", type: "SHAPE" },
            { glyph: "⟁DTYPE⟁", type: "DTYPE" },
            { glyph: "⟁DATA⟁", type: "DATA" },
            { glyph: "⟁COMPRESS⟁", type: "COMPRESS" },
            { glyph: "⟁DECOMPRESS⟁", type: "DECOMPRESS" },
            { glyph: "⟁AS⟁", type: "AS" },
            { glyph: "⟁WHERE⟁", type: "WHERE" },
            { glyph: "⟁LIMIT⟁", type: "LIMIT" },
            { glyph: "⟁BETWEEN⟁", type: "BETWEEN" },
            { glyph: "⟁IF⟁", type: "IF" },
            { glyph: "⟁THEN⟁", type: "THEN" },
            { glyph: "⟁ELSE⟁", type: "ELSE" },
            { glyph: "⟁FOR⟁", type: "FOR" },
            { glyph: "⟁IN⟁", type: "IN" },
            { glyph: "⟁DO⟁", type: "DO" },
            { glyph: "⟁RETURN⟁", type: "RETURN" },
            { glyph: "⟁SLICE⟁", type: "SLICE" },
            { glyph: "⟁JOIN⟁", type: "JOIN" },
            { glyph: "⟁ON⟁", type: "ON" },
            { glyph: "⟁ANALYZE⟁", type: "ANALYZE" },
            { glyph: "⟁GROUP⟁", type: "GROUP" },
            { glyph: "⟁AGGREGATE⟁", type: "AGGREGATE" },
            { glyph: "⟁CORRELATE⟁", type: "CORRELATE" },
            { glyph: "⟁AND⟁", type: "AND" },
            { glyph: "⟁OR⟁", type: "OR" },
            { glyph: "⟁NOT⟁", type: "NOT" }
        ];
        for (const { glyph, type } of multiGlyphs) {
            if (this.input.slice(this.position, this.position + glyph.length) === glyph) {
                const token = {
                    type,
                    value: glyph,
                    location: this.getLocation()
                };
                this.position += glyph.length;
                this.column += glyph.length;
                return token;
            }
        }
        return null;
    }
    consumeNumber() {
        const start = this.position;
        const startLine = this.line;
        const startColumn = this.column;
        while (this.position < this.input.length && /\d/.test(this.input[this.position])) {
            this.position += 1;
            this.column += 1;
        }
        if (this.position < this.input.length && this.input[this.position] === ".") {
            this.position += 1;
            this.column += 1;
            while (this.position < this.input.length && /\d/.test(this.input[this.position])) {
                this.position += 1;
                this.column += 1;
            }
        }
        const value = this.input.slice(start, this.position);
        return {
            type: "NUMBER",
            value,
            location: {
                start: { line: startLine, column: startColumn },
                end: { line: this.line, column: this.column }
            }
        };
    }
    consumeString() {
        const startLine = this.line;
        const startColumn = this.column;
        this.position += 1;
        this.column += 1;
        const content = [];
        while (this.position < this.input.length && this.input[this.position] !== '"') {
            const current = this.input[this.position];
            if (current === "\n") {
                this.line += 1;
                this.column = 1;
            }
            else {
                this.column += 1;
            }
            content.push(current);
            this.position += 1;
        }
        if (this.position >= this.input.length) {
            throw new Error("Unterminated string literal");
        }
        this.position += 1;
        this.column += 1;
        return {
            type: "STRING",
            value: content.join(""),
            location: {
                start: { line: startLine, column: startColumn },
                end: { line: this.line, column: this.column }
            }
        };
    }
    consumeIdentifier() {
        const start = this.position;
        const startLine = this.line;
        const startColumn = this.column;
        while (this.position < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.position])) {
            this.position += 1;
            this.column += 1;
        }
        const value = this.input.slice(start, this.position);
        return {
            type: "IDENTIFIER",
            value,
            location: {
                start: { line: startLine, column: startColumn },
                end: { line: this.line, column: this.column }
            }
        };
    }
    consumeOperator() {
        const startLine = this.line;
        const startColumn = this.column;
        const twoChar = ["==", ">=", "<=", "!=", "&&", "||"];
        for (const op of twoChar) {
            if (this.input.slice(this.position, this.position + 2) === op) {
                this.position += 2;
                this.column += 2;
                return {
                    type: "OPERATOR",
                    value: op,
                    location: {
                        start: { line: startLine, column: startColumn },
                        end: { line: this.line, column: this.column }
                    }
                };
            }
        }
        const op = this.input[this.position];
        this.position += 1;
        this.column += 1;
        return {
            type: "OPERATOR",
            value: op,
            location: {
                start: { line: startLine, column: startColumn },
                end: { line: this.line, column: this.column }
            }
        };
    }
}
exports.KQLLexer = KQLLexer;
class KQLParser {
    constructor(tokens) {
        this.position = 0;
        this.tokens = tokens;
    }
    parse() {
        const body = [];
        while (this.position < this.tokens.length) {
            const statement = this.parseStatement();
            if (statement) {
                body.push(statement);
            }
            else {
                break;
            }
        }
        return { type: "Program", body };
    }
    parseStatement() {
        const current = this.tokens[this.position];
        if (!current)
            return null;
        switch (current.type) {
            case "STORE":
                return this.parseStoreStatement();
            case "LOAD":
                return this.parseLoadStatement();
            case "CORRELATE":
                return this.parseCorrelateStatement();
            case "COMPRESS":
                return this.parseCompressStatement();
            case "DECOMPRESS":
                return this.parseDecompressStatement();
            case "IF":
                return this.parseIfStatement();
            case "FOR":
                return this.parseForStatement();
            case "RETURN":
                return this.parseReturnStatement();
            default:
                return null;
        }
    }
    parseStoreStatement() {
        this.position += 1; // consume STORE
        const next = this.tokens[this.position];
        if (next.type === "TENSOR") {
            return this.parseStoreTensor();
        }
        if (next.type === "RLHF") {
            return this.parseStoreRLHF();
        }
        if (next.type === "EVENTS") {
            return this.parseStoreEvents();
        }
        if (next.type === "VOCAB") {
            return this.parseStoreVocab();
        }
        throw new Error(`Unexpected token after STORE: ${next.value}`);
    }
    parseStoreTensor() {
        this.position += 1; // consume TENSOR
        const name = this.parseIdentifier();
        const tensor = this.parseTensorDefinition();
        this.expect("AS");
        const target = this.parseIdentifier();
        return {
            type: "StoreTensor",
            name,
            tensor,
            target,
            location: this.mergeLocations(name.location, target.location)
        };
    }
    parseTensorDefinition() {
        this.expect("SHAPE");
        const shape = this.parseNumericArray();
        this.expect("DTYPE");
        const dtypeToken = this.tokens[this.position++];
        const dtype = dtypeToken.value;
        this.expect("DATA");
        const data = this.parseArrayLiteral().elements.map((element) => ({
            ...element,
            type: "Literal"
        }));
        let compression;
        if (this.tokens[this.position]?.type === "COMPRESS") {
            this.position += 1;
            compression = this.parseCompressionSpec();
        }
        return {
            type: "TensorDefinition",
            shape,
            dtype,
            data,
            compression,
            location: this.mergeLocations(dtypeToken.location, data[data.length - 1]?.location || dtypeToken.location)
        };
    }
    parseCompressionSpec() {
        const method = this.tokens[this.position++];
        let params;
        if (this.tokens[this.position]?.type === "LPAREN") {
            this.position += 1;
            params = this.parseKeyValuePairs();
            this.expect("RPAREN");
        }
        return {
            type: "CompressionSpec",
            method: method.value,
            params,
            location: this.mergeLocations(method.location, this.tokens[this.position - 1].location)
        };
    }
    parseKeyValuePairs() {
        const pairs = {};
        while (this.tokens[this.position]?.type !== "RPAREN") {
            const key = this.parseIdentifier();
            this.expect("COLON");
            const valueToken = this.tokens[this.position++];
            if (valueToken.type !== "NUMBER" && valueToken.type !== "STRING") {
                throw new Error("Expected number or string for compression parameter");
            }
            const value = valueToken.type === "NUMBER" ? Number(valueToken.value) : valueToken.value;
            pairs[key.name] = value;
            if (this.tokens[this.position]?.type === "COMMA") {
                this.position += 1;
            }
        }
        return pairs;
    }
    parseLoadStatement() {
        this.position += 1; // consume LOAD
        const next = this.tokens[this.position];
        if (next.type === "IDENTIFIER") {
            return this.parseLoadTensor();
        }
        if (next.type === "RLHF") {
            this.position += 1;
            return this.parseLoadRLHF();
        }
        if (next.type === "EVENTS") {
            this.position += 1;
            return this.parseLoadEvents();
        }
        if (next.type === "VOCAB") {
            this.position += 1;
            return this.parseLoadVocab();
        }
        throw new Error(`Unexpected token after LOAD: ${next.value}`);
    }
    parseLoadTensor() {
        const source = this.parseIdentifier();
        let where;
        let limit;
        while (this.position < this.tokens.length) {
            const token = this.tokens[this.position];
            if (token.type === "WHERE") {
                this.position += 1;
                where = this.parseExpression();
            }
            else if (token.type === "LIMIT") {
                this.position += 1;
                const limitToken = this.tokens[this.position++];
                limit = Number(limitToken.value);
            }
            else {
                break;
            }
        }
        return {
            type: "LoadTensor",
            source,
            where,
            limit,
            location: this.mergeLocations(source.location, this.tokens[this.position - 1].location)
        };
    }
    parseLoadRLHF() {
        const source = this.parseIdentifier();
        let where;
        if (this.tokens[this.position]?.type === "WHERE") {
            this.position += 1;
            where = this.parseExpression();
        }
        return {
            type: "LoadRLHF",
            source,
            where,
            location: this.mergeLocations(source.location, source.location)
        };
    }
    parseLoadEvents() {
        const eventType = this.parseIdentifier().name;
        let range;
        if (this.tokens[this.position]?.type === "BETWEEN") {
            this.position += 1;
            const [lower, upper] = this.parseNumericArray();
            range = [lower, upper];
        }
        return {
            type: "LoadEvents",
            eventType,
            timeRange: range,
            location: this.mergeLocations(this.tokens[this.position - 1].location, this.tokens[this.position - 1].location)
        };
    }
    parseLoadVocab() {
        const source = this.parseIdentifier();
        return { type: "LoadVocab", source, location: source.location };
    }
    parseCorrelateStatement() {
        this.position += 1;
        const left = this.parseIdentifier();
        this.expect("COMMA");
        const right = this.parseIdentifier();
        this.expect("ON");
        const leftField = this.parseIdentifier();
        this.expect("DOT");
        const leftKey = this.parseIdentifier();
        this.expect("EQUALS");
        const rightField = this.parseIdentifier();
        this.expect("DOT");
        const rightKey = this.parseIdentifier();
        let timeRange;
        if (this.tokens[this.position]?.type === "BETWEEN") {
            this.position += 1;
            const [lower, upper] = this.parseNumericArray();
            timeRange = [lower, upper];
        }
        let aggregates;
        if (this.tokens[this.position]?.type === "AGGREGATE") {
            this.position += 1;
            aggregates = this.parseAggregateList();
        }
        return {
            type: "CorrelateEvents",
            left,
            right,
            on: { left: leftKey, right: rightKey },
            timeRange,
            aggregates,
            location: this.mergeLocations(left.location, right.location)
        };
    }
    parseAggregateList() {
        const aggregates = [];
        while (this.position < this.tokens.length) {
            const funcToken = this.tokens[this.position++];
            if (funcToken.type !== "IDENTIFIER")
                break;
            this.expect("LPAREN");
            const argument = this.parseExpression();
            this.expect("RPAREN");
            let alias;
            if (this.tokens[this.position]?.type === "AS") {
                this.position += 1;
                alias = this.parseIdentifier();
            }
            aggregates.push({
                type: "AggregateExpression",
                function: funcToken.value,
                argument,
                alias,
                location: this.mergeLocations(funcToken.location, argument.location)
            });
            if (this.tokens[this.position]?.type !== "COMMA") {
                break;
            }
            this.position += 1;
        }
        return aggregates;
    }
    parseCompressStatement() {
        this.position += 1;
        const target = this.parseIdentifier();
        const method = this.parseCompressionSpec();
        return {
            type: "CompressStatement",
            target,
            method,
            location: this.mergeLocations(target.location, method.location)
        };
    }
    parseDecompressStatement() {
        this.position += 1;
        const target = this.parseIdentifier();
        return { type: "DecompressStatement", target, location: target.location };
    }
    parseStoreRLHF() {
        this.position += 1; // consume RLHF
        const fields = this.parseIdentifierList();
        const records = [];
        if (this.tokens[this.position]?.type === "DATA") {
            this.position += 1;
            const array = this.parseArrayLiteral();
            for (const element of array.elements) {
                if (element.type !== "ArrayExpression")
                    continue;
                const values = {};
                element.elements.forEach((value, index) => {
                    const field = fields[index];
                    values[field.name] = value;
                });
                records.push({ type: "RLHFRecord", values });
            }
        }
        return {
            type: "StoreRLHF",
            fields: fields.map((f) => ({ type: "RLHFField", name: f.name })),
            data: records,
            location: fields[0]?.location
        };
    }
    parseStoreEvents() {
        this.position += 1; // consume EVENTS
        const eventType = this.parseIdentifier().name;
        this.expect("DATA");
        const eventsArray = this.parseArrayLiteral();
        const data = eventsArray.elements.map((entry) => {
            if (entry.type !== "ArrayExpression") {
                throw new Error("Event payloads must be array expressions");
            }
            const payload = {};
            entry.elements.forEach((val, index) => {
                payload[`field_${index}`] = val;
            });
            return { type: "EventRecord", payload };
        });
        let compression;
        if (this.tokens[this.position]?.type === "COMPRESS") {
            this.position += 1;
            compression = this.parseCompressionSpec();
        }
        return {
            type: "StoreEvents",
            eventType,
            data,
            compression
        };
    }
    parseStoreVocab() {
        this.position += 1; // consume VOCAB
        const name = this.parseIdentifier();
        this.expect("DATA");
        const values = this.parseArrayLiteral().elements.map((element) => element);
        return { type: "StoreVocab", name, entries: values, location: name.location };
    }
    parseIdentifierList() {
        const identifiers = [];
        this.expect("LBRACKET");
        while (this.tokens[this.position]?.type !== "RBRACKET") {
            identifiers.push(this.parseIdentifier());
            if (this.tokens[this.position]?.type === "COMMA") {
                this.position += 1;
            }
        }
        this.expect("RBRACKET");
        return identifiers;
    }
    parseNumericArray() {
        const array = this.parseArrayLiteral();
        return array.elements.map((el) => el.type === "Literal" ? el.value : Number(el.value));
    }
    parseArrayLiteral() {
        const startToken = this.tokens[this.position];
        this.expect("LBRACKET");
        const elements = [];
        while (this.tokens[this.position]?.type !== "RBRACKET") {
            const expr = this.parseExpression();
            elements.push(expr);
            if (this.tokens[this.position]?.type === "COMMA") {
                this.position += 1;
            }
        }
        const endToken = this.tokens[this.position];
        this.expect("RBRACKET");
        return {
            type: "ArrayExpression",
            elements,
            location: this.mergeLocations(startToken.location, endToken.location)
        };
    }
    parseExpression() {
        return this.parseBinaryExpression();
    }
    parseBinaryExpression() {
        let left = this.parsePrimaryExpression();
        while (this.tokens[this.position]?.type === "OPERATOR") {
            const operator = this.tokens[this.position++].value;
            const right = this.parsePrimaryExpression();
            left = {
                type: "BinaryExpression",
                operator,
                left,
                right,
                location: this.mergeLocations(left.location, right.location)
            };
        }
        return left;
    }
    parsePrimaryExpression() {
        const token = this.tokens[this.position];
        switch (token.type) {
            case "NUMBER":
                this.position += 1;
                return { type: "Literal", value: Number(token.value), location: token.location };
            case "STRING":
                this.position += 1;
                return { type: "Literal", value: token.value, location: token.location };
            case "IDENTIFIER": {
                if (this.tokens[this.position + 1]?.type === "LPAREN") {
                    return this.parseFunctionCall();
                }
                this.position += 1;
                return { type: "Identifier", name: token.value, location: token.location };
            }
            case "LPAREN": {
                this.position += 1;
                const expr = this.parseExpression();
                this.expect("RPAREN");
                return expr;
            }
            case "LBRACKET":
                return this.parseArrayLiteral();
            case "OPERATOR": {
                const operator = token.value;
                if (operator === "-" || operator === "!") {
                    this.position += 1;
                    const argument = this.parsePrimaryExpression();
                    return {
                        type: "UnaryExpression",
                        operator,
                        argument,
                        location: this.mergeLocations(token.location, argument.location)
                    };
                }
            }
        }
        throw new Error(`Unexpected token in expression: ${token.type}`);
    }
    parseFunctionCall() {
        const callee = this.parseIdentifier();
        this.expect("LPAREN");
        const args = [];
        while (this.tokens[this.position]?.type !== "RPAREN") {
            args.push(this.parseExpression());
            if (this.tokens[this.position]?.type === "COMMA") {
                this.position += 1;
            }
        }
        this.expect("RPAREN");
        return {
            type: "FunctionCall",
            callee,
            arguments: args,
            location: this.mergeLocations(callee.location, args[args.length - 1]?.location || callee.location)
        };
    }
    parseIfStatement() {
        this.position += 1; // consume IF
        const test = this.parseExpression();
        this.expect("THEN");
        const consequent = this.parseBlock();
        let alternate;
        if (this.tokens[this.position]?.type === "ELSE") {
            this.position += 1;
            alternate = this.parseBlock();
        }
        return {
            type: "IfStatement",
            test,
            consequent,
            alternate,
            location: this.mergeLocations(test.location, (alternate || consequent).location)
        };
    }
    parseForStatement() {
        this.position += 1; // consume FOR
        const variable = this.parseIdentifier();
        this.expect("IN");
        const collection = this.parseExpression();
        this.expect("DO");
        const body = this.parseBlock();
        return {
            type: "ForStatement",
            variable,
            collection,
            body,
            location: this.mergeLocations(variable.location, body.location)
        };
    }
    parseBlock() {
        this.expect("BLOCK_START");
        const body = [];
        while (this.tokens[this.position]?.type !== "BLOCK_END") {
            const statement = this.parseStatement();
            if (!statement)
                break;
            body.push(statement);
        }
        this.expect("BLOCK_END");
        return { type: "BlockStatement", body };
    }
    parseReturnStatement() {
        this.position += 1;
        const argument = this.parseExpression();
        return { type: "ReturnStatement", argument, location: argument.location };
    }
    parseIdentifier() {
        const token = this.tokens[this.position++];
        if (token.type !== "IDENTIFIER") {
            throw new Error("Expected identifier");
        }
        return { type: "Identifier", name: token.value, location: token.location };
    }
    expect(type) {
        const token = this.tokens[this.position];
        if (!token || token.type !== type) {
            throw new Error(`Expected token ${type} but found ${token?.type ?? "EOF"}`);
        }
        this.position += 1;
    }
    mergeLocations(start, end) {
        return { start, end };
    }
}
exports.KQLParser = KQLParser;
function requestToPromise(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
function transactionDone(tx) {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}
class KQLExecutor {
    constructor(db) {
        this.env = {};
        this.db = db;
    }
    async execute(ast) {
        for (const statement of ast.body) {
            await this.executeStatement(statement);
        }
        return this.env;
    }
    async executeStatement(statement) {
        switch (statement.type) {
            case "StoreTensor":
                return this.executeStoreTensor(statement);
            case "LoadTensor":
                return this.executeLoadTensor(statement);
            case "StoreRLHF":
                return this.executeStoreRLHF(statement);
            case "LoadRLHF":
                return this.executeLoadRLHF(statement);
            case "StoreEvents":
                return this.executeStoreEvents(statement);
            case "LoadEvents":
                return this.executeLoadEvents(statement);
            case "CorrelateEvents":
                return this.executeCorrelateEvents(statement);
            case "StoreVocab":
                return this.executeStoreVocab(statement);
            case "LoadVocab":
                return this.executeLoadVocab(statement);
            case "CompressStatement":
                return this.executeCompressStatement(statement);
            case "DecompressStatement":
                return this.executeDecompressStatement(statement);
            case "IfStatement":
                return this.executeIfStatement(statement);
            case "ForStatement":
                return this.executeForStatement(statement);
            case "ReturnStatement":
                this.env["return"] = this.evaluateExpression(statement.argument, this.env);
                return;
            default:
                throw new Error(`Unsupported statement: ${statement.type}`);
        }
    }
    async executeStoreTensor(statement) {
        const tx = this.db.transaction("tensors", "readwrite");
        const store = tx.objectStore("tensors");
        const compressedData = KQLCompressor.compress(statement.tensor.data.map((literal) => literal.value), statement.tensor.compression?.method, statement.tensor.compression?.params);
        store.put({
            name: statement.target.name,
            shape: statement.tensor.shape,
            dtype: statement.tensor.dtype,
            compression: statement.tensor.compression,
            data: compressedData,
            metadata: statement.tensor.metadata || {}
        });
        await transactionDone(tx);
    }
    async executeLoadTensor(statement) {
        const tx = this.db.transaction("tensors", "readonly");
        const store = tx.objectStore("tensors");
        const tensor = await requestToPromise(store.get(statement.source.name));
        if (!tensor)
            throw new Error(`Tensor ${statement.source.name} not found`);
        const decompressed = KQLCompressor.decompress(tensor.data, tensor.compression?.method, tensor.compression?.params);
        this.env[statement.source.name] = { ...tensor, data: decompressed };
        await transactionDone(tx);
    }
    async executeStoreRLHF(statement) {
        const tx = this.db.transaction("rlhf", "readwrite");
        const store = tx.objectStore("rlhf");
        for (const record of statement.data) {
            const payload = {};
            for (const [key, literal] of Object.entries(record.values)) {
                payload[key] = literal.value;
            }
            store.put(payload);
        }
        await transactionDone(tx);
    }
    async executeLoadRLHF(statement) {
        const tx = this.db.transaction("rlhf", "readonly");
        const store = tx.objectStore("rlhf");
        const results = await requestToPromise(store.getAll());
        this.env[statement.source.name] = statement.where
            ? results.filter((entry) => this.evaluateExpression(statement.where, entry))
            : results;
        await transactionDone(tx);
    }
    async executeStoreEvents(statement) {
        const tx = this.db.transaction("events", "readwrite");
        const store = tx.objectStore("events");
        let events = statement.data;
        if (statement.compression?.method === "delta") {
            events = this.deltaEncodeEvents(events);
        }
        for (const event of events) {
            store.put({
                type: statement.eventType,
                timestamp: event.payload.timestamp?.value ?? Date.now(),
                payload: Object.fromEntries(Object.entries(event.payload).map(([key, literal]) => [key, literal.value])),
                compression: statement.compression
            });
        }
        await transactionDone(tx);
    }
    deltaEncodeEvents(events) {
        let previous = 0;
        return events.map((event) => {
            const tsLiteral = event.payload.timestamp;
            if (!tsLiteral || typeof tsLiteral.value !== "number")
                return event;
            const delta = tsLiteral.value - previous;
            previous = tsLiteral.value;
            return {
                ...event,
                payload: {
                    ...event.payload,
                    timestamp: { ...tsLiteral, value: delta }
                }
            };
        });
    }
    async executeLoadEvents(statement) {
        const tx = this.db.transaction("events", "readonly");
        const store = tx.objectStore("events");
        const index = store.index("timestamp");
        let cursor = await requestToPromise(index.openCursor());
        const results = [];
        let cumulative = 0;
        while (cursor) {
            const value = cursor.value;
            if (value.type === statement.eventType) {
                cumulative += value.timestamp;
                const withinRange = !statement.timeRange ||
                    (cumulative >= statement.timeRange[0] && cumulative <= statement.timeRange[1]);
                if (withinRange) {
                    if (value.compression?.method === "delta") {
                        value.payload.timestamp = cumulative;
                    }
                    results.push(value);
                }
            }
            cursor = await requestToPromise(cursor.continue());
        }
        this.env[`events_${statement.eventType}`] = results;
        await transactionDone(tx);
    }
    async executeCorrelateEvents(statement) {
        const leftEvents = this.env[`events_${statement.left.name}`] || [];
        const rightEvents = this.env[`events_${statement.right.name}`] || [];
        const correlated = leftEvents.flatMap((left) => rightEvents
            .filter((right) => {
            const leftValue = left.payload[statement.on.left.name];
            const rightValue = right.payload[statement.on.right.name];
            return Math.abs(leftValue - rightValue) <= 1000;
        })
            .map((right) => ({ left, right })));
        if (!statement.aggregates) {
            this.env.correlation_results = correlated;
            return;
        }
        const aggregated = statement.aggregates.map((agg) => {
            const values = correlated.map((pair) => this.evaluateExpression(agg.argument, { ...pair.left.payload, ...pair.right.payload }));
            const reduced = (() => {
                switch (agg.function) {
                    case "mean":
                        return values.reduce((a, b) => a + b, 0) / (values.length || 1);
                    case "sum":
                        return values.reduce((a, b) => a + b, 0);
                    case "count":
                        return values.length;
                    case "min":
                        return Math.min(...values);
                    case "max":
                        return Math.max(...values);
                }
            })();
            return { [agg.alias?.name || agg.function]: reduced };
        });
        this.env.correlation_results = aggregated;
    }
    async executeStoreVocab(statement) {
        const tx = this.db.transaction("vocabs", "readwrite");
        const store = tx.objectStore("vocabs");
        store.put({
            name: statement.name.name,
            entries: statement.entries.map((entry) => entry.value)
        });
        await transactionDone(tx);
    }
    async executeLoadVocab(statement) {
        const tx = this.db.transaction("vocabs", "readonly");
        const store = tx.objectStore("vocabs");
        const vocab = await requestToPromise(store.get(statement.source.name));
        if (!vocab)
            throw new Error(`Vocab ${statement.source.name} not found`);
        this.env[statement.source.name] = vocab.entries;
        await transactionDone(tx);
    }
    async executeCompressStatement(statement) {
        const target = this.env[statement.target.name];
        if (!target)
            throw new Error(`Target ${statement.target.name} not found in environment`);
        target.data = KQLCompressor.compress(target.data, statement.method.method, statement.method.params);
        target.compression = statement.method;
    }
    async executeDecompressStatement(statement) {
        const target = this.env[statement.target.name];
        if (!target)
            throw new Error(`Target ${statement.target.name} not found in environment`);
        if (!target.compression)
            return;
        target.data = KQLCompressor.decompress(target.data, target.compression.method, target.compression.params);
        delete target.compression;
    }
    async executeIfStatement(statement) {
        const condition = this.evaluateExpression(statement.test, this.env);
        if (condition) {
            await this.executeBlock(statement.consequent);
        }
        else if (statement.alternate) {
            await this.executeBlock(statement.alternate);
        }
    }
    async executeBlock(block) {
        for (const stmt of block.body) {
            await this.executeStatement(stmt);
        }
    }
    async executeForStatement(statement) {
        const collection = this.evaluateExpression(statement.collection, this.env);
        if (!Array.isArray(collection)) {
            throw new Error("FOR requires an iterable collection");
        }
        for (const item of collection) {
            this.env[statement.variable.name] = item;
            await this.executeBlock(statement.body);
        }
    }
    evaluateExpression(expr, context) {
        switch (expr.type) {
            case "Literal":
                return expr.value;
            case "Identifier":
                return context[expr.name];
            case "ArrayExpression":
                return expr.elements.map((el) => this.evaluateExpression(el, context));
            case "UnaryExpression": {
                const arg = this.evaluateExpression(expr.argument, context);
                if (expr.operator === "-")
                    return -arg;
                if (expr.operator === "!")
                    return !arg;
                throw new Error(`Unknown unary operator: ${expr.operator}`);
            }
            case "BinaryExpression": {
                const left = this.evaluateExpression(expr.left, context);
                const right = this.evaluateExpression(expr.right, context);
                switch (expr.operator) {
                    case "+":
                        return left + right;
                    case "-":
                        return left - right;
                    case "*":
                        return left * right;
                    case "/":
                        return left / right;
                    case "%":
                        return left % right;
                    case "==":
                        return left == right;
                    case "!=":
                        return left != right;
                    case ">":
                        return left > right;
                    case "<":
                        return left < right;
                    case ">=":
                        return left >= right;
                    case "<=":
                        return left <= right;
                    case "&&":
                        return left && right;
                    case "||":
                        return left || right;
                    default:
                        throw new Error(`Unknown operator: ${expr.operator}`);
                }
            }
            case "FunctionCall": {
                const args = expr.arguments.map((arg) => this.evaluateExpression(arg, context));
                switch (expr.callee.name.toUpperCase()) {
                    case "SUM":
                        return args.reduce((a, b) => a + b, 0);
                    case "MEAN":
                        return args.reduce((a, b) => a + b, 0) / args.length;
                    case "LENGTH":
                        return args[0]?.length ?? 0;
                    default:
                        if (typeof context[expr.callee.name] === "function") {
                            return context[expr.callee.name](...args);
                        }
                        throw new Error(`Unknown function: ${expr.callee.name}`);
                }
            }
        }
    }
}
exports.KQLExecutor = KQLExecutor;
class KQLCompressor {
    static compress(data, method, params = {}) {
        if (!method)
            return data;
        switch (method) {
            case "scxq2":
                return this.applySCXQ2(data);
            case "quantization":
                return this.applyQuantization(data, params);
            case "delta":
                return this.applyDeltaEncoding(data);
            case "sparse":
                return this.applySparseEncoding(data, params);
            default:
                throw new Error(`Unknown compression method: ${method}`);
        }
    }
    static decompress(data, method, params = {}) {
        if (!method)
            return data;
        switch (method) {
            case "scxq2":
                return this.scxq2Decompression(data);
            case "quantization":
                return this.quantizationDecompression(data, params);
            case "delta":
                return this.deltaDecompression(data);
            case "sparse":
                return this.sparseDecompression(data);
            default:
                throw new Error(`Unknown decompression method: ${method}`);
        }
    }
    static applySCXQ2(data) {
        const json = JSON.stringify(data);
        return new TextEncoder().encode(json);
    }
    static scxq2Decompression(data) {
        const json = new TextDecoder().decode(data);
        return JSON.parse(json);
    }
    static applyQuantization(data, params) {
        const bits = params.bits ?? 8;
        const scale = Math.pow(2, bits) - 1;
        const quantized = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i += 1) {
            quantized[i] = Math.round(data[i] * scale);
        }
        return quantized;
    }
    static quantizationDecompression(data, params) {
        const bits = params.bits ?? 8;
        const scale = Math.pow(2, bits) - 1;
        const result = new Float32Array(data.length);
        for (let i = 0; i < data.length; i += 1) {
            result[i] = data[i] / scale;
        }
        return result;
    }
    static applyDeltaEncoding(data) {
        const deltas = new Int32Array(data.length);
        let prev = 0;
        for (let i = 0; i < data.length; i += 1) {
            deltas[i] = data[i] - prev;
            prev = data[i];
        }
        return new Uint8Array(deltas.buffer);
    }
    static deltaDecompression(data) {
        const view = new Int32Array(data.buffer, data.byteOffset, data.length / Int32Array.BYTES_PER_ELEMENT);
        const output = [];
        let prev = 0;
        for (let i = 0; i < view.length; i += 1) {
            prev += view[i];
            output.push(prev);
        }
        return output;
    }
    static applySparseEncoding(data, params) {
        const threshold = params.threshold ?? 0.01;
        const indices = [];
        const values = [];
        for (let i = 0; i < data.length; i += 1) {
            if (Math.abs(data[i]) > threshold) {
                indices.push(i);
                values.push(data[i]);
            }
        }
        const payload = { indices, values, length: data.length, threshold };
        return new TextEncoder().encode(JSON.stringify(payload));
    }
    static sparseDecompression(data) {
        const payload = JSON.parse(new TextDecoder().decode(data));
        const output = new Array(payload.length).fill(0);
        payload.indices.forEach((idx, i) => {
            output[idx] = payload.values[i];
        });
        return output;
    }
}
exports.KQLCompressor = KQLCompressor;
async function initializeKQL(dbName = "KUHUL_DB", version = 1) {
    const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, version);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains("tensors")) {
                database.createObjectStore("tensors", { keyPath: "name" });
            }
            if (!database.objectStoreNames.contains("rlhf")) {
                database.createObjectStore("rlhf", { autoIncrement: true });
            }
            if (!database.objectStoreNames.contains("events")) {
                const events = database.createObjectStore("events", { keyPath: "id", autoIncrement: true });
                events.createIndex("timestamp", "timestamp", { unique: false });
            }
            if (!database.objectStoreNames.contains("vocabs")) {
                database.createObjectStore("vocabs", { keyPath: "name" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    return new KQLExecutor(db);
}
function createTokens(input) {
    return new KQLLexer(input).tokenize();
}
