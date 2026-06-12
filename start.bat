@echo off
chcp 65001 >nul
title Material Explorer 启动器

echo ================================================
echo   Material Explorer 启动器
echo   前端: http://localhost:3000
echo   SAM 服务: http://localhost:8080
echo ================================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

:: 检查 Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)

:: 检查虚拟环境
if not exist ".venv\Scripts\python.exe" (
    echo [警告] 未找到 .venv 虚拟环境，正在创建...
    python -m venv .venv
    echo [提示] 正在安装 Python 依赖...
    call .venv\Scripts\pip.exe install fastapi uvicorn pillow numpy torch torchvision ultralytics
)

echo [1/2] 启动 SAM 服务 (端口 8080)...
start "SAM 服务" cmd /k "cd /d %~dp0 && .venv\Scripts\python.exe service\sam_service.py"

echo [2/2] 启动前端 (端口 3000)...
start "前端服务" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo ================================================
echo   启动完成！
echo   前端: http://localhost:3000
echo   SAM 服务: http://localhost:8080
echo ================================================
echo.
echo 两个服务窗口已在新标签中打开。
echo 关闭此窗口不会停止服务，需关闭对应的命令窗口。
pause
