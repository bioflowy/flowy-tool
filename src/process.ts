// Classes and methods relevant for all CWL Process types.
import { Builder, bind_input } from "./builder";
import * as path from 'path';
import { LoadingContext } from "./loadingcontext";
import { RuntimeContext } from "./runtimecontext";
import { CWLObjectType, InputArray, InputBinding, InputParameter, InputRecord, compareInputBinding, convertToInputParameter } from "./types";
import { asList, deepClone, getRandomDir, visit_class } from "./utils";
import * as cwlTsAuto from 'cwl-ts-auto'
import { CommandLineJob, JobBase } from "./job";
import { PathMapper } from "./pathmapper";
import { v4 } from "uuid";
import { check_adjust } from "./commandlinetool";
// import abc
// import copy
// import functools
// import hashlib
// import json
// import logging
// import math
// import os
// import shutil
// import stat
// import textwrap
// import urllib.parse
// import uuid
// from os import scandir
// from typing
//  import (
//     TYPE_CHECKING,
//     Any,
//     Callable,
//     Dict,
//     Iterable,
//     Iterator,
//     List,
//     MutableMapping,
//     MutableSequence,
//     Optional,
//     Set,
//     Sized,
//     Tuple,
//     Type,
//     Union,
//     cast,
// )

// from cwl_utils import expression
// from importlib_resources import files
// from mypy_extensions import mypyc_attr
// from rdflib import Graph
// from ruamel.yaml.comments import CommentedMap, CommentedSeq
// from schema_salad.avro.schema import (
//     Names,
//     Schema,
//     SchemaParseException,
//     make_avsc_object,
// )
// from schema_salad.exceptions import ValidationException
// from schema_salad.ref_resolver import Loader, file_uri, uri_file_path
// from schema_salad.schema import load_schema, make_avro_schema, make_valid_avro
// from schema_salad.sourceline import SourceLine, strip_dup_lineno
// from schema_salad.utils import convert_to_dict
// from schema_salad.validate import avro_type_name, validate_ex

// from .builder import INPUT_OBJ_VOCAB, Builder
// from .context import LoadingContext, RuntimeContext, getdefault
// from .errors import UnsupportedRequirement, WorkflowException
// from .loghandler import _logger
// from .mpi import MPIRequirementName
// from .pathmapper import MapperEnt, PathMapper
// from .secrets import SecretStore
// from .stdfsaccess import StdFsAccess
// from .update import INTERNAL_VERSION, ORDERED_VERSIONS, ORIGINAL_CWLVERSION
// from .utils import (
//     CWLObjectType,
//     CWLOutputAtomType,
//     CWLOutputType,
//     HasReqsHints,
//     JobsGeneratorType,
//     LoadListingType,
//     OutputCallbackType,
//     adjustDirObjs,
//     aslist,
//     cmp_like_py2,
//     ensure_writable,
//     get_listing,
//     normalizeFilesDirs,
//     random_outdir,
//     visit_class,
// )
// from .validate_js import validate_js_expressions

// if TYPE_CHECKING:
//     from .cwlprov.provenance_profile import ProvenanceProfile

// class LogAsDebugFilter(logging.Filter):
//     def __init__(self, name: str, parent: logging.Logger) -> None:
//         """Initialize."""
//         name = str(name)
//         super().__init__(name)
//         self.parent = parent

//     def filter(self, record: logging.LogRecord) -> bool:
//         return self.parent.isEnabledFor(logging.DEBUG)

// _logger_validation_warnings = logging.getLogger("cwltool.validation_warnings")
// _logger_validation_warnings.setLevel(_logger.getEffectiveLevel())
// _logger_validation_warnings.addFilter(LogAsDebugFilter("cwltool.validation_warnings", _logger))

const supportedProcessRequirements = [
  "DockerRequirement",
  "SchemaDefRequirement",
  "EnvVarRequirement",
  "ScatterFeatureRequirement",
  "SubworkflowFeatureRequirement",
  "MultipleInputFeatureRequirement",
  "InlineJavascriptRequirement",
  "ShellCommandRequirement",
  "StepInputExpressionRequirement",
  "ResourceRequirement",
  "InitialWorkDirRequirement",
  "ToolTimeLimit",
  "WorkReuse",
  "NetworkAccess",
  "InplaceUpdateRequirement",
  "LoadListingRequirement",
  //   MPIRequirementName,
  "http://commonwl.org/cwltool#TimeLimit",
  "http://commonwl.org/cwltool#WorkReuse",
  "http://commonwl.org/cwltool#NetworkAccess",
  "http://commonwl.org/cwltool#LoadListingRequirement",
  "http://commonwl.org/cwltool#InplaceUpdateRequirement",
  "http://commonwl.org/cwltool#CUDARequirement",
];

const cwl_files = [
  "Workflow.yml",
  "CommandLineTool.yml",
  "CommonWorkflowLanguage.yml",
  "Process.yml",
  "Operation.yml",
  "concepts.md",
  "contrib.md",
  "intro.md",
  "invocation.md",
];

const salad_files = [
  "metaschema.yml",
  "metaschema_base.yml",
  "salad.md",
  "field_name.yml",
  "import_include.md",
  "link_res.yml",
  "ident_res.yml",
  "vocab_res.yml",
  "vocab_res.yml",
  "field_name_schema.yml",
  "field_name_src.yml",
  "field_name_proc.yml",
  "ident_res_schema.yml",
  "ident_res_src.yml",
  "ident_res_proc.yml",
  "link_res_schema.yml",
  "link_res_src.yml",
  "link_res_proc.yml",
  "vocab_res_schema.yml",
  "vocab_res_src.yml",
  "vocab_res_proc.yml",
];

// SCHEMA_CACHE: Dict[
//     str, Tuple[Loader, Union[Names, SchemaParseException], CWLObjectType, Loader]
// ] = {}
// SCHEMA_FILE: Optional[CWLObjectType] = None
// SCHEMA_DIR: Optional[CWLObjectType] = None
// SCHEMA_ANY: Optional[CWLObjectType] = None

// custom_schemas: Dict[str, Tuple[str, str]] = {}

// def use_standard_schema(version: str) -> None:
//     if version in custom_schemas:
//         del custom_schemas[version]
//     if version in SCHEMA_CACHE:
//         del SCHEMA_CACHE[version]

// def use_custom_schema(version: str, name: str, text: str) -> None:
//     custom_schemas[version] = (name, text)
//     if version in SCHEMA_CACHE:
//         del SCHEMA_CACHE[version]

// def get_schema(
//     version: str,
// ) -> Tuple[Loader, Union[Names, SchemaParseException], CWLObjectType, Loader]:
//     if version in SCHEMA_CACHE:
//         return SCHEMA_CACHE[version]

//     cache: Dict[str, Union[str, Graph, bool]] = {}
//     version = version.split("#")[-1]
//     if ".dev" in version:
//         version = ".".join(version.split(".")[:-1])
//     for f in cwl_files:
//         try:
//             res = files("cwltool").joinpath(f"schemas/{version}/{f}")
//             cache["https://w3id.org/cwl/" + f] = res.read_text("UTF-8")
//         except OSError:
//             pass

//     for f in salad_files:
//         try:
//             res = files("cwltool").joinpath(
//                 f"schemas/{version}/salad/schema_salad/metaschema/{f}",
//             )
//             cache["https://w3id.org/cwl/salad/schema_salad/metaschema/" + f] = res.read_text(
//                 "UTF-8"
//             )
//         except OSError:
//             pass

//     if version in custom_schemas:
//         cache[custom_schemas[version][0]] = custom_schemas[version][1]
//         SCHEMA_CACHE[version] = load_schema(custom_schemas[version][0], cache=cache)
//     else:
//         SCHEMA_CACHE[version] = load_schema(
//             "https://w3id.org/cwl/CommonWorkflowLanguage.yml", cache=cache
//         )

//     return SCHEMA_CACHE[version]

// def shortname(inputid: str) -> str:
//     d = urllib.parse.urlparse(inputid)
//     if d.fragment:
//         return d.fragment.split("/")[-1]
//     return d.path.split("/")[-1]

// def stage_files(
//     pathmapper: PathMapper,
//     stage_func: Optional[Callable[[str, str], None]] = None,
//     ignore_writable: bool = False,
//     symlink: bool = True,
//     secret_store: Optional[SecretStore] = None,
//     fix_conflicts: bool = False,
// ) -> None:
//     """
//     Link or copy files to their targets. Create them as needed.

//     :raises WorkflowException: if there is a file staging conflict
//     """
//     items = pathmapper.items() if not symlink else pathmapper.items_exclude_children()
//     targets: Dict[str, MapperEnt] = {}
//     for key, entry in items:
//         if "File" not in entry.type:
//             continue
//         if entry.target not in targets:
//             targets[entry.target] = entry
//         elif targets[entry.target].resolved != entry.resolved:
//             if fix_conflicts:
//                 # find first key that does not clash with an existing entry in targets
//                 # start with entry.target + '_' + 2 and then keep incrementing
//                 # the number till there is no clash
//                 i = 2
//                 tgt = f"{entry.target}_{i}"
//                 while tgt in targets:
//                     i += 1
//                     tgt = f"{entry.target}_{i}"
//                 targets[tgt] = pathmapper.update(key, entry.resolved, tgt, entry.type, entry.staged)
//             else:
//                 raise WorkflowException(
//                     "File staging conflict, trying to stage both %s and %s to the same target %s"
//                     % (targets[entry.target].resolved, entry.resolved, entry.target)
//                 )
//     # refresh the items, since we may have updated the pathmapper due to file name clashes
//     items = pathmapper.items() if not symlink else pathmapper.items_exclude_children()
//     for key, entry in items:
//         if not entry.staged:
//             continue
//         if not os.path.exists(os.path.dirname(entry.target)):
//             os.makedirs(os.path.dirname(entry.target))
//         if entry.type in ("File", "Directory") and os.path.exists(entry.resolved):
//             if symlink:  # Use symlink func if allowed
//                 os.symlink(entry.resolved, entry.target)
//             elif stage_func is not None:
//                 stage_func(entry.resolved, entry.target)
//         elif (
//             entry.type == "Directory"
//             and not os.path.exists(entry.target)
//             and entry.resolved.startswith("_:")
//         ):
//             os.makedirs(entry.target)
//         elif entry.type == "WritableFile" and not ignore_writable:
//             shutil.copy(entry.resolved, entry.target)
//             ensure_writable(entry.target)
//         elif entry.type == "WritableDirectory" and not ignore_writable:
//             if entry.resolved.startswith("_:"):
//                 os.makedirs(entry.target)
//             else:
//                 shutil.copytree(entry.resolved, entry.target)
//                 ensure_writable(entry.target, include_root=True)
//         elif entry.type == "CreateFile" or entry.type == "CreateWritableFile":
//             with open(entry.target, "w") as new:
//                 if secret_store is not None:
//                     new.write(cast(str, secret_store.retrieve(entry.resolved)))
//                 else:
//                     new.write(entry.resolved)
//             if entry.type == "CreateFile":
//                 os.chmod(entry.target, stat.S_IRUSR)  # Read only
//             else:  # it is a "CreateWritableFile"
//                 ensure_writable(entry.target)
//             pathmapper.update(key, entry.target, entry.target, entry.type, entry.staged)

// def relocateOutputs(
//     outputObj: CWLObjectType,
//     destination_path: str,
//     source_directories: Set[str],
//     action: str,
//     fs_access: StdFsAccess,
//     compute_checksum: bool = True,
//     path_mapper: Type[PathMapper] = PathMapper,
// ) -> CWLObjectType:
//     adjustDirObjs(outputObj, functools.partial(get_listing, fs_access, recursive=True))

//     if action not in ("move", "copy"):
//         return outputObj

//     def _collectDirEntries(
//         obj: Union[CWLObjectType, MutableSequence[CWLObjectType], None]
//     ) -> Iterator[CWLObjectType]:
//         if isinstance(obj, dict):
//             if obj.get("class") in ("File", "Directory"):
//                 yield obj
//             else:
//                 for sub_obj in obj.values():
//                     yield from _collectDirEntries(sub_obj)
//         elif isinstance(obj, MutableSequence):
//             for sub_obj in obj:
//                 yield from _collectDirEntries(sub_obj)

//     def _relocate(src: str, dst: str) -> None:
//         src = fs_access.realpath(src)
//         dst = fs_access.realpath(dst)

//         if src == dst:
//             return

//         # If the source is not contained in source_directories we're not allowed to delete it
//         src_can_deleted = any(os.path.commonprefix([p, src]) == p for p in source_directories)

//         _action = "move" if action == "move" and src_can_deleted else "copy"

//         if _action == "move":
//             _logger.debug("Moving %s to %s", src, dst)
//             if fs_access.isdir(src) and fs_access.isdir(dst):
//                 # merge directories
//                 for dir_entry in scandir(src):
//                     _relocate(dir_entry.path, fs_access.join(dst, dir_entry.name))
//             else:
//                 shutil.move(src, dst)

//         elif _action == "copy":
//             _logger.debug("Copying %s to %s", src, dst)
//             if fs_access.isdir(src):
//                 if os.path.isdir(dst):
//                     shutil.rmtree(dst)
//                 elif os.path.isfile(dst):
//                     os.unlink(dst)
//                 shutil.copytree(src, dst)
//             else:
//                 shutil.copy2(src, dst)

//     def _realpath(
//         ob: CWLObjectType,
//     ) -> None:  # should be type Union[CWLFile, CWLDirectory]
//         location = cast(str, ob["location"])
//         if location.startswith("file:"):
//             ob["location"] = file_uri(os.path.realpath(uri_file_path(location)))
//         elif location.startswith("/"):
//             ob["location"] = os.path.realpath(location)
//         elif not location.startswith("_:") and ":" in location:
//             ob["location"] = file_uri(fs_access.realpath(location))

//     outfiles = list(_collectDirEntries(outputObj))
//     visit_class(outfiles, ("File", "Directory"), _realpath)
//     pm = path_mapper(outfiles, "", destination_path, separateDirs=False)
//     stage_files(pm, stage_func=_relocate, symlink=False, fix_conflicts=True)

//     def _check_adjust(a_file: CWLObjectType) -> CWLObjectType:
//         a_file["location"] = file_uri(pm.mapper(cast(str, a_file["location"]))[1])
//         if "contents" in a_file:
//             del a_file["contents"]
//         return a_file

//     visit_class(outputObj, ("File", "Directory"), _check_adjust)

//     if compute_checksum:
//         visit_class(outputObj, ("File",), functools.partial(compute_checksums, fs_access))
//     return outputObj

// def cleanIntermediate(output_dirs: Iterable[str]) -> None:
//     for a in output_dirs:
//         if os.path.exists(a):
//             _logger.debug("Removing intermediate output directory %s", a)
//             shutil.rmtree(a, True)

// def add_sizes(fsaccess: StdFsAccess, obj: CWLObjectType) -> None:
//     if "location" in obj:
//         try:
//             if "size" not in obj:
//                 obj["size"] = fsaccess.size(cast(str, obj["location"]))
//         except OSError:
//             pass
//     elif "contents" in obj:
//         obj["size"] = len(cast(Sized, obj["contents"]))
//     return  # best effort

// def fill_in_defaults(
//     inputs: List[CWLObjectType],
//     job: CWLObjectType,
//     fsaccess: StdFsAccess,
// ) -> None:
//     """
//     For each missing input in the input object, copy over the default.

//     :raises WorkflowException: if a required input parameter is missing
//     """
//     debug = _logger.isEnabledFor(logging.DEBUG)
//     for e, inp in enumerate(inputs):
//         with SourceLine(inputs, e, WorkflowException, debug):
//             fieldname = shortname(cast(str, inp["id"]))
//             if job.get(fieldname) is not None:
//                 pass
//             elif job.get(fieldname) is None and "default" in inp:
//                 job[fieldname] = copy.deepcopy(inp["default"])
//             elif job.get(fieldname) is None and "null" in aslist(inp["type"]):
//                 job[fieldname] = None
//             else:
//                 raise WorkflowException(
//                     "Missing required input parameter '%s'" % shortname(cast(str, inp["id"]))
//                 )
export function fill_in_defaults(
  inputs: InputParameter[],
  job:CWLObjectType
//  , fsaccess: StdFsAccess,
) {
  /**
  For each missing input in the input object, copy over the default.

  :raises WorkflowException: if a required input parameter is missing
  """
  debug = _logger.isEnabledFor(logging.DEBUG)
  */
  for( const inp of inputs){
          const fieldname = inp.name
          if (!fieldname) {
            continue
          }
          if(job[fieldname]){
              continue
          }else if(!job[fieldname] && inp.default){
              job[fieldname] = deepClone(inp.default)
          }else if(!job[fieldname] &&  inp.hasType("null")){
              job[fieldname] = undefined
          }else{
              throw new Error(
                  `Missing required input parameter '${inp.name}'`)
            }
          }
        }

export function avroize_type(
    field_type: string |string[]| InputParameter,
    name_prefix: string = "",
) :string | InputRecord{
    //Add missing information to a type so that CWL types are valid."""
    // if isinstance(field_type, MutableSequence):
    //    for i, field in enumerate(field_type):
    //        field_type[i] = avroize_type(field, name_prefix)
    // el
    if (field_type instanceof InputRecord){
      if(field_type.fields){
        field_type.fields = field_type.fields.map(field=>avroize_type(field, name_prefix) as InputRecord)
      }
    }else if (field_type instanceof InputArray){
      if(field_type.items){
        field_type.items = avroize_type(field_type.items, name_prefix) as string
      }
    }else if ( field_type instanceof InputParameter){
      field_type.type = avroize_type(field_type.type, name_prefix)
    }else if(field_type instanceof Array){
      field_type = field_type.map(field=>{
        const type1 =avroize_type(field, name_prefix)
        if (typeof type1 !== "string"){
          throw new Error("unexpected type");
        }
        return type1 as string
      })
    }else if( field_type == "File"){
      return "org.w3id.cwl.cwl.File"
    }else if(field_type == "Directory"){
      return "org.w3id.cwl.cwl.Directory"
    }
    return field_type as string
}
// def get_overrides(overrides: MutableSequence[CWLObjectType], toolid: str) -> CWLObjectType:
//     """Combine overrides for the target tool ID."""
//     req: CWLObjectType = {}
//     if not isinstance(overrides, MutableSequence):
//         raise ValidationException("Expected overrides to be a list, but was %s" % type(overrides))
//     for ov in overrides:
//         if ov["overrideTarget"] == toolid:
//             req.update(ov)
//     return req

// _VAR_SPOOL_ERROR = textwrap.dedent(
//     """
//     Non-portable reference to /var/spool/cwl detected: '{}'.
//     To fix, replace /var/spool/cwl with $(runtime.outdir) or add
//     DockerRequirement to the 'requirements' section and declare
//     'dockerOutputDirectory: /var/spool/cwl'.
//     """
// )

// def var_spool_cwl_detector(
//     obj: CWLOutputType,
//     item: Optional[Any] = None,
//     obj_key: Optional[Any] = None,
// ) -> bool:
//     """Detect any textual reference to /var/spool/cwl."""
//     r = False
//     if isinstance(obj, str):
//         if "var/spool/cwl" in obj and obj_key != "dockerOutputDirectory":
//             _logger.warning(
//                 SourceLine(item=item, key=obj_key, raise_type=str).makeError(
//                     _VAR_SPOOL_ERROR.format(obj)
//                 )
//             )
//             r = True
//     elif isinstance(obj, MutableMapping):
//         for mkey, mvalue in obj.items():
//             r = var_spool_cwl_detector(cast(CWLOutputType, mvalue), obj, mkey) or r
//     elif isinstance(obj, MutableSequence):
//         for lkey, lvalue in enumerate(obj):
//             r = var_spool_cwl_detector(cast(CWLOutputType, lvalue), obj, lkey) or r
//     return r

// def eval_resource(
//     builder: Builder, resource_req: Union[str, int, float]
// ) -> Optional[Union[str, int, float]]:
//     if isinstance(resource_req, str) and expression.needs_parsing(resource_req):
//         result = builder.do_eval(resource_req)
//         if isinstance(result, float):
//             if ORDERED_VERSIONS.index(builder.cwlVersion) >= ORDERED_VERSIONS.index("v1.2.0-dev4"):
//                 return result
//             raise WorkflowException(
//                 "Floats are not valid in resource requirement expressions prior "
//                 f"to CWL v1.2: {resource_req} returned {result}."
//             )
//         if isinstance(result, (str, int)) or result is None:
//             return result
//         raise WorkflowException(
//             f"Got incorrect return type {type(result)} from resource expression evaluation of {resource_req}."
//         )
//     return resource_req

// # Threshold where the "too many files" warning kicks in
// FILE_COUNT_WARNING = 5000

export class Process {
  // Abstract CWL Process.
  tool:cwlTsAuto.CommandLineTool
  constructor(tool:cwlTsAuto.CommandLineTool, loadingContext: LoadingContext) {
    this.tool = tool
    // Build a Process object from the provided dictionary."""
    // super().__init__()
    // self.metadata: CWLObjectType = getdefault(loadingContext.metadata, {})
    // self.provenance_object: Optional["ProvenanceProfile"] = None
    // self.parent_wf: Optional["ProvenanceProfile"] = None
    // global SCHEMA_FILE, SCHEMA_DIR, SCHEMA_ANY  # pylint: disable=global-statement
    // if SCHEMA_FILE is None or SCHEMA_ANY is None or SCHEMA_DIR is None:
    //     get_schema("v1.0")
    //     SCHEMA_ANY = cast(
    //         CWLObjectType,
    //         SCHEMA_CACHE["v1.0"][3].idx["https://w3id.org/cwl/salad#Any"],
    //     )
    //     SCHEMA_FILE = cast(
    //         CWLObjectType,
    //         SCHEMA_CACHE["v1.0"][3].idx["https://w3id.org/cwl/cwl#File"],
    //     )
    //     SCHEMA_DIR = cast(
    //         CWLObjectType,
    //         SCHEMA_CACHE["v1.0"][3].idx["https://w3id.org/cwl/cwl#Directory"],
    //     )
    // self.names = make_avro_schema([SCHEMA_FILE, SCHEMA_DIR, SCHEMA_ANY], Loader({}))
    // self.tool = toolpath_object
    // debug = loadingContext.debug
    // self.requirements = copy.deepcopy(getdefault(loadingContext.requirements, []))
    // tool_requirements = self.tool.get("requirements", [])
    // if tool_requirements is None:
    //     raise SourceLine(self.tool, "requirements", ValidationException, debug).makeError(
    //         "If 'requirements' is present then it must be a list "
    //         "or map/dictionary, not empty."
    //     )
    // self.requirements.extend(tool_requirements)
    // if "id" not in self.tool:
    //     self.tool["id"] = "_:" + str(uuid.uuid4())
    // self.requirements.extend(
    //     cast(
    //         List[CWLObjectType],
    //         get_overrides(getdefault(loadingContext.overrides_list, []), self.tool["id"]).get(
    //             "requirements", []
    //         ),
    //     )
    // )
    // self.hints = copy.deepcopy(getdefault(loadingContext.hints, []))
    // tool_hints = self.tool.get("hints", [])
    // if tool_hints is None:
    //     raise SourceLine(self.tool, "hints", ValidationException, debug).makeError(
    //         "If 'hints' is present then it must be a list " "or map/dictionary, not empty."
    //     )
    // self.hints.extend(tool_hints)
    // # Versions of requirements and hints which aren't mutated.
    // self.original_requirements = copy.deepcopy(self.requirements)
    // self.original_hints = copy.deepcopy(self.hints)
    // self.doc_loader = loadingContext.loader
    // self.doc_schema = loadingContext.avsc_names
    // self.formatgraph: Optional[Graph] = None
    // if self.doc_loader is not None:
    //     self.formatgraph = self.doc_loader.graph
    // self.checkRequirements(self.tool, supportedProcessRequirements)
    // self.validate_hints(
    //     cast(Names, loadingContext.avsc_names),
    //     self.tool.get("hints", []),
    //     strict=getdefault(loadingContext.strict, False),
    // )
    // self.schemaDefs: MutableMapping[str, CWLObjectType] = {}
    // sd, _ = self.get_requirement("SchemaDefRequirement")
    // if sd is not None:
    //     sdtypes = copy.deepcopy(cast(MutableSequence[CWLObjectType], sd["types"]))
    //     avroize_type(cast(MutableSequence[CWLOutputType], sdtypes))
    //     av = make_valid_avro(
    //         sdtypes,
    //         {cast(str, t["name"]): cast(Dict[str, Any], t) for t in sdtypes},
    //         set(),
    //         vocab=INPUT_OBJ_VOCAB,
    //     )
    //     for i in av:
    //         self.schemaDefs[i["name"]] = i  # type: ignore
    //     make_avsc_object(convert_to_dict(av), self.names)
    // # Build record schema from inputs
    // self.inputs_record_schema: CWLObjectType = {
    //     "name": "input_record_schema",
    //     "type": "record",
    //     "fields": [],
    // }
    // self.outputs_record_schema: CWLObjectType = {
    //     "name": "outputs_record_schema",
    //     "type": "record",
    //     "fields": [],
    // }
    // for key in ("inputs", "outputs"):
    //     for i in self.tool[key]:
    //         c = copy.deepcopy(i)
    //         c["name"] = shortname(c["id"])
    //         del c["id"]
    //         if "type" not in c:
    //             raise ValidationException("Missing 'type' in parameter '{}'".format(c["name"]))
    //         if "default" in c and "null" not in aslist(c["type"]):
    //             nullable = ["null"]
    //             nullable.extend(aslist(c["type"]))
    //             c["type"] = nullable
    //         else:
    //             c["type"] = c["type"]
    //         c["type"] = avroize_type(c["type"], c["name"])
    //         if key == "inputs":
    //             cast(List[CWLObjectType], self.inputs_record_schema["fields"]).append(c)
    //         elif key == "outputs":
    //             cast(List[CWLObjectType], self.outputs_record_schema["fields"]).append(c)
    // with SourceLine(toolpath_object, "inputs", ValidationException, debug):
    //     self.inputs_record_schema = cast(
    //         CWLObjectType,
    //         make_valid_avro(self.inputs_record_schema, {}, set()),
    //     )
    //     make_avsc_object(convert_to_dict(self.inputs_record_schema), self.names)
    // with SourceLine(toolpath_object, "outputs", ValidationException, debug):
    //     self.outputs_record_schema = cast(
    //         CWLObjectType,
    //         make_valid_avro(self.outputs_record_schema, {}, set()),
    //     )
    //     make_avsc_object(convert_to_dict(self.outputs_record_schema), self.names)
    // self.container_engine = "docker"
    // if loadingContext.podman:
    //     self.container_engine = "podman"
    // elif loadingContext.singularity:
    //     self.container_engine = "singularity"
    // if toolpath_object.get("class") is not None and not getdefault(
    //     loadingContext.disable_js_validation, False
    // ):
    //     validate_js_options: Optional[Dict[str, Union[List[str], str, int]]] = None
    //     if loadingContext.js_hint_options_file is not None:
    //         try:
    //             with open(loadingContext.js_hint_options_file) as options_file:
    //                 validate_js_options = json.load(options_file)
    //         except (OSError, ValueError):
    //             _logger.error(
    //                 "Failed to read options file %s",
    //                 loadingContext.js_hint_options_file,
    //             )
    //             raise
    //     if self.doc_schema is not None:
    //         classname = toolpath_object["class"]
    //         avroname = classname
    //         if self.doc_loader and classname in self.doc_loader.vocab:
    //             avroname = avro_type_name(self.doc_loader.vocab[classname])
    //         validate_js_expressions(
    //             toolpath_object,
    //             self.doc_schema.names[avroname],
    //             validate_js_options,
    //             self.container_engine,
    //             loadingContext.eval_timeout,
    //         )
    // dockerReq, is_req = self.get_requirement("DockerRequirement")
    // if (
    //     dockerReq is not None
    //     and "dockerOutputDirectory" in dockerReq
    //     and is_req is not None
    //     and not is_req
    // ):
    //     _logger.warning(
    //         SourceLine(item=dockerReq, raise_type=str).makeError(
    //             "When 'dockerOutputDirectory' is declared, DockerRequirement "
    //             "should go in the 'requirements' section, not 'hints'."
    //             ""
    //         )
    //     )
    // if (
    //     dockerReq is not None
    //     and is_req is not None
    //     and dockerReq.get("dockerOutputDirectory") == "/var/spool/cwl"
    // ):
    //     if is_req:
    //         # In this specific case, it is legal to have /var/spool/cwl, so skip the check.
    //         pass
    //     else:
    //         # Must be a requirement
    //         var_spool_cwl_detector(self.tool)
    // else:
    //     var_spool_cwl_detector(self.tool)
  }

  _init_job(joborder: CWLObjectType, runtime_context: RuntimeContext): Builder {
    const input_record_schemas = this.tool.inputs.map(input => {
      const inputParameter = convertToInputParameter(input)
      avroize_type(inputParameter)
      return inputParameter
    })
  
    fill_in_defaults(input_record_schemas,joborder)
    const [bindings,files] = bind_input(new InputRecord({
      type:"record",
      fields: input_record_schemas
    })
      ,joborder,true)
    const baeCommand = asList(this.tool.baseCommand)
   if(baeCommand){
    baeCommand.forEach((command,index)=>{
        bindings.push({"position": [-1000000, index], "datum": command,separate:true})
      })
    }
    if(this.tool.arguments_){
      const arg_bindings = this.tool.arguments_.map((arg,index)=>{
        if("string" === typeof arg){
      //     elif ("$(" in arg) or ("${" in arg):
      //     cm = CommentedMap((("position", [0, i]), ("valueFrom", arg)))
      //     cm.lc.add_kv_line_col("valueFrom", lc)
      //     cm.lc.filename = filename
      //     bindings.append(cm)
      // else:
          return {datum:arg,"position":[0,index],separate:true}
        }else{
          const ib2 = arg as InputBinding
          const ib = {
            position:ib2.position,
            valueFrom:ib2.valueFrom,
            prefix:ib2.prefix,
            itemSeparator:ib2.itemSeparator,
            separate:ib2.separate??true,
          }
          if(ib.position){
              const position = ib.position
              if("string" === typeof position ){  // no need to test the
                  // TODO
                  // # CWLVersion as the v1.0
                  // # schema only allows ints
                  // position = builder.do_eval(position)
                  // if position is None:
                  //     position = 0
              }else if(position instanceof Array){
                ib.position = [...position, index]
              }else{
                ib.position = [position, index]
              }
  
            }else{
              ib.position = [0, index]
            }
            return ib
          }
        })
        bindings.push(...arg_bindings)
      }
    const new_bindings =   bindings.sort(compareInputBinding)
      
    return new Builder(joborder,files,new_bindings)
  }

  evalResources(builder: Builder, runtimeContext: RuntimeContext) {
    //-> Dict[str, Union[int, float]]:
    // resourceReq, _ = self.get_requirement("ResourceRequirement")
    // if resourceReq is None:
    //     resourceReq = {}
    // cwl_version = self.metadata.get(ORIGINAL_CWLVERSION, None)
    // if cwl_version == "v1.0":
    //     ram = 1024
    // else:
    //     ram = 256
    // request: Dict[str, Union[int, float, str]] = {
    //     "coresMin": 1,
    //     "coresMax": 1,
    //     "ramMin": ram,
    //     "ramMax": ram,
    //     "tmpdirMin": 1024,
    //     "tmpdirMax": 1024,
    //     "outdirMin": 1024,
    //     "outdirMax": 1024,
    // }
    // cudaReq, _ = self.get_requirement("http://commonwl.org/cwltool#CUDARequirement")
    // if cudaReq:
    //     request["cudaDeviceCountMin"] = 1
    //     request["cudaDeviceCountMax"] = 1
    // for rsc, a in (
    //     (resourceReq, "cores"),
    //     (resourceReq, "ram"),
    //     (resourceReq, "tmpdir"),
    //     (resourceReq, "outdir"),
    //     (cudaReq, "cudaDeviceCount"),
    // ):
    //     if rsc is None:
    //         continue
    //     mn = mx = None  # type: Optional[Union[int, float]]
    //     if rsc.get(a + "Min"):
    //         with SourceLine(rsc, f"{a}Min", WorkflowException, runtimeContext.debug):
    //             mn = cast(
    //                 Union[int, float],
    //                 eval_resource(builder, cast(Union[str, int, float], rsc[a + "Min"])),
    //             )
    //     if rsc.get(a + "Max"):
    //         with SourceLine(rsc, f"{a}Max", WorkflowException, runtimeContext.debug):
    //             mx = cast(
    //                 Union[int, float],
    //                 eval_resource(builder, cast(Union[str, int, float], rsc[a + "Max"])),
    //             )
    //     if mn is None:
    //         mn = mx
    //     elif mx is None:
    //         mx = mn
    //     if mn is not None:
    //         request[a + "Min"] = mn
    //         request[a + "Max"] = cast(Union[int, float], mx)
    // request_evaluated = cast(Dict[str, Union[int, float]], request)
    // if runtimeContext.select_resources is not None:
    //     # Call select resources hook
    //     return runtimeContext.select_resources(request_evaluated, runtimeContext)
    // defaultReq = {
    //     "cores": request_evaluated["coresMin"],
    //     "ram": math.ceil(request_evaluated["ramMin"]),
    //     "tmpdirSize": math.ceil(request_evaluated["tmpdirMin"]),
    //     "outdirSize": math.ceil(request_evaluated["outdirMin"]),
    // }
    // if cudaReq:
    //     defaultReq["cudaDeviceCount"] = request_evaluated["cudaDeviceCountMin"]
    // return defaultReq
  }

  checkRequirements(
    rec: any, //Union[MutableSequence[CWLObjectType], CWLObjectType, CWLOutputType, None],
    supported_process_requirements: string[]
  ) {
    ///Check the presence of unsupported requirements."""
    // if isinstance(rec, MutableMapping):
    //     if "requirements" in rec:
    //         debug = _logger.isEnabledFor(logging.DEBUG)
    //         for i, entry in enumerate(
    //             cast(MutableSequence[CWLObjectType], rec["requirements"])
    //         ):
    //             with SourceLine(rec["requirements"], i, UnsupportedRequirement, debug):
    //                 if cast(str, entry["class"]) not in supported_process_requirements:
    //                     raise UnsupportedRequirement(
    //                         f"Unsupported requirement {entry['class']}."
    //                     )
  }

  validate_hints(avsc_names: any, hints: any, strict: boolean) {
    // // Process the hints field.
    // if self.doc_loader is None:
    //     return
    // debug = _logger.isEnabledFor(logging.DEBUG)
    // for i, r in enumerate(hints):
    //     sl = SourceLine(hints, i, ValidationException, debug)
    //     with sl:
    //         classname = cast(str, r["class"])
    //         if classname == "http://commonwl.org/cwltool#Loop":
    //             raise ValidationException(
    //                 "http://commonwl.org/cwltool#Loop is valid only under requirements."
    //             )
    //         avroname = classname
    //         if classname in self.doc_loader.vocab:
    //             avroname = avro_type_name(self.doc_loader.vocab[classname])
    //         if avsc_names.get_name(avroname, None) is not None:
    //             plain_hint = {
    //                 key: r[key] for key in r if key not in self.doc_loader.identifiers
    //             }  # strip identifiers
    //             validate_ex(
    //                 cast(
    //                     Schema,
    //                     avsc_names.get_name(avroname, None),
    //                 ),
    //                 plain_hint,
    //                 strict=strict,
    //                 vocab=self.doc_loader.vocab,
    //             )
    //         elif r["class"] in ("NetworkAccess", "LoadListingRequirement"):
    //             pass
    //         else:
    //             _logger.info(str(sl.makeError("Unknown hint %s" % (r["class"]))))
    }
    job(job_order_object:CWLObjectType, runtime_context:RuntimeContext):JobBase{
      const builder = this._init_job(job_order_object, runtime_context);
      const outdir = "/tmp/"+getRandomDir();
      const stagedir = "/tmp/"+getRandomDir();
      const tmpdir = "/tmp/"+getRandomDir();
      const pathmapper = new PathMapper(stagedir,true,builder.files,runtime_context.basedir??"");
      function _check_adjust(obj:CWLObjectType) {
        check_adjust(pathmapper,builder,obj)
      }
      visit_class([builder.files, builder.bindings], ["File"], _check_adjust)
      return new CommandLineJob(pathmapper,builder,runtime_context.basedir??"", outdir,tmpdir,stagedir);
    }

  // def visit(self, op: Callable[[CommentedMap], None]) -> None:
  //     op(self.tool)

  // @abc.abstractmethod
  // def job(
  //     self,
  //     job_order: CWLObjectType,
  //     output_callbacks: Optional[OutputCallbackType],
  //     runtimeContext: RuntimeContext,
  // ) -> JobsGeneratorType:
  //     pass

  // def __str__(self) -> str:
  //     """Return the id of this CWL process."""
  //     return f"{type(self).__name__}: {self.tool['id']}"
}

// _names: Set[str] = set()

// def uniquename(stem: str, names: Optional[Set[str]] = None) -> str:
//     global _names
//     if names is None:
//         names = _names
//     c = 1
//     u = stem
//     while u in names:
//         c += 1
//         u = f"{stem}_{c}"
//     names.add(u)
//     return u

// def nestdir(base: str, deps: CWLObjectType) -> CWLObjectType:
//     dirname = os.path.dirname(base) + "/"
//     subid = cast(str, deps["location"])
//     if subid.startswith(dirname):
//         s2 = subid[len(dirname) :]
//         sp = s2.split("/")
//         sp.pop()
//         while sp:
//             loc = dirname + "/".join(sp)
//             nx = sp.pop()
//             deps = {
//                 "class": "Directory",
//                 "basename": nx,
//                 "listing": [deps],
//                 "location": loc,
//             }
//     return deps

// def mergedirs(
//     listing: MutableSequence[CWLObjectType],
// ) -> MutableSequence[CWLObjectType]:
//     r: List[CWLObjectType] = []
//     ents: Dict[str, CWLObjectType] = {}
//     for e in listing:
//         basename = cast(str, e["basename"])
//         if basename not in ents:
//             ents[basename] = e
//         elif e["location"] != ents[basename]["location"]:
//             raise ValidationException(
//                 "Conflicting basename in listing or secondaryFiles, '%s' used by both '%s' and '%s'"
//                 % (basename, e["location"], ents[basename]["location"])
//             )
//         elif e["class"] == "Directory":
//             if e.get("listing"):
//                 # name already in entries
//                 # merge it into the existing listing
//                 cast(List[CWLObjectType], ents[basename].setdefault("listing", [])).extend(
//                     cast(List[CWLObjectType], e["listing"])
//                 )
//     for e in ents.values():
//         if e["class"] == "Directory" and "listing" in e:
//             e["listing"] = cast(
//                 MutableSequence[CWLOutputAtomType],
//                 mergedirs(cast(List[CWLObjectType], e["listing"])),
//             )
//     r.extend(ents.values())
//     return r

// CWL_IANA = "https://www.iana.org/assignments/media-types/application/cwl"

// def scandeps(
//     base: str,
//     doc: Union[CWLObjectType, MutableSequence[CWLObjectType]],
//     reffields: Set[str],
//     urlfields: Set[str],
//     loadref: Callable[[str, str], Union[CommentedMap, CommentedSeq, str, None]],
//     urljoin: Callable[[str, str], str] = urllib.parse.urljoin,
//     nestdirs: bool = True,
// ) -> MutableSequence[CWLObjectType]:
//     """
//     Search for external files references in a CWL document or input object.

//     Looks for objects with 'class: File' or 'class: Directory' and
//     adds them to the list of dependencies.

//     :param base: the base URL for relative references.
//     :param doc: a CWL document or input object
//     :param urlfields: added as a File dependency
//     :param reffields: field name like a workflow step 'run'; will be
//       added as a dependency and also loaded (using the 'loadref'
//       function) and recursively scanned for dependencies.  Those
//       dependencies will be added as secondary files to the primary file.
//     :param nestdirs: if true, create intermediate directory objects when
//       a file is located in a subdirectory under the starting directory.
//       This is so that if the dependencies are materialized, they will
//       produce the same relative file system locations.
//     :returns: A list of File or Directory dependencies
//     """
//     r: MutableSequence[CWLObjectType] = []
//     if isinstance(doc, MutableMapping):
//         if "id" in doc:
//             if cast(str, doc["id"]).startswith("file://"):
//                 df, _ = urllib.parse.urldefrag(cast(str, doc["id"]))
//                 if base != df:
//                     r.append({"class": "File", "location": df, "format": CWL_IANA})
//                     base = df

//         if doc.get("class") in ("File", "Directory") and "location" in urlfields:
//             u = cast(Optional[str], doc.get("location", doc.get("path")))
//             if u and not u.startswith("_:"):
//                 deps: CWLObjectType = {
//                     "class": doc["class"],
//                     "location": urljoin(base, u),
//                 }
//                 if "basename" in doc:
//                     deps["basename"] = doc["basename"]
//                 if doc["class"] == "Directory" and "listing" in doc:
//                     deps["listing"] = doc["listing"]
//                 if doc["class"] == "File" and "secondaryFiles" in doc:
//                     deps["secondaryFiles"] = cast(
//                         CWLOutputAtomType,
//                         scandeps(
//                             base,
//                             cast(
//                                 Union[CWLObjectType, MutableSequence[CWLObjectType]],
//                                 doc["secondaryFiles"],
//                             ),
//                             reffields,
//                             urlfields,
//                             loadref,
//                             urljoin=urljoin,
//                             nestdirs=nestdirs,
//                         ),
//                     )
//                 if nestdirs:
//                     deps = nestdir(base, deps)
//                 r.append(deps)
//             else:
//                 if doc["class"] == "Directory" and "listing" in doc:
//                     r.extend(
//                         scandeps(
//                             base,
//                             cast(MutableSequence[CWLObjectType], doc["listing"]),
//                             reffields,
//                             urlfields,
//                             loadref,
//                             urljoin=urljoin,
//                             nestdirs=nestdirs,
//                         )
//                     )
//                 elif doc["class"] == "File" and "secondaryFiles" in doc:
//                     r.extend(
//                         scandeps(
//                             base,
//                             cast(MutableSequence[CWLObjectType], doc["secondaryFiles"]),
//                             reffields,
//                             urlfields,
//                             loadref,
//                             urljoin=urljoin,
//                             nestdirs=nestdirs,
//                         )
//                     )

//         for k, v in doc.items():
//             if k in reffields:
//                 for u2 in aslist(v):
//                     if isinstance(u2, MutableMapping):
//                         r.extend(
//                             scandeps(
//                                 base,
//                                 u2,
//                                 reffields,
//                                 urlfields,
//                                 loadref,
//                                 urljoin=urljoin,
//                                 nestdirs=nestdirs,
//                             )
//                         )
//                     else:
//                         subid = urljoin(base, u2)
//                         basedf, _ = urllib.parse.urldefrag(base)
//                         subiddf, _ = urllib.parse.urldefrag(subid)
//                         if basedf == subiddf:
//                             continue
//                         sub = cast(
//                             Union[MutableSequence[CWLObjectType], CWLObjectType],
//                             loadref(base, u2),
//                         )
//                         deps2: CWLObjectType = {
//                             "class": "File",
//                             "location": subid,
//                             "format": CWL_IANA,
//                         }
//                         sf = scandeps(
//                             subid,
//                             sub,
//                             reffields,
//                             urlfields,
//                             loadref,
//                             urljoin=urljoin,
//                             nestdirs=nestdirs,
//                         )
//                         if sf:
//                             deps2["secondaryFiles"] = cast(
//                                 MutableSequence[CWLOutputAtomType], mergedirs(sf)
//                             )
//                         if nestdirs:
//                             deps2 = nestdir(base, deps2)
//                         r.append(deps2)
//             elif k in urlfields and k != "location":
//                 for u3 in aslist(v):
//                     deps = {"class": "File", "location": urljoin(base, u3)}
//                     if nestdirs:
//                         deps = nestdir(base, deps)
//                     r.append(deps)
//             elif doc.get("class") in ("File", "Directory") and k in (
//                 "listing",
//                 "secondaryFiles",
//             ):
//                 # should be handled earlier.
//                 pass
//             else:
//                 r.extend(
//                     scandeps(
//                         base,
//                         cast(Union[MutableSequence[CWLObjectType], CWLObjectType], v),
//                         reffields,
//                         urlfields,
//                         loadref,
//                         urljoin=urljoin,
//                         nestdirs=nestdirs,
//                     )
//                 )
//     elif isinstance(doc, MutableSequence):
//         for d in doc:
//             r.extend(
//                 scandeps(
//                     base,
//                     d,
//                     reffields,
//                     urlfields,
//                     loadref,
//                     urljoin=urljoin,
//                     nestdirs=nestdirs,
//                 )
//             )

//     if r:
//         normalizeFilesDirs(r)

//     return r

// def compute_checksums(fs_access: StdFsAccess, fileobj: CWLObjectType) -> None:
//     if "checksum" not in fileobj:
//         checksum = hashlib.sha1()  # nosec
//         location = cast(str, fileobj["location"])
//         with fs_access.open(location, "rb") as f:
//             contents = f.read(1024 * 1024)
//             while contents != b"":
//                 checksum.update(contents)
//                 contents = f.read(1024 * 1024)
//         fileobj["checksum"] = "sha1$%s" % checksum.hexdigest()
//         fileobj["size"] = fs_access.size(location)
