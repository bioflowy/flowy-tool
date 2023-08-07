def interpolate(
    scan: str,
    rootvars: CWLObjectType,
    jslib: str = "",
    fullJS: bool = False,
    strip_whitespace: bool = True,
    escaping_behavior: int = 2,
    js_engine: Optional[JSEngine] = None,
    **kwargs: Any,
) -> Optional[CWLOutputType]:
    """
    Interpolate and evaluate.

    Note: only call with convert_to_expression=True on CWL Expressions in $()
    form that need interpolation.
    """
    if strip_whitespace:
        scan = scan.strip()
    parts = []
    if convert_to_expression:
        dump = _convert_dumper
        parts.append("${return ")
    else:

        def dump(string: str) -> str:
            return string

    w = scanner(scan)
    while w:
        if convert_to_expression:
            parts.append(f'"{scan[0: w[0]]}" + ')  # noqa: B907
        else:
            parts.append(scan[0 : w[0]])

        if scan[w[0]] == "$":
            if not convert_to_expression:
                js_engine = js_engine or get_js_engine()
                e = evaluator(
                    js_engine, scan[w[0] + 1 : w[1]], rootvars, jslib, fullJS, **kwargs
                )
                if w[0] == 0 and w[1] == len(scan) and len(parts) <= 1:
                    return e

                leaf = json_dumps(e, sort_keys=True)
                if leaf[0] == '"':
                    leaf = json.loads(leaf)
                parts.append(leaf)
            else:
                parts.append(
                    "function(){var item ="
                    + scan[w[0] : w[1]][2:-1]
                    + '; if (typeof(item) === "string"){ return item; } '
                    "else { return JSON.stringify(item); }}() + "
                )
        elif scan[w[0]] == "\\":
            if escaping_behavior == 1:
                # Old behavior.  Just skip the next character.
                e = scan[w[1] - 1]
                parts.append(dump(e))
            elif escaping_behavior == 2:
                # Backslash quoting requires a three character lookahead.
                e = scan[w[0] : w[1] + 1]
                if e in ("\\$(", "\\${"):
                    # Suppress start of a parameter reference, drop the
                    # backslash.
                    parts.append(dump(e[1:]))
                    w = (w[0], w[1] + 1)
                elif e[1] == "\\":
                    # Double backslash, becomes a single backslash
                    parts.append(dump("\\"))
                else:
                    # Some other text, add it as-is (including the
                    # backslash) and resume scanning.
                    parts.append(dump(e[:2]))
            else:
                raise Exception("Unknown escaping behavior %s" % escaping_behavior)
        scan = scan[w[1] :]
        w = scanner(scan)
    if convert_to_expression:
        parts.append(f'"{scan}"')  # noqa: B907
        parts.append(";}")
    else:
        parts.append(scan)
    return "".join(parts)
