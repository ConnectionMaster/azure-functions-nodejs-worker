import { AzureFunctionsRpcMessages as rpc } from '../azure-functions-language-worker-protobuf/src/rpc';
import { toTypedData, toRpcHttp } from './converters';

const returnBindingKey = "$return";

export class FunctionInfo {
  public name: string;
  public directory: string;
  public bindings: {
    [key: string]: rpc.IBindingInfo
  };
  public outputBindings: {
    [key: string]: rpc.IBindingInfo & { converter: (any) => rpc.ITypedData }
  };
  public httpOutputName: string;
  public hasHttpTrigger: boolean;

  constructor(metadata: rpc.IRpcFunctionMetadata) {
    this.name = <string>metadata.name;
    this.directory = <string>metadata.directory;
    this.bindings = {};
    this.outputBindings = {};
    this.httpOutputName = "";
    this.hasHttpTrigger = false;

    if (metadata.bindings) {
      let bindings = this.bindings = metadata.bindings;

      // determine output bindings & assign rpc converter (http has quirks)
      Object.keys(bindings)
        .filter(name => bindings[name].direction !== rpc.BindingInfo.Direction.in)
        .forEach(name => {
          let type = bindings[name].type;
          if (type && type.toLowerCase() === 'http') {
            this.httpOutputName = name;
            this.outputBindings[name] = Object.assign(bindings[name], { converter: toRpcHttp });
          } else {
            this.outputBindings[name] = Object.assign(bindings[name], { converter: toTypedData });
          }
        });
      
      this.hasHttpTrigger = Object.keys(bindings)
        .filter(name => {
          let type = bindings[name].type;
          return type && type.toLowerCase() === 'httptrigger';
        })
        .length > 0;
    }
  }

  /** 
   * Return output binding details on the special key "$return" output binding
   */
  public getReturnBinding() {
    return this.outputBindings[returnBindingKey];
  }

  public getTimerTriggerName(): string | undefined {
    for (let name in this.bindings) {
      let type = this.bindings[name].type;
      if (type && type.toLowerCase() === "timertrigger") {
        return name;
      }
    }
    return;
  }
}
