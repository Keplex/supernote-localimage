# 插入后保留系统选区 / Native insertion selection

研究日期：2026-10-14；适用版本：0.5.0。桌面测试不能确认设备原生选框。

## 研究依据

参考项目 [wolfsolver/supernote-image-insert-plugin](https://github.com/wolfsolver/supernote-image-insert-plugin)，固定提交 `ae5dc43bfa555f2859b96717f7316255aa8b16e2`。[原图插入分支](https://github.com/wolfsolver/supernote-image-insert-plugin/blob/ae5dc43bfa555f2859b96717f7316255aa8b16e2/App.tsx#L148) 以及裁剪插入分支均在调用 `PluginNoteAPI.insertImage(path)` 后立即关闭插件，没有等待插入完成，也没有另行保存笔记或创建套索。

该项目锁定的 SDK 为 0.1.23，本项目为 0.2.3。核对两版公开 SDK 后，insertImage 都只是转发到宿主接口，没有公开的“插入后选中”参数。关闭插件都把关闭动作投递到 UI 线程；新版补充 Promise 成功回执。宿主内部如何创建和保留选区并未公开。

据此推断：系统插入本身可能提供待调整的原生选区，额外保存或套索操作可能干扰它。不能据此认定保存一定会清除选区，也不能只凭源码保证所有设备都能保留。

## 本版流程

1. 保留文件权限、输入和输出路径、目标笔记和页码检查。
2. 发起一次 insertImage，立即为结果挂接成功和失败处理。
3. 不等插入 Promise 完成就发起关闭插件，返回笔记。
4. 不调用 saveCurrentNote，不读取页面元素，不重新创建或清除套索。
5. 继续接收插入结果。确定失败时恢复界面；无法确认结果时阻止同一选择重复插入，并提示先检查笔记。恢复界面失败时使用原生提示。
6. 插入成功但关闭失败时保留“已提交”状态，提示用左上角按钮返回，避免再次插入。

原图和编辑副本共用这条流程。直接插入仍使用原文件，不重新编码；编辑副本先完成导出再提交。

返回后由用户调整位置和大小，按系统方式确认位置；保存由正常笔记流程处理。若系统未保留选框，仍可使用系统套索。

## Device check / 真机检查

- 原图和编辑副本分别插入，观察选框是否直接出现，能否拖动和缩放。
- 在有已有笔迹的页上确认调整只作用于新图片。
- 确认位置后继续书写，保存、重开笔记并检查图片仍在。
- 失败提示出现时先检查目标页，避免对结果不明的请求重复插入。

The plugin queues insertion, then immediately returns to the note without an extra save or lasso rebuild. It still handles the insertion result and protects against duplicate submission. This aims to preserve native image placement selection; only a device test can establish whether the host retains it. Confirm placement with normal note controls before continuing to write.
