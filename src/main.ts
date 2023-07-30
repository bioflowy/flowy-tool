import { CWLObjectType } from "./types";
import path from 'path';
import fs from 'fs';

export function load_job_order(
    job_order_file: string,
):[CWLObjectType,string]{
    const json_str = fs.readFileSync(job_order_file, 'utf-8');
    const job_order = JSON.parse(json_str)
    const abs_job_order = path.resolve(job_order_file)
    const basedir = path.dirname(abs_job_order)
    return [job_order,basedir]
}