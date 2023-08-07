
import { describe, expect, it } from "vitest";
import { get_image } from "./docker_utils";

describe('test docker get image', () => {
  
  it("docker pull",async ()=>{
    const rslt = await get_image("docker",{dockerPull:"docker.io/python:3-slim",required:true},true,true,"docker_tmp")
    expect(rslt).toBe(true)
  })
});
