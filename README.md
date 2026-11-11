# 搞机工具箱 Web - 网页版 Android 玩机工具

## <p align="center"><a href="https://www.bilibili.com/video/BV1TB456ZEoo">使用教程</a>&emsp;&emsp;<a href="https://czjam.github.io/gjgjxweb/">在线体验</a>   </p>
《搞机工具箱》是一款 ADB 图形化工具。本仓库是基于原项目的后端代理改造版：由本机 Node.js 后端统一执行 ADB 请求，前端不再直接访问 USB ADB。

- 原项目：[CzJam/gjgjxweb](https://github.com/CzJam/gjgjxweb)
- 本项目：[Linger-1212/gjgjxweb-remote](https://github.com/Linger-1212/gjgjxweb-remote)

本项目保留原项目的页面布局和 Android 玩机功能，启动页可选择“后端 ADB”或原项目的“网页端 WebADB”控制。前者通过“浏览器前端 → 本机 Node.js 后端 → adb → Android 设备”执行，后者通过浏览器 WebUSB 直接连接设备。前端仍通过 [xterm.js](https://github.com/xtermjs/xterm.js) 提供交互式终端。

 [作者 @晨钟酱Official](https://space.bilibili.com/251013709)
 
 [官网: jamcz.com](https://jamcz.com)
 

## 功能

## 与原项目的不同

| 项目 | 原项目 | 本项目 |
| --- | --- | --- |
| ADB 执行位置 | 浏览器通过 WebUSB 直接连接 Android ADB | 可选浏览器 WebUSB，或本机 Node.js 后端调用系统 `adb` |
| 连接方式 | USB WebUSB | USB WebUSB、USB ADB、无线 ADB |
| 浏览器要求 | 需要支持 WebUSB 的 Chromium 浏览器 | WebUSB 方式需要 Chromium；后端方式使用现代浏览器即可 |
| 运行依赖 | 浏览器 WebUSB、Tango 浏览器端依赖 | WebUSB 方式无需后端；后端方式需要 Node.js、Platform Tools、`adb` |
| 终端通道 | 浏览器端 ADB PTY | 按开始页选择，使用浏览器端 PTY 或后端 WebSocket |
| 文件传输 | 浏览器直接进行 ADB Sync | 按开始页选择，使用浏览器端 Sync 或后端 `adb push/pull` |
| 服务端职责 | 仅提供静态页面 | 可选提供静态页面、本机 ADB API 和 WebSocket 终端 |
| 远程访问 | 不提供后端代理 | 后端默认只监听 `127.0.0.1`，不提供公网代理 |

除上述通信层和运行方式外，主页、软件管理、显示控制、系统界面、电池管理、脚本、终端和设置等主要功能保持原项目设计。

| 页面 | 主要功能 |
| --- | --- |
| 主页 | 设备与系统信息、CPU 频率、主板 ID 隐藏、重启、关机、重启至 Bootloader / Fastbootd / Recovery / EDL |
| 软件管理 | 包名与前台活动读取、启用/禁用、运行、强行停止、卸载与保留数据卸载、清除数据、软件信息、恢复系统软件、卸载锁定、操作记录、Google 套件批量管理 |
| 安装与文件传输 | APK 安装、拆分 APK 安装、推送文件、提取安装包 |
| 显示控制 | 分辨率、显示密度（DPI / dp）、按键模拟、截图、网页投屏与触控 |
| 系统界面 | 状态栏图标隐藏、时钟与快捷设置、沉浸模式、Wi-Fi 网络检测相关设置 |
| 电池管理 | 电池信息、电池参数模拟与恢复、定时统计、可选功率记录、CSV 导出 |
| 无极调节 | 字体大小倍数、窗口/过渡/程序动画倍率、自动锁屏时间 |
| 控机脚本 | 脚本编辑与导入导出、命令插入、文件关联、部分 BAT 语法解释执行 |
| ADB 终端 | Android Shell 交互会话、ANSI 显示、命令历史、补全、复制、清屏与中断 |
| 软件设置 | 默认启动页、主题配色、界面缩放、CPU 更新间隔、文件接收路径、安装与截图选项、设置导入导出 |

开始页提供 **后端 ADB** 与 **网页端 WebADB** 两种控制方式。后端方式支持 USB 有线和无线 ADB；网页端方式使用 Chrome / Edge 的 WebUSB 直接连接 USB 设备。功能是否生效取决于设备的 Android 版本、ROM 和 ADB Shell 权限。进入 Fastboot 的按钮仅发送重启命令，本工具暂不提供 Fastboot 刷机功能。

## 快速开始

### 使用条件

- 安装 Android SDK Platform Tools，并确保 `adb` 已加入 PATH（也可以设置 `ADB_PATH` 指向 adb 可执行文件）。
- USB 模式：手机开启开发者选项和 USB 调试，使用 USB 数据线连接电脑。
- 无线模式：手机开启无线调试，或先使用 `adb connect <手机IP>:5555` 配对/连接。
- 通过本机 `localhost` / `127.0.0.1` 访问页面。后端只监听本机回环地址。


### 本地运行

仓库包含前端分离文件和历史整合文件，但当前版本必须运行本机后端才能使用 ADB 功能。项目不需要构建或安装 npm 依赖。

#### 方法1: 后端 ADB
运行 `server.cjs` 后访问根目录页面，在开始页选择“后端 ADB”。所有 ADB 请求均经本机后端执行，USB 和无线 ADB 使用相同的前端功能。

#### 方法2: 网页端 WebADB
可直接通过 HTTPS 或 `localhost` 打开页面，在开始页选择“网页端 WebADB”。使用 Chrome / Edge 通过 USB 选择设备并在手机上授权；此方式不需要运行本机 ADB 后端。

#### 后端参数
1. 下载并解压完整项目，保留目录结构。
2. 安装 [Node.js](https://nodejs.org/)，在包含 `server.cjs` 的目录打开终端。
3. 运行：

   ```powershell
   node server.cjs
   ```

4. 使用 Chrome、Edge 或其他现代浏览器打开 [http://127.0.0.1:8124](http://127.0.0.1:8124)。
5. 在页面选择 USB 或无线 ADB；无线模式填写 `IP:端口`，USB 模式可从已发现设备中选择。

按 `Ctrl+C` 停止服务。服务只监听本机地址 `127.0.0.1`。

若默认端口被占用，可在 PowerShell 中更换端口：

```powershell
$env:PORT = "8080"
node server.cjs
```

随后打开 [http://127.0.0.1:8080](http://127.0.0.1:8080)。如果 `adb` 不在 PATH 中，可以指定可执行文件路径：

```bash
ADB_PATH=/path/to/adb PORT=8080 node server.cjs
```

**请通过本项目后端打开页面。** 直接双击 `index.html` 不会启动 ADB 后端，连接按钮也无法工作。

## 部署到网站

前端静态文件可以部署到 HTTPS 网站，但仅部署静态文件不能使用本项目的 ADB 功能。使用者仍需在自己的电脑上运行 `server.cjs`，并让前端请求指向该后端；当前默认前端请求同源 `/api`，因此推荐直接由 `server.cjs` 同时提供页面和 API。

- 保留 `index.html`、`css/`、`js/`、`assets/` 的相对路径。
- 对外提供服务时使用 HTTPS。本机回环地址属于浏览器认可的可信来源，因此本地开发可以使用 HTTP。参见 [MDN：安全上下文](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)。
- JavaScript 应返回有效的 JavaScript MIME 类型，例如 `text/javascript`；CSS 应返回 `text/css`。不要将它们统一返回为 `application/octet-stream`。
- 如果自行改为 CDN 引用，脚本、样式和模块依赖也应使用 HTTPS，避免被浏览器作为混合内容屏蔽。
- `server.cjs` 是当前版本的必需本地 ADB 后端，默认只监听 `127.0.0.1`，不会把 ADB 设备暴露到公网。
- 后端提供 `/api/devices`、`/api/connect`、`/api/exec`、`/api/frame`、`/api/push`、`/api/pull` 和 WebSocket 终端接口。
- 显示控制中的网页投屏按设定帧率抓取设备画面，并按“传输节流上限”调度 PNG 帧；该参数不是视频编码码率，实际帧率还会受设备截图速度、ADB USB/无线链路和服务端处理速度影响。点击投屏画面会换算为设备坐标并执行 `input tap`。
- 当前投屏采用逐帧 PNG 截图，若需要稳定的高帧率和真正可控的视频码率，应改用长连接 H.264 `screenrecord` 流。

## 目录结构

```text
.
├── index.html                 # 页面结构与模块入口
├── README.md                  # 项目说明
├── LICENSE                    # 项目 GPLv3 许可证全文
├── server.cjs                 # 静态服务器、本机 ADB API 和 WebSocket 终端
├── LICENSE-Tango.txt          # Tango 相关组件许可
├── LICENSE-xterm.txt          # xterm.js 相关组件许可
├── assets/
│   └── favicon.svg            # 页面图标
├── docs/
│   └── index.html             # 历史整合版页面（不包含当前后端链路）
├── css/
│   ├── styles.css             # 工具箱样式
│   └── xterm.css              # 终端样式
└── js/
    ├── app.js                 # 页面初始化、交互、连接状态与设置
    ├── core.js                # 命令执行与各功能逻辑
    ├── transport.js           # 前端到本机后端的 ADB 请求封装
    ├── terminal.js            # 交互式终端会话
    ├── batch.js               # BAT 语法子集解释器
    └── vendor/                # 本地第三方依赖
```

## 终端与脚本

### ADB 终端

终端连接的是手机上的 Android Shell，可直接输入 Shell 命令：

```sh
getprop ro.product.model
wm size
settings get system font_scale
```

同一连接中的终端会话保留当前目录和环境变量；切换页面不会重新创建会话。历史记录和补全由设备上的 Shell 提供，`Ctrl+C` 可中断正在运行的命令。断开设备或重新启动终端会结束当前会话。

### BAT 脚本

控机脚本通过 JavaScript 解释部分 BAT 语法，将其中的 ADB 操作转换为浏览器端调用，**不会启动 Windows 的 `cmd.exe` 或执行电脑上的 EXE**。

例如，可以导入并执行以下脚本：

```bat
@echo off
echo 读取设备型号
adb shell getprop ro.product.model
timeout /t 1
adb shell wm size
```

支持的语法包括 `echo`、`rem`、`set`、`set /a`、`set /p`、变量替换、标签与 `goto`、部分 `if` 条件、`if errorlevel`、多行括号形式的 `for /l`、`timeout`、`choice /t`、`pause` 和 `exit /b`。具体支持范围以解释器实现为准。

涉及 `adb push`、`adb install` 等本地文件操作时，需要先在页面中关联对应文件。浏览器无法仅凭脚本中的 Windows 路径读取电脑文件。

这套解释器兼容的是 BAT 语法子集。依赖外部程序、PowerShell、`for /f` 或复杂 CMD 语法的脚本需要调整；遇到不支持的命令时会报告错误。

## 数据保存与文件下载

- **设置、脚本文本、软件操作记录**：保存在当前网站的浏览器本地存储中。清理网站数据会删除这些内容；设置和脚本可通过页面提供的功能导出备份。
- **ADB 身份信息**：由本机 ADB Server 管理；清理浏览器数据不会删除本机 ADB 密钥。
- **网站地址变更**：不同协议、域名或端口使用独立的网站存储，迁移部署地址后可能需要重新授权和导入设置。
- **截图与电池统计**：需要及时下载保存，当前页面内的临时数据不会跨刷新保留。
- **电池 CSV**：文件名使用连接设备读取到的机型名称和日期时间，例如 `一加 15T_2026-11-03_14-30-00.csv`；无法读取营销名称时回退到系统型号。
- **下载目录**：可在支持的浏览器中授权保存目录；未授权时使用普通浏览器下载。截图“下载后删除手机原图”仅在确认写入所选目录后执行，普通浏览器下载会保留手机原图。

设备命令通过本机后端调用 `adb` 执行。USB 和无线 ADB 使用相同的后端接口；文件上传先发送到后端临时目录，再由后端执行 `adb push`，下载则由后端执行 `adb pull` 后返回浏览器。后端默认只监听本机回环地址，不是公网远程 ADB 服务。

## 常见问题

| 问题 | 排查方法 |
| --- | --- |
| 连接按钮是灰色的 | 确认已通过 `node server.cjs` 启动后端，并从 `http://127.0.0.1:8124` 打开页面；检查 `/api/health` 是否返回成功。 |
| 后端提示找不到 adb | 安装 Android SDK Platform Tools，将 `adb` 加入 PATH，或使用 `ADB_PATH` 指定可执行文件。 |
| USB 设备找不到 | 检查 USB 调试、数据线、USB 接口和系统 ADB 驱动；在终端运行 `adb devices` 确认设备状态为 `device`。 |
| 无线设备找不到 | 在页面填写设备 `IP:端口`；确认手机和电脑在同一网络，并先在手机开启无线调试。 |
| 提示 ADB 接口被占用 | 关闭其他 ADB 工具或占用设备的进程，再运行 `adb kill-server` 后重试。 |
| 页面提示跨域或混合内容 | 推荐由本项目 `server.cjs` 同源提供页面和 API；不要直接用 `file://` 打开，也不要把后端暴露到不可信网络。 |
| 命令返回权限不足、设置不生效 | Android 版本、厂商 ROM 和系统策略可能限制 ADB Shell 权限；部分设备还需开启厂商提供的 USB 调试安全选项。 |
| CPU 频率、功率或主板 ID 无法读取 | 部分设备不开放对应系统节点。功率记录依赖设备提供的电流、电压等数据，不等同于外接充电功率计测量值。 |
| 关闭或刷新页面后连接断开 | 页面会关闭当前后端会话，需要重新连接；请提前下载需要保留的数据。 |

## 开发与反馈

本项目直接使用原生 JavaScript ES 模块。修改后启动 `server.cjs` 并刷新页面即可查看效果，无需执行依赖安装或打包命令。`docs/index.html` 是历史整合版，不应作为当前后端版的运行入口。

- 修改页面布局：`index.html`。
- 修改样式：`css/styles.css`。
- 修改页面交互与设置：`js/app.js`。
- 修改设备命令和功能逻辑：`js/core.js`。
- 修改后端 ADB 连接、终端或脚本解释：分别查看 `server.cjs`、`js/transport.js`、`js/terminal.js`、`js/batch.js`。
- 更新第三方组件时，检查模块引用与接口兼容性，并保留相应的版权及许可证文件。

欢迎通过仓库的 Issues 反馈问题或提交 Pull Request。反馈时请提供工具版本、浏览器版本、电脑系统、设备型号、Android / ROM 版本、复现步骤和相关错误信息。提交截图或命令输出前，请隐藏设备序列号、主板 ID 等个人设备信息。

涉及设备行为的修改，请说明实际测试设备及结果；未经实机验证的行为请明确注明。

## 第三方项目

感谢以下开源项目：

| 项目 | 使用组件与版本 | 许可 |
| --- | --- | --- |
| [Tango / ya-webadb](https://github.com/yume-chan/ya-webadb) | 原项目遗留的浏览器端 ADB/WebUSB 组件，当前后端版连接链路不再使用 | [MIT](LICENSE-Tango.txt) |
| [xterm.js](https://github.com/xtermjs/xterm.js) | `@xterm/xterm` 5.5.0、`@xterm/addon-fit` 0.10.0 | [MIT](LICENSE-xterm.txt) |

### 项目许可

本项目的原创代码采用 **GNU General Public License v3.0（GPL-3.0-only）**，许可证全文见 [LICENSE](LICENSE)。

Copyright (C) 2026 晨钟酱Official。

第三方组件保留各自的版权与 MIT 许可，详见 [LICENSE-Tango.txt](LICENSE-Tango.txt) 和 [LICENSE-xterm.txt](LICENSE-xterm.txt)。分发时请保留这些声明。

本软件按许可证所述提供，不附带任何担保。

## 使用说明

本工具为全安卓通用软件。使用本工具则代表您有一定玩机知识储备。若盲目操作导致无法开机或丢失数据则后果自负，作者不承担任何责任。
