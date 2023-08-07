type StackState = "default" | "dollar" | "paren" | "brace" | "single_quote" | "double_quote" | "backslash";

class SubstitutionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SubstitutionError';
    }
}

export function scanner(scan: string): [number, number] | null {
    const DEFAULT: StackState = "default";
    const DOLLAR: StackState = "dollar";
    const PAREN: StackState = "paren";
    const BRACE: StackState = "brace";
    const SINGLE_QUOTE: StackState = "single_quote";
    const DOUBLE_QUOTE: StackState = "double_quote";
    const BACKSLASH: StackState = "backslash";

    let i = 0;
    let stack: StackState[] = [DEFAULT];
    let start = 0;

    while (i < scan.length) {
        const state = stack[stack.length - 1];
        const c = scan[i];

        switch(state) {
            case DEFAULT:
                if (c === "$") {
                    stack.push(DOLLAR);
                } else if (c === "\\") {
                    stack.push(BACKSLASH);
                }
                break;
            case BACKSLASH:
                stack.pop();
                if (stack[stack.length - 1] === DEFAULT) {
                    return [i - 1, i + 1];
                }
                break;
            case DOLLAR:
                if (c === "(") {
                    start = i - 1;
                    stack.push(PAREN);
                } else if (c === "{") {
                    start = i - 1;
                    stack.push(BRACE);
                } else {
                    stack.pop();
                    i -= 1;
                }
                break;
            case PAREN:
                if (c === "(") {
                    stack.push(PAREN);
                } else if (c === ")") {
                    stack.pop();
                    if (stack[stack.length - 1] === DOLLAR) {
                        return [start, i + 1];
                    }
                } else if (c === "'") {
                    stack.push(SINGLE_QUOTE);
                } else if (c === '"') {
                    stack.push(DOUBLE_QUOTE);
                }
                break;
            case BRACE:
                if (c === "{") {
                    stack.push(BRACE);
                } else if (c === "}") {
                    stack.pop();
                    if (stack[stack.length - 1] === DOLLAR) {
                        return [start, i + 1];
                    }
                } else if (c === "'") {
                    stack.push(SINGLE_QUOTE);
                } else if (c === '"') {
                    stack.push(DOUBLE_QUOTE);
                }
                break;

            case SINGLE_QUOTE:
                if (c === "'") {
                    stack.pop();
                } else if (c === "\\") {
                    stack.push(BACKSLASH);
                }
                break;
            case DOUBLE_QUOTE:
                if (c === '"') {
                    stack.pop();
                } else if (c === "\\") {
                    stack.push(BACKSLASH);
                }
                break;
        }
        i += 1;
    }

    if (stack.length > 1 && !(stack.length === 2 && (stack[1] === BACKSLASH || stack[1] === DOLLAR))) {
        throw new SubstitutionError(`Substitution error, unfinished block starting at position ${start}: '${scan.slice(start)}' stack was ${stack}`);
    }

    return null;
}

export function interpolate(
    scan: string,
    rootvars: any, // CWLObjectType in python, replace with the appropriate type
    jslib: string = "",
    fullJS: boolean = false,
    strip_whitespace: boolean = true,
    escaping_behavior: number = 2,
    js_engine: any = null, // JSEngine in python, replace with the appropriate type
    kwargs: any = {}
): any { // CWLOutputType in python, replace with the appropriate type
    if (strip_whitespace) {
        scan = scan.trim();
    }
    let parts: any[] = [];

    let w = scanner(scan);
    while (w) {
        parts.push(scan.slice(0, w[0]));

        if (scan[w[0]] === "$") {
            js_engine = js_engine || get_js_engine();
            let e = evaluator(
                js_engine, scan.slice(w[0] + 1, w[1]), rootvars, jslib, fullJS, kwargs
            );
            if (w[0] === 0 && w[1] === scan.length && parts.length <= 1) {
                return e;
            }

            let leaf = JSON.stringify(e);
            if (leaf[0] === '"') {
                leaf = JSON.parse(leaf);
            }
            parts.push(leaf);
        } else if (scan[w[0]] === "\\") {
            if (escaping_behavior === 1) {
                let e = scan[w[1] - 1];
                parts.push(e);
            } else if (escaping_behavior === 2) {
                let e = scan.slice(w[0], w[1] + 1);
                if (e === "\\$(" || e === "\\${") {
                    parts.push(e.slice(1));
                    w = [w[0], w[1] + 1];
                } else if (e[1] === "\\") {
                    parts.push("\\");
                } else {
                    parts.push(e.slice(0, 2));
                }
            } else {
                throw new Error(`Unknown escaping behavior ${escaping_behavior}`);
            }
        }
        scan = scan.slice(w[1]);
        w = scanner(scan);
    }
    parts.push(scan);
    return parts.join("");
}

import { JSEngine, CWLObjectType, CWLOutputType, WorkflowException, JavascriptException } from '<適切なパスまたはライブラリ名>'; // 対応するモジュールをインポートする必要があります。
import { inspect } from 'util';
import { isAsyncFunction } from '<適切なパスまたはライブラリ名>'; // この関数の実装が必要です。
import { runUntilComplete } from '<適切なパスまたはライブラリ名>'; // この関数の実装が必要です。

async function evaluator(
    jsEngine: JSEngine,
    ex: string,
    obj: CWLObjectType,
    jsLib: string,
    fullJS: boolean,
    kwargs?: any,
): Promise<CWLOutputType | null> {
    const match = paramRe.match(ex);
    let expressionParseException: WorkflowException | null = null;

    if (match !== null) {
        const firstSymbol = match[1];
        const firstSymbolEnd = match.index + firstSymbol.length;

        if (firstSymbolEnd + 1 === ex.length && firstSymbol === "null") {
            return null;
        }
        try {
            if (!(firstSymbol in obj)) {
                throw new WorkflowException(`${firstSymbol} is not defined`);
            }

            if (isAsyncFunction(jsEngine.regexEval)) {
                return await runUntilComplete<CWLOutputType>(
                    jsEngine.regexEval(
                        firstSymbol,
                        ex.slice(firstSymbolEnd, -1),
                        <CWLOutputType>obj[firstSymbol],
                        kwargs,
                    ),
                );
            } else {
                return <CWLOutputType>jsEngine.regexEval(
                    firstSymbol,
                    ex.slice(firstSymbolEnd, -1),
                    <CWLOutputType>obj[firstSymbol],
                    kwargs,
                );
            }
        } catch (werr) {
            if (werr instanceof WorkflowException) {
                expressionParseException = werr;
            }
        }
    }
    if (fullJS) {
        if (isAsyncFunction(jsEngine.eval)) {
            return await runUntilComplete<CWLOutputType>(
                jsEngine.eval(ex, jsLib, kwargs),
            );
        } else {
            return <CWLOutputType>jsEngine.eval(ex, jsLib, kwargs);
        }
    } else {
        if (expressionParseException !== null) {
            throw new JavascriptException(
                `Syntax error in parameter reference '${ex.slice(1, -1)}': ${expressionParseException}. This could be ` +
                "due to using Javascript code without specifying InlineJavascriptRequirement.",
            );
        } else {
            throw new JavascriptException(
                `Syntax error in parameter reference '${ex}'. This could be due ` +
                "to using Javascript code without specifying InlineJavascriptRequirement.",
            );
        }
    }
}
