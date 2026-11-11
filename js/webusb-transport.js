/*
SPDX-FileCopyrightText: 2026 晨钟酱Official
SPDX-License-Identifier: GPL-3.0-only
See LICENSE for the full license text.
*/
import {GJ} from "./core.js";

const GJWebUsbTransport = (() => {
  let adbLib, streamLib, usbLib, CredentialStore, manager, loading;

  async function load() {
    if (loading) return loading;
    loading = (async () => {
      [adbLib, streamLib, usbLib, {default: CredentialStore}] = await Promise.all([
        import("./vendor/adb.js"),
        import("./vendor/stream-extra.js"),
        import("./vendor/adb-daemon-webusb.js"),
        import("./vendor/adb-credential-web.js")
      ]);
      const bytes = new Uint8Array([1]);
      if (streamLib.MaybeConsumable.getValue(new streamLib.Consumable(bytes)) !== bytes) {
        throw new Error('WebUSB 流依赖实例不一致');
      }
      manager = usbLib.AdbDaemonWebUsbDeviceManager.BROWSER;
      if (!manager) throw new Error('当前浏览器不支持 WebUSB，请使用 Chrome / Edge 并通过 HTTPS 或 localhost 打开');
    })();
    return loading;
  }

  async function devices() {
    return manager ? manager.getDevices() : [];
  }

  async function collect(readable, {limit = 768 * 1024 * 1024, onChunk} = {}) {
    const reader = readable.getReader(), chunks = [];
    let size = 0;
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.length;
        if (size > limit) throw new Error(`输出超过 ${Math.round(limit / 1048576)} MB，请缩小命令范围或停止长时间运行的命令`);
        chunks.push(value);
        onChunk?.(value);
      }
      return GJ.joinBytes(chunks);
    } finally {
      reader.releaseLock();
    }
  }

  class Driver {
    constructor(adb, {serial, label, closeOwned = async () => {}}) {
      this.adb = adb;
      this.serial = serial || adb.serial;
      this.label = label || this.serial;
      this.connected = true;
      this.closeOwned = closeOwned;
      this.sessions = new Set();
      this.disconnected = adb.disconnected.then(() => {
        this.connected = false;
      }, error => {
        this.connected = false;
        throw error;
      });
      this.disconnected.catch(() => {});
    }
    async openTerminal() {
      const shell = this.adb.subprocess.shellProtocol;
      const pty = shell ? await shell.pty({terminalType: 'xterm-256color'}) : await this.adb.subprocess.noneProtocol.pty();
      if (!this.connected) {
        await pty.kill();
        throw new Error('设备已断开');
      }
      this.sessions.add(pty);
      pty.exited.then(() => this.sessions.delete(pty), () => this.sessions.delete(pty));
      return pty;
    }
    async exec(command, {signal, onStdout, onStderr} = {}) {
      GJ.checkAbort(signal);
      const shell = this.adb.subprocess.shellProtocol;
      if (!shell) throw new Error('当前设备不支持 WebUSB Shell 协议');
      const proc = await shell.spawn(command, signal);
      const outDecoder = new TextDecoder(), errDecoder = new TextDecoder();
      const stdout = collect(proc.stdout, {onChunk: onStdout ? bytes => {
        const text = outDecoder.decode(bytes, {stream: true});
        if (text) onStdout(text);
      } : undefined});
      const stderr = collect(proc.stderr, {onChunk: onStderr ? bytes => {
        const text = errDecoder.decode(bytes, {stream: true});
        if (text) onStderr(text);
      } : undefined});
      try {
        const [out, err, exitCode] = await Promise.all([stdout, stderr, proc.exited, proc.stdin.close()]);
        const outEnd = outDecoder.decode(), errEnd = errDecoder.decode();
        if (outEnd) onStdout?.(outEnd);
        if (errEnd) onStderr?.(errEnd);
        return {stdout: new TextDecoder().decode(out), stderr: new TextDecoder().decode(err), exitCode};
      } catch (error) {
        await proc.kill().catch(() => {});
        throw error;
      }
    }
      async captureFrame({signal} = {}) {
        const shell = this.adb.subprocess.shellProtocol;
        if (!shell) throw new Error('当前设备不支持 WebUSB Shell 协议');
        const proc = await shell.spawn('screencap -p', signal);
        try {
          const bytes = await Promise.all([collect(proc.stdout, {limit: 32 * 1024 * 1024}), proc.exited, proc.stdin.close()]);
          if (bytes[1] !== 0) throw new Error('设备截屏失败');
          return bytes[0];
        } finally { await proc.kill().catch(() => {}); }
      }
      openCast() { throw new Error('网页端 WebADB 暂不支持 H.264 投屏，请切换到后端 ADB 控制'); }
    async withSync(work, signal) {
      GJ.checkAbort(signal);
      const sync = await this.adb.sync();
      this.sessions.add(sync);
      try {
        return await work(sync);
      } finally {
        this.sessions.delete(sync);
        await sync.dispose().catch(() => {});
      }
    }
    async write(file, path, {signal, onProgress} = {}) {
      return this.withSync(async sync => {
        let done = 0;
        const source = file.stream().pipeThrough(new TransformStream({
          transform(chunk, controller) {
            GJ.checkAbort(signal);
            done += chunk.length;
            onProgress?.(done, file.size);
            controller.enqueue(chunk);
          }
        }));
        await sync.write({filename: path, file: source, permission: 0o644, mtime: Math.floor((file.lastModified || Date.now()) / 1000)});
        onProgress?.(file.size, file.size);
      }, signal);
    }
    async read(path, {signal, onProgress} = {}) {
      return this.withSync(async sync => {
        let total = 0;
        try { total = Number((await sync.lstat(path)).size); } catch {}
        let done = 0;
        const bytes = await collect(sync.read(path), {onChunk: chunk => {
          GJ.checkAbort(signal);
          done += chunk.length;
          onProgress?.(done, total);
        }});
        return new Blob([bytes], {type: /\.png$/i.test(path) ? 'image/png' : /\.apk$/i.test(path) ? 'application/vnd.android.package-archive' : 'application/octet-stream'});
      }, signal);
    }
    async control(service) {
      if (!/^(?:tcpip:\d+|usb:|reboot:[\w-]*)$/.test(service)) throw new Error('无效的设备服务');
      const socket = await this.adb.createSocket(service);
      try { return new TextDecoder().decode(await collect(socket.readable, {limit: 1024 * 1024})); }
      finally { await socket.close().catch(() => {}); }
    }
    async reboot(mode) {
      if (mode === 'poweroff') {
        try { await this.exec('reboot -p'); } catch (error) { if (this.connected) throw error; }
        return;
      }
      const socket = await this.adb.createSocket(`reboot:${mode}`);
      await socket.close().catch(() => {});
    }
    async close() {
      if (!this.connected) return;
      this.connected = false;
      for (const session of this.sessions) await Promise.resolve(session.kill?.() || session.dispose?.()).catch(() => {});
      this.sessions.clear();
      try { await this.adb.close(); } finally { await this.closeOwned(); }
    }
  }

  async function authenticate(connection, serial, closeOwned, signal) {
    GJ.checkAbort(signal);
    let cancelled = false, rejectCancel;
    const cancelPromise = new Promise((_, reject) => { rejectCancel = reject; });
    const stop = () => {
      cancelled = true;
      void closeOwned().catch(() => {});
      rejectCancel(signal?.reason || new Error('认证超时，请在手机上允许 USB 调试后重试'));
    };
    const timer = setTimeout(stop, 60000);
    signal?.addEventListener('abort', stop, {once: true});
    const auth = adbLib.AdbDaemonTransport.authenticate({serial, connection, credentialStore: new CredentialStore('搞机工具箱')});
    auth.then(transport => { if (cancelled) void transport.close().catch(() => {}); }, () => {});
    try {
      const transport = await Promise.race([auth, cancelPromise]);
      GJ.checkAbort(signal);
      return new adbLib.Adb(transport);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', stop);
    }
  }

  async function connectUsb({device, signal} = {}) {
    const selected = device || await manager.requestDevice();
    if (!selected) throw new DOMException('未选择设备', 'AbortError');
    GJ.checkAbort(signal);
    const close = () => selected.raw.close();
    try {
      const connection = await selected.connect();
      const adb = await authenticate(connection, selected.serial, close, signal);
      return new Driver(adb, {serial: selected.serial, label: selected.name || selected.serial, closeOwned: close});
    } catch (error) {
      await close().catch(() => {});
      if (error.name === 'DeviceBusyError' || /already.*use|claim.*interface/i.test(error.message)) {
        throw new Error('当前 USB ADB 接口被占用，请关闭其他 WebADB 页面或 adb.exe');
      }
      throw error;
    }
  }

  return {load, devices, connectUsb};
})();

export {GJWebUsbTransport};
