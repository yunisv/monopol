# DevOps-платформа компании

Docker-based скелет внутренней платформы для команды 10-50 разработчиков:
VCS + CI/CD, управление инфраструктурой, трекинг задач, качество/безопасность
кода, мониторинг и слой автоматизации (с заделом под AI-агентов). Подробная
архитектура и обоснование выбора инструментов — в [docs/architecture.md](docs/architecture.md).

Стек собран по принципу best-of-breed (не единый GitLab/GitLab-омнибус), из
отдельных, слабо связанных сервисов на общей docker-сети `devops_edge`,
чтобы можно было включать слои по мере готовности сервера и роста команды.

## Состав

| Слой | Файл | Сервисы |
|---|---|---|
| Core (обязателен) | `docker-compose.yml` | Traefik (reverse proxy + TLS), Keycloak (SSO) |
| VCS + CI/CD | `docker-compose.vcs-ci.yml` | Gitea, Gitea Actions runner |
| Управление задачами | `docker-compose.pm.yml` | OpenProject |
| Качество/SAST | `docker-compose.quality.yml` | SonarQube |
| Мониторинг | `docker-compose.monitoring.yml` | Prometheus, Grafana, Loki, Promtail, Alertmanager, node-exporter, cAdvisor |
| Автоматизация / AI-агенты | `docker-compose.automation.yml` | n8n |

DefectDojo и Harbor подключаются отдельно официальными установщиками —
инструкция в [docs/adding-defectdojo-harbor.md](docs/adding-defectdojo-harbor.md).
Roadmap по AI-агентам — в [docs/ai-agents-roadmap.md](docs/ai-agents-roadmap.md).

## Быстрый старт

Требования: Docker + Docker Compose plugin на сервере, DNS-записи (или
wildcard) на нужные поддомены `*.${BASE_DOMAIN}`, открытые 80/443 порты.

```bash
cp .env.example .env
$EDITOR .env   # заполнить пароли, домен, email для Let's Encrypt

# core + git/CI — минимальный рабочий набор
./scripts/up.sh vcs-ci

# добавить трекер задач, качество кода, мониторинг, автоматизацию
./scripts/up.sh pm quality monitoring automation
```

После первого запуска:

1. `https://sso.${BASE_DOMAIN}` — создать realm/клиентов в Keycloak для остальных сервисов.
2. `https://git.${BASE_DOMAIN}` — завести первого админа Gitea, зарегистрировать Actions runner (шаги в `docs/architecture.md`).
3. `https://pm.${BASE_DOMAIN}` — первичная настройка OpenProject (создание проекта/бэклога).
4. `https://grafana.${BASE_DOMAIN}` — датасорсы Prometheus/Loki уже прописаны автоматически.
5. `https://automation.${BASE_DOMAIN}` — настроить workflow'ы n8n под вебхуки Gitea/DefectDojo/Alertmanager.

## Ресурсы сервера

См. таблицу в `docs/architecture.md` — от 4 vCPU/8GB для минимального
набора до 16 vCPU/32GB с полным стеком включая DefectDojo/Harbor.

## Что дальше

- Terraform/Ansible для провижининга самого сервера(-ов) — не включены в
  этот скелет, так как выбор сервера/облака ещё не зафиксирован; как
  только он определится, сюда добавляется `infra/` с модулями.
- Vault для секретов вместо `.env` — имеет смысл подключать при переходе
  с одного сервера на кластер.
