@echo off
REM Script de inicialização do ambiente (Windows)

terraform init
if errorlevel 1 goto error_tf_init

terraform apply -auto-approve
if errorlevel 1 goto error_tf_apply

docker compose up --build -d
if errorlevel 1 goto error_docker_compose

echo --- Ambiente inicializado! ---
echo Aplicacao: http://localhost:8080
echo Prometheus: http://localhost:9090
echo Grafana: http://localhost:3001 (User: admin, Pass: admin)
goto end

:error_tf_init
echo Erro ao inicializar o Terraform. Verifique a instalacao.
goto end

:error_tf_apply
echo Erro ao aplicar a infraestrutura com Terraform.
goto end

:error_docker_compose
echo Erro ao subir os conteineres com Docker Compose.
goto end

:end
pause
