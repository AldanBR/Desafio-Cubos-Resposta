#!/bin/bash

terraform init
if [ $? -ne 0 ]; then
    echo "Erro ao inicializar o Terraform. Verifique a instalação."
    exit 1
fi

terraform apply -auto-approve
if [ $? -ne 0 ]; then
    echo "Erro ao aplicar a infraestrutura com Terraform."
    exit 1
fi

docker compose up --build -d
if [ $? -ne 0 ]; then
    echo "Erro ao subir os contêineres com Docker Compose."
    exit 1
fi

echo "--- Ambiente inicializado! ---"
echo "Aplicação: http://localhost:8080"
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3001 (User: admin, Pass: admin)"