# BARRA — Coletâneas Offline-First (CONGELADA antes do build)

> Critérios verificáveis, derivados da SPEC + baseline audit. Binários: passou ou falhou.
> Congelada em 15/09/2026. Mudar = novo commit na BARRA + aprovação do Rafael.

## Funcional
- B1. Criar/editar/excluir coletânea DESLOGADO persiste após fechar e reabrir o app (teste automatizado em IndexedDB/outbox).
- B2. Operação offline + crash do processo → outbox recarregado e sincroniza ao logar (teste: escreve op, mata processo simulado, reabre, sync ok).
- B3. Sync no login aplica LWW por item: registro com maior `updated_at` do SERVIDOR vence (teste com 2 clientes divergentes, determinístico).
- B4. Delete deslogado = tombstone (`deleted_at` setado); sync NÃO ressuscita registro deletado (teste: delete offline em A → sync em B → ausente em B).
- B5. Delete NÃO é remoção física; purge só após 30 dias (teste: tombstone <30d presente no DB após job).
- B6. Segunda máquina na mesma conta reflete as mudanças após login (teste E2E: edita em A, loga em B, vê).
- B7. Upload acima de 100 MB retorna 413 com mensagem clara (teste: quota atual = 99.9MB, upload 0.2MB → 413 + JSON com campo message).
- B8. Coletâneas de teste do prod ("tt","kiki","Person","probe-test","teste") removidas (verificação SQL no banco prod, contagem = 0).

## Segurança
- B9. Toda rota de escrita valida sessão→owner_id; owner diferente = 403 (teste unit: PUT com dono errado → 403).
- B10. Zero tokens brutos no banco (só sha256) e zero segredos no diff (grep + code review).
- B11. Pasta de mídia usa `{user_id}/` — nenhum path contém email (grep no código de upload).
- B12. Quota conta só arquivos vivos; tombstones não somam (teste unit do cálculo).

## Qualidade
- B13. Coverage 100% linhas/branches nos módulos NOVOS (sync engine, outbox, quota) — lcov verificado.
- B14. Zero warnings novos no lint (biome/vitest do repo) — CI verde.
- B15. Migrations idempotentes, statement-a-statement (lição api#88) — roda 2x sem erro.
- B16. Contrato do sync documentado: endpoint, payload request/response, códigos de erro (docs/CUSTOM_SYNC_API.md ou seção).
- B17. Todos os testes da suite existente continuam passando (zero regressão).
- B18. Ambientes: banco custom nasce separado dev/staging/prod — config por env var, verificada no deploy script.

## Fluxo
- B19. Todas as branches de feature nascem de `staging` (verificar merge-base).
- B20. Evidência real anexada a cada veredito do crítico (log de teste, screenshot, SQL output).

---
## Como julgar (crítico cego)
**PASSOU** = TODOS os Bn aplicáveis passam com evidência anexada.
**FALHOU** = qualquer Bn falha → citar arquivo:linha + evidência + Bn violado.
Critério subjetivo ("bonito", "elegante") NÃO entra — só o verificável.
