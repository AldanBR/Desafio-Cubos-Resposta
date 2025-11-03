# Desafio Técnico Cubos: Infraestrutura como Código Local, com segurança de rede.


Este é um projeto de criação de um ambiente de desenvolvimento local seguro, e replicável, utilizando **Terraform**, enquanto a conteinerização, bem como orquestração dos serviços, fica a cargo do **Docker** por meio do **Compose**, todos com política de *Restart Always*. A comunicação entre serviços é isolada pelas redes (sendo elas uma rede interna, uma rede externa e uma rede de observabilidade). O acesso externo é controlado pelo **Nginx**, que aqui faz o papel do **Proxy Reverso** . O monitoramento da saúde da aplicação é visualizada pelo **Grafana**, que por sua vez tem como *Metric scraper*, o **Prometheus** ambos também conteinerizados.


## Arquitetura das redes

A arquitetura é baseada no princípio de **mínimo privilégio de rede**. O acesso do usuário final é feito exclusivamente através do serviço `proxy`, que atua como um ponto de entrada seguro e roteia as requisições para os serviços internos.

| Serviço | Rede de Acesso | Acesso Externo |
| :--- | :--- | :--- |
| **db** | `internal_network` | Não |
| **backend** | `internal_network`, `external_network`, `grafana_network` | Não |
| **frontend** | `external_network` | Não |
| **proxy** | `external_network`, `grafana_network` | Sim (Porta 8080) |
| **prometheus** | `grafana_network` | Sim (Porta 9090) |
| **grafana** | `grafana_network` | Sim (Porta 3001) |
| **postgres_exporter** | `internal_network`, `grafana_network` | Não |
| **nginx_vts_exporter** | `external_network`, `grafana_network` | Não(Apesar do exporter estar na rede externa, ele apenas coleta métricas do Ngix(Proxy) e expõe ao Prometheus, portanto não é acessível externamente.) |

### 1. Isolamento de Rede

*   **`external_network` (Rede Externa):** Conecta o `proxy`, `frontend` e `backend`. É a rede de comunicação entre os serviços que precisam interagir com o Proxy.
*   **`internal_network`:** Apenas o `db` e o `backend` estão nela, além do `postgres_exporter`. O `db` continua isolado do mundo externo.
*   **`grafana_network`:** Conecta `prometheus`, `grafana`, `backend`, `postgres_exporter` e `nginx_vts_exporter`. O grafana tem uma rede própria pra evitar o tráfego de métricas das redes de aplicação, para que o Prometheus possa acessar todos os *exporters* sem se isso "polua" a rede das aplicações.

### 2. Monitoramento

*   **Backend (Node.js):** O `backend/index.js` foi modificado para usar a biblioteca `prom-client` e expor métricas essenciais (contadores de requisições, latência via histograma) no endpoint `/metrics`.
*   **PostgreSQL:** O serviço `postgres_exporter` coleta métricas detalhadas do banco de dados (conexões, latência de query, etc.) e as expõe ao Prometheus.
*   **Proxy (Nginx):** O serviço `proxy` foi alterado para usar a imagem `arut/nginx-with-vts` e o arquivo `proxy/nginx.conf` foi configurado para expor o status VTS, que é raspado pelo `nginx_vts_exporter`.
*   **Prometheus:** O `monitoring/prometheus/prometheus.yml` foi configurado para raspar as métricas de todos os *exporters* e serviços.

## Pré-requisitos do projeto

Para executar este projeto, você precisará ter as seguintes ferramentas instaladas em seu sistema operacional:

1.  **Docker** 
2.  **Docker Compose**
3.  **Terraform** ( >= 1.0.0 )

## Passos para Execução

O Terraform vai iniciar a criação dos recursos de infraestrutura de baixo nível que o Docker Compose utilizará, como as redes e os volumes de persistência e uma vez que esses recursos estiverem completamente criados, o Docker Compose é usado para construir as imagens, configurar as variáveis de ambiente e subir os contêineres na ordem correta.

### Execução automatizada
Existem dois scripts executores, um em bash(start.sh)¹ e um em bat(start.bat), que automatizam a execução em ambiente Linux e Windows, respectivamente.

**Nota¹**: No Linux/macOS, os scripts precisam ter permissão de execução (chmod +x start.sh).

### Execução Manual
Entre no diretório do projeto através de um terminal e siga os passos abaixo para subir a infraestrutura completa.

```
# Inicializa o Terraform (aqui também ele vai baixar o provider Docker)
terraform init

# Aplica as mudanças, criando as redes e os volumes
terraform apply -auto-approve

#Sobe as imagens, conteiners e faz a orquestração
docker compose up --build -d
```

## Acesso à Aplicação e Monitoramento

| Serviço | URL de Acesso | Credenciais |
| :--- | :--- | :--- |
| **Aplicação (Frontend)** | `http://localhost:8080` | N/A |
| **Prometheus** | `http://localhost:9090` | N/A |
| **Grafana** | `http://localhost:3001` | **User:** admin, **Pass:** admin |


## Ajustes no Backend

O arquivo `backend/index.js` recebeu os seguintes ajustes:

*   A conexão com o DB agora ocorre apenas uma vez (`client.connect()`) durante o *startup* do servidor, e não por requisição.
*   As consultas ao banco de dados agora são funções assíncronas (`async/await`).
*   As credenciais estavam como variáveis não definidas, o que sugeria a ideia delas serem defininas no código. Isso foi corrigido para ele utilizar as variáveis de ambiente completas para a conexão com o PostgreSQL (`PGUSER`, `PGPASSWORD`, `PGHOST`, etc.). Além disso as credenciais do banco de dados são reutilizadas pelo `postgres_exporter` através do `DATA_SOURCE_NAME` no `docker-compose.yml` e são transmitidas pelo Terraform e mantidas em um arquivo .env¹
*   Adicionar `Access-Control-Allow-Origin: *` para garantir que o frontend possa se comunicar com o backend via proxy.
* Como já dito antes, foi adicionada a biblioteca do `prom-client` para configurar o *exporter*

**Nota¹:** O arquivo .env em questão é pra simular o AWS Secret Manager, mas estava tendo problemas com o Terraform ler o .env, então salvei em um env_vars.txt. Deixei ambos no código para ilustrar qual era a ideia.

