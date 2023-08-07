import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { do_eval } from './expression';
describe('scan', () => {
    it('scan expression', async () => {
        const result = do_eval(
            '$(inputs.test)$("string")',
            { test: 123 },
            [],
            '/tmp/outdir',
            '/tmp/tmpdir',
            {},
            {},
            true
        );
        expect(result).toEr;
    });
});
