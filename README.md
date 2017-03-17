Mare - Lua 5.3 Debugger
=======================

![ScreenShot](http://mare.ejoy.com/images/mare.png)

[查看官网](http://mare.ejoy.com/)

*本项目仍然出于早期开发阶段*

特性
----

* 远程调试模型，Lua 模块，服务端，图形界面可以跑在不同系统上
* 数据对象审查功能，支持循环引用，非字符串 key，metatable 查看，调用栈查看
* 断点调试，按行号，按函数 call/return，按探测点名，带黑名单
* 单步执行，标准三件套 Step Over、Step Into、Step Out
* 查看中断变量数据，栈、local 和 upvalue
* 按条件中断，Watch 表达式，调试上下文 REPL
* 源码交互，项目目录树，代码高亮，日志和函数源码定位

TODO
----

* 打包 MacOS 版本，因为不能在 Linux 服务器上交叉编译
* 支持 Android/apk，iOS/ipa，因为不能直接访问文件系统，需要自己实现 loader
* VSCode、Atom 插件，理论上拿 JavaScript 来改改就行了
* 中断时，展开变量时，按需获取数据，现在只是限制数据量的快照
* 调试模块参数可配置，某些地方还是硬编码
* 完善前端管理页面，会话管理页面还是原始
* 国际化，现在注释和文档还是用中文
* 各种优化，各种测试，各种文档，各种重构

Licence
-------

MIT
