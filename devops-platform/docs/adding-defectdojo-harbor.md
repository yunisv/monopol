# Подключение DefectDojo и Harbor

DefectDojo и Harbor намеренно не описаны как ещё один `docker-compose.*.yml`
в этом скелете: у обоих проектов свои официальные многоконтейнерные
дистрибутивы (Celery worker + Redis + Nginx + uWSGI у DefectDojo; Core +
Jobservice + Registry + Trivy + Portal + Redis + DB у Harbor с генерацией
конфига через `install.sh`). Копирование их к себе быстро расходится с
апстримом при апдейтах. Правильный путь — ставить их официальными
средствами и подключать к общей сети `devops_edge`.

## DefectDojo

```bash
git clone https://github.com/DefectDojo/django-DefectDojo.git
cd django-DefectDojo
# docker-compose.yml из репозитория DefectDojo — использовать как есть,
# добавив внешнюю сеть devops_edge к сервису nginx (см. ниже) и убрав
# проброс портов наружу, раз это будет делать Traefik.
```

В `docker-compose.override.yml` рядом:

```yaml
services:
  nginx:
    networks:
      - default
      - edge
    labels:
      - traefik.enable=true
      - traefik.http.routers.dojo.rule=Host(`dojo.${BASE_DOMAIN}`)
      - traefik.http.routers.dojo.entrypoints=websecure
      - traefik.http.routers.dojo.tls.certresolver=le
      - traefik.http.services.dojo.loadbalancer.server.port=8443
      - traefik.http.services.dojo.loadbalancer.server.scheme=https

networks:
  edge:
    external: true
    name: devops_edge
```

Дальше — `docker compose up -d` из инструкции DefectDojo. API-токен из
DefectDojo используется в CI-пайплайнах для `import-scan`/`reimport-scan`
(см. пример в `architecture.md`).

## Harbor

```bash
wget https://github.com/goharbor/harbor/releases/download/v2.11.1/harbor-online-installer-v2.11.1.tgz
tar xzf harbor-online-installer-v2.11.1.tgz && cd harbor
cp harbor.yml.tmpl harbor.yml
```

В `harbor.yml` указать `hostname: registry.${BASE_DOMAIN}`, отключить
встроенный TLS-терминатор Harbor (`https:` секцию закомментировать — TLS
будет терминировать Traefik), затем:

```bash
./prepare
./install.sh
```

После установки подключить контейнер `harbor-proxy` (или `nginx` в
зависимости от версии) к сети `devops_edge` так же, как DefectDojo выше,
и добавить Traefik-лейблы на порт 8080 (или тот, что укажет `prepare`).

## Интеграция с CI

- Gitea Actions → `docker push registry.${BASE_DOMAIN}/team/app:${sha}` (Harbor сам сканирует образ через встроенный Trivy).
- Harbor webhook на "Scanning completed" → n8n → DefectDojo import (если нужна единая база находок по всем инструментам) или напрямую в OpenProject как тикет при critical/high находках.
