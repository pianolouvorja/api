# PLAN: Security Hardening

Branch: `feat/security-hardening` → PR → staging (nunca main direto)

## Tarefas
1. T1 secureHeaders global no app.ts (RF-01) + teste header assertions
2. T2 app.onError + app.notFound (RF-02) + testes 500/404
3. T3 CORS via env CORS_ORIGINS (RF-03) + teste origem custom
4. T4 src/config/env.ts validação Zod + chamada em index.ts (RF-04) + testes
5. T5 rateLimit proxy-aware via TRUSTED_PROXY (RF-05) + teste XFF ignorado por default
6. T6 path traversal guard em /file handler (RF-06) + teste ../ → 400
7. T7 Atualizar .env.example com CORS_ORIGINS e TRUSTED_PROXY
8. T8 `npm run validate:pr` verde → commit → push → PR staging

## Verify
- Todos os testes novos passando
- Compat regression suite (backups de paridade) intacta
- curl manual: headers presentes, /../ bloqueado, env inválida falha boot
