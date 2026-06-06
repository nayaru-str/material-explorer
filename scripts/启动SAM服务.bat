@echo off
echo ============================================================
echo SAM 分割服务启动脚本（sam-vit-base，约 375MB）
echo ============================================================
echo.
echo 正在检查/下载 sam-vit-base 模型（约 375MB）...
echo 提示：如遇下载卡住，可随时 Ctrl+C 中断，再次运行会自动续传
echo.

cd /d "%~dp0"

python sam_server_base.py

pause
