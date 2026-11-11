/*
SPDX-FileCopyrightText: 2026 晨钟酱Official
SPDX-License-Identifier: GPL-3.0-only
See LICENSE for the full license text.
*/
import {GJ} from "./core.js";

const GJTransport = (() => {
  let loading;
  const endpoint = () => `${location.origin}/api`;
  async function request(path, data, {signal} = {}) {
    GJ.checkAbort(signal);
    const response = await fetch(endpoint()+path, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data||{}), signal
    });
    const result=await response.json().catch(()=>({error:'后端返回了无效响应'}));
    if(!response.ok||result.error)throw new Error(result.error||`后端请求失败（${response.status}）`);
    return result;
  }
  async function load(){return loading ||= request('/health',{});}
  async function devices(){return (await request('/devices',{})).devices||[];}
  function encode(bytes){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary);}
  function decode(value){const binary=atob(value),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;}
  class Driver {
    constructor({serial,label,mode}) {
      this.serial=serial;this.label=label||serial;this.mode=mode;this.connected=true;this.sessions=new Set();
      this.disconnected=new Promise(resolve=>this._disconnect=resolve);
    }
    async exec(command,{signal,onStdout,onStderr}={}) {
      const result=await request('/exec',{serial:this.serial,command},{signal});
      if(result.stdout)onStdout?.(result.stdout);if(result.stderr)onStderr?.(result.stderr);
      return result;
    }
    async captureFrame({signal}={}) {
      GJ.checkAbort(signal);
      const response=await fetch(endpoint()+'/frame',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serial:this.serial}),signal});
      if(!response.ok)throw new Error((await response.text())||`后端请求失败（${response.status}）`);
      return new Uint8Array(await response.arrayBuffer());
    }
    openCast({bitrate=8000000,fps=30,size,onData,onError,onClose}={}) {
      const url=new URL('/api/cast',location.href);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('serial',this.serial);url.searchParams.set('bitrate',String(bitrate));if(size)url.searchParams.set('size',size);
      let closing=false;const socket=new WebSocket(url);socket.binaryType='arraybuffer';socket.onmessage=event=>{if(closing)return;if(typeof event.data==='string'){try{const message=JSON.parse(event.data);if(message.type==='error')onError?.(new Error(message.error));}catch(error){onError?.(error);}}else{try{onData?.(new Uint8Array(event.data));}catch(error){onError?.(error);}}};socket.onerror=()=>{if(!closing)onError?.(new Error('H.264 投屏 WebSocket 连接失败，请检查后端服务'));};socket.onclose=event=>{if(!closing&&event.code!==1000&&event.code!==1005)onError?.(new Error(`H.264 投屏连接已断开（${event.code}${event.reason?`：${event.reason}`:''}）`));onClose?.();};return {sendControl:message=>{if(closing||socket.readyState!==WebSocket.OPEN)return false;try{socket.send(JSON.stringify({type:'control',action:message.type,x:message.x,y:message.y,x2:message.x2,y2:message.y2,duration:message.duration}));return true;}catch{return false;}},close:()=>{closing=true;if(socket.readyState===WebSocket.OPEN||socket.readyState===WebSocket.CONNECTING)socket.close(1000,'client stopped');}};
    }
    async openTerminal() {
      const url=new URL('/api/terminal',location.href);url.protocol=url.protocol==='https:'?'wss:':'ws:';
      url.searchParams.set('serial',this.serial);
      const socket=new WebSocket(url);socket.binaryType='arraybuffer';
      await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=()=>reject(new Error('终端 WebSocket 连接失败'));});
      let outputController,exitResolve,exitReject;
      const exited=new Promise((resolve,reject)=>{exitResolve=resolve;exitReject=reject;});
      const output=new ReadableStream({start(controller){outputController=controller;}});
      socket.onmessage=event=>{if(typeof event.data==='string'){const message=JSON.parse(event.data);if(message.type==='exit')exitResolve(message.code);else if(message.type==='error')exitReject(new Error(message.error));return;}outputController.enqueue(new Uint8Array(event.data));};
      socket.onclose=()=>{try{outputController.close();}catch{};this.sessions.delete(pty);};
      const pty={output,input:{
        getWriter(){return {write:bytes=>{socket.send(JSON.stringify({type:'input',data:encode(bytes)}));},releaseLock(){}};}
      },exited,resize(rows,cols){socket.send(JSON.stringify({type:'resize',rows,cols}));},kill(){socket.send(JSON.stringify({type:'kill'}));socket.close();}};
      this.sessions.add(pty);return pty;
    }
    async write(file,path,{signal,onProgress}={}) {
      const bytes=new Uint8Array(await file.arrayBuffer());GJ.checkAbort(signal);onProgress?.(0,bytes.length);
      await request('/push',{serial:this.serial,path,data:encode(bytes),name:file.name,lastModified:file.lastModified},{signal});onProgress?.(bytes.length,bytes.length);
    }
    async read(path,{signal,onProgress}={}) {
      const result=await request('/pull',{serial:this.serial,path},{signal}),bytes=decode(result.data);onProgress?.(bytes.length,bytes.length);
      return new Blob([bytes],{type:/\.png$/i.test(path)?'image/png':/\.apk$/i.test(path)?'application/vnd.android.package-archive':'application/octet-stream'});
    }
    async control(service,{signal}={}){return (await request('/control',{serial:this.serial,service},{signal})).output||'';}
    async reboot(mode){await request('/reboot',{serial:this.serial,mode});}
    async close(){if(!this.connected)return;this.connected=false;for(const session of this.sessions)await session.kill().catch(()=>{});this._disconnect?.();}
  }
  async function connect({mode='usb',target='',signal}={}) {
    const result=await request('/connect',{mode,target},{signal});
    return new Driver(result);
  }
  async function clearKeys(){return request('/clear-keys',{});}
  return {load,devices,connect,connectUsb:options=>connect({mode:'usb',...options}),connectWireless:options=>connect({mode:'wireless',...options}),clearKeys,Driver};
})();

export {GJTransport};
