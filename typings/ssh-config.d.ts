declare module 'ssh-config' {
  export interface IParameter {
    param: string;
    value: string;
    config: IParameter[];
  }

  export function parse(raw: string): IParameter[];
}
