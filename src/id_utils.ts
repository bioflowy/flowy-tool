import { v4 as uuidv4 } from 'uuid';

let mockNumber: number|undefined= undefined;

export function generateUuid(): string {
  if (mockNumber !== undefined) {
    return '00000000-0000-4000-8000-' + String(mockNumber++).padStart(12, '0');
  } else {
    return uuidv4();
  }
}

export function setMockNumber(id_num:number|undefined) {
    mockNumber = id_num
}

export function getRandomDir(): string {
    if(mockNumber !== undefined){
        return '/'+ String(mockNumber++).padStart(6, '0');
    }else{
        return '/' + makeId(6);
    }
}
  
  function makeId(length: number): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  