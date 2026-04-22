# Homologacao de Documentos

Este laboratorio executa o core de Documentos do v1 a partir de uma copia local dentro do v2.

No estado atual do laboratorio, o pipeline de conversao e sempre MarkItDown-only: todo documento passa primeiro por conversao para Markdown e so depois segue para resumo.

## Estrutura atual

- `v1_copy/core/`: copia local do core legado usado pelo laboratorio.
- `core/`: bootstrap, contratos e adapter do laboratorio.
- `cmd/`: runners em linha de comando.
- `fixtures/`: casos de smoke e exemplos.
- `artifacts/`: arquivos gerados localmente pelo processamento.

## Comandos iniciais

Healthcheck:

```powershell
Set-Location "C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v2"
& "C:\ProgramData\anaconda3\python.exe" ".\homologation\documents\cmd\run_document.py" --action healthcheck --json
```

Smoke minimo:

```powershell
Set-Location "C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v2"
& "C:\ProgramData\anaconda3\python.exe" ".\homologation\documents\cmd\smoke_documents.py"
```

Matriz local MarkItDown com varios formatos:

```powershell
Set-Location "C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v2"
& "C:\ProgramData\anaconda3\python.exe" ".\homologation\documents\cmd\markitdown_matrix.py"
```

Listagem de documentos de um PNCP especifico:

```powershell
Set-Location "C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v2"
& "C:\ProgramData\anaconda3\python.exe" ".\homologation\documents\cmd\run_document.py" --action list_documents --pncp-id "SEU_NUMERO_CONTROLE_PNCP" --json
```

Processamento de um documento por URL, file:// ou caminho local:

```powershell
Set-Location "C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v2"
& "C:\ProgramData\anaconda3\python.exe" ".\homologation\documents\cmd\run_document.py" --action process_url --url "URL_OU_CAMINHO_DO_DOCUMENTO" --name "documento.pdf" --json
```

Browser tester local:

```powershell
Set-Location "C:\Users\Haroldo Duraes\Desktop\Scripts\GovGo\v2"
& "C:\ProgramData\anaconda3\python.exe" ".\homologation\documents\browser\app.py"
```

## Observacoes

- Os paths de artefatos sao forçados para `homologation/documents/artifacts/`.
- O bootstrap carrega `v2/.env` antes de importar o core local.
- A validacao operacional atual foi feita com `C:\ProgramData\anaconda3\python.exe`, porque o `spacy_env` do workspace estava sem dependencias basicas como `requests`.
- `save_artifacts=false` evita escrita em storage/BD, mas os arquivos locais de resumo e markdown continuam sendo gerados pelo core legado quando o fluxo chega a essa etapa.
- O browser tester e o runner CMD nao expõem mais alternancia de fluxo: o laboratorio usa somente MarkItDown.
- A matriz local gera amostras reprodutiveis em `homologation/documents/tests/samples/` e valida conversao para `txt`, `md`, `html`, `xml`, `json`, `csv`, `tsv`, `yaml`, `pdf`, `docx` e `pptx`.
