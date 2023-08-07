import ivm from 'isolated-vm';
import { CWLObjectType, CWLOutputType } from '../types';

type StackState = 'default' | 'dollar' | 'paren' | 'brace' | 'single_quote' | 'double_quote' | 'backslash';

class SubstitutionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SubstitutionError';
    }
}

export function scanner(scan: string): [number, number] | null {
    const DEFAULT: StackState = 'default';
    const DOLLAR: StackState = 'dollar';
    const PAREN: StackState = 'paren';
    const BRACE: StackState = 'brace';
    const SINGLE_QUOTE: StackState = 'single_quote';
    const DOUBLE_QUOTE: StackState = 'double_quote';
    const BACKSLASH: StackState = 'backslash';

    let i = 0;
    let stack: StackState[] = [DEFAULT];
    let start = 0;

    while (i < scan.length) {
        const state = stack[stack.length - 1];
        const c = scan[i];

        switch (state) {
            case DEFAULT:
                if (c === '$') {
                    stack.push(DOLLAR);
                } else if (c === '\\') {
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
                if (c === '(') {
                    start = i - 1;
                    stack.push(PAREN);
                } else if (c === '{') {
                    start = i - 1;
                    stack.push(BRACE);
                } else {
                    stack.pop();
                    i -= 1;
                }
                break;
            case PAREN:
                if (c === '(') {
                    stack.push(PAREN);
                } else if (c === ')') {
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
                if (c === '{') {
                    stack.push(BRACE);
                } else if (c === '}') {
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
                } else if (c === '\\') {
                    stack.push(BACKSLASH);
                }
                break;
            case DOUBLE_QUOTE:
                if (c === '"') {
                    stack.pop();
                } else if (c === '\\') {
                    stack.push(BACKSLASH);
                }
                break;
        }
        i += 1;
    }

    if (stack.length > 1 && !(stack.length === 2 && (stack[1] === BACKSLASH || stack[1] === DOLLAR))) {
        throw new SubstitutionError(
            `Substitution error, unfinished block starting at position ${start}: '${scan.slice(
                start
            )}' stack was ${stack}`
        );
    }

    return null;
}
function needs_parsing(snippet: any): boolean {
    return typeof snippet === 'string' && (snippet.includes('$(') || snippet.includes('${'));
}

export function do_eval(
    ex: CWLOutputType,
    jobinput: CWLObjectType,
    requirements: CWLObjectType[],
    outdir: string,
    tmpdir: string,
    resources: { [key: string]: number },
    context: CWLOutputType,
    strip_whitespace: boolean
): CWLOutputType {
    /** """
    Evaluate the given CWL expression, in context.

    :param timeout: The maximum number of seconds to wait while executing.
    """
    **/
    const runtime: { [key: string]: any } = { ...resources };
    runtime['tmpdir'] = tmpdir ?? null;
    runtime['outdir'] = outdir ?? null;

    const rootvars = { inputs: jobinput, self: context, runtime: runtime };

    if (typeof ex === 'string' && needs_parsing(ex)) {
        return interpolate(ex, rootvars, '', (strip_whitespace = strip_whitespace));
    } else {
        return ex;
    }
}

export function interpolate(
    scan: string,
    rootvars: any, // CWLObjectType in python, replace with the appropriate type
    jslib: string = '',
    strip_whitespace: boolean = true,
    escaping_behavior: number = 2,
    js_engine: any = null, // JSEngine in python, replace with the appropriate type
    kwargs: any = {}
): any {
    // CWLOutputType in python, replace with the appropriate type
    if (strip_whitespace) {
        scan = scan.trim();
    }
    let parts: any[] = [];

    let w = scanner(scan);
    while (w) {
        parts.push(scan.slice(0, w[0]));

        if (scan[w[0]] === '$') {
            let e = evaluator(scan.slice(w[0] + 1, w[1]), rootvars, jslib);
            if (w[0] === 0 && w[1] === scan.length && parts.length <= 1) {
                return e;
            }

            let leaf = JSON.stringify(e);
            if (leaf[0] === '"') {
                leaf = JSON.parse(leaf);
            }
            parts.push(leaf);
        } else if (scan[w[0]] === '\\') {
            if (escaping_behavior === 1) {
                let e = scan[w[1] - 1];
                parts.push(e);
            } else if (escaping_behavior === 2) {
                let e = scan.slice(w[0], w[1] + 1);
                if (e === '\\$(' || e === '\\${') {
                    parts.push(e.slice(1));
                    w = [w[0], w[1] + 1];
                } else if (e[1] === '\\') {
                    parts.push('\\');
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
    return parts.join('');
}

function evaluator(expr: string, obj: CWLObjectType, jsLib: string, kwargs?: any): CWLOutputType {
    const isolate = new ivm.Isolate({ memoryLimit: 128 });

    // 新しいContextを作成する
    const context = isolate.createContextSync();

    // Contextに基本的なconsole.log関数を注入する
    context.global.setSync('runtime', new ivm.ExternalCopy(obj).copyInto());

    // Contextにスクリプトを実行する
    const script = isolate.compileScriptSync(expr);
    const rslt = script.runSync(context);
    return rslt;
}
