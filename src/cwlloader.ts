import * as cwlTsAuto from 'cwl-ts-auto'

export async function loadDocument(path:string) {
    const doc = await cwlTsAuto.loadDocument(path)
    if (doc instanceof cwlTsAuto.CommandLineTool) {
        doc.inputs[0]
        return doc
    }
    throw new Error("Not a CommandLineTool")
}