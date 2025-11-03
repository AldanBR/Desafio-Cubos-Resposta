terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.1"
    }
  }
}

provider "docker" {}

locals {
  env_vars = file("env_vars.txt")
}

resource "docker_network" "internal_network" {
  name   = "desafio_cubos_internal_network"
  internal = true
}

resource "docker_network" "external_network" {
  name = "desafio_cubos_external_network"
}

resource "docker_volume" "postgres_data" {
  name = "desafio_cubos_postgres_data"
}

output "access_url" {
  value = "http://localhost:8080"
  description = "URL de acesso ao Frontend pelo Nginx"
}

/*OBS: Eu sei que é uma boa prática separar os arquivos .tf por recurso, mas esse projeto não pareceu suficientemente complexo pra justificar isso, e também 
 no front, vocês também fizeram isso centralizando o estilo no html invés de fazer um CSS, então eu deduzi que vocês entenderiam numa boa ¯\(ツ)/¯
 */