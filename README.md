# ELO · Da prescrição à compreensão

Prova de conceito do projeto ELO (APONTI Academy 2026). App mobile instalável (PWA) com três perfis: pessoa usuária, farmacêutico e pesquisa.

> **Dados fictícios. Sem uso clínico.** Não use com pacientes reais nem com fotos de receitas, documentos ou rostos.

## O que tem aqui

```
index.html              o app inteiro (HTML, CSS e JavaScript num arquivo)
manifest.webmanifest    nome, ícones e cores para instalar no celular
sw.js                   guarda o app para abrir sem internet
icons/                  ícones do app
.nojekyll               faz o GitHub Pages servir os arquivos como estão
proxy/                  servidor opcional para a análise de fotos por IA
```

## Publicar no GitHub Pages

1. Crie um repositório no GitHub (por exemplo, `elo`). Pode ser público.
2. Envie **todos** os arquivos desta pasta para a raiz do repositório, incluindo `.nojekyll` e a pasta `icons`. A pasta `proxy` pode ir junto; o GitHub Pages ignora o que não é página.
   - Pelo site: **Add file › Upload files**, arraste os arquivos e confirme com **Commit changes**.
   - Arquivos que começam com ponto, como `.nojekyll`, às vezes ficam ocultos no seu computador. Se não aparecer, crie no GitHub com **Add file › Create new file**, nome `.nojekyll`, conteúdo vazio.
3. No repositório, abra **Settings › Pages**.
4. Em **Build and deployment**, escolha **Source: Deploy from a branch**, branch **main** e pasta **/(root)**. Salve.
5. Espere um ou dois minutos. O endereço aparece no topo da página de Pages, no formato `https://SEU-USUARIO.github.io/elo/`.

### Instalar no celular

- **Android (Chrome):** abra o endereço e toque em **Instalar app** ou no menu **⋮ › Adicionar à tela inicial**.
- **iPhone (Safari):** abra o endereço, toque em **Compartilhar › Adicionar à Tela de Início**.

## Análise de fotos por IA

Sem configuração, o app funciona com os **exemplos simulados**, e fotos reais ficam como "inconclusivas". Para analisar fotos reais, escolha uma das opções e preencha em **Ajustes › Análise de fotos**.

A IA só **lê** o que aparece na foto (nome, dose, forma, espaço vazio na cartela). Quem decide se a foto confere é a regra do ELO, comparando com o plano do farmacêutico. Uma foto nunca prova que o remédio foi tomado: o registro continua sendo a confirmação da pessoa, e fotos que não conferem vão para a fila do farmacêutico.

### Opção A · servidor próprio (recomendada)

A chave da API fica no servidor, não no celular. Usa o plano gratuito da Cloudflare.

1. Crie uma chave em <https://console.anthropic.com> e defina um limite de gasto baixo.
2. Instale o Node.js e, no terminal:
   ```bash
   npm install -g wrangler
   wrangler login
   cd proxy
   ```
3. Em `proxy/wrangler.toml`, troque `https://SEU-USUARIO.github.io` pelo seu endereço (só o domínio, sem `/elo/` e sem barra no final).
4. Guarde a chave como segredo e publique:
   ```bash
   wrangler secret put ANTHROPIC_API_KEY
   wrangler deploy
   ```
5. O terminal mostra um endereço como `https://elo-ia.seu-usuario.workers.dev`. Cole em **Ajustes › Análise de fotos › Endereço do servidor de análise** e toque em **Salvar**.

O servidor só aceita pedidos vindos do seu endereço do GitHub Pages e só no formato do app (uma foto e o medicamento esperado). Para limitar a quantidade de pedidos, configure uma regra de *Rate limiting* no painel da Cloudflare.

### Opção B · chave direto no aparelho (só para testes)

Em **Ajustes › Análise de fotos › Usar chave de API direto no aparelho**, cole uma chave de teste. Ela fica salva só naquele navegador, mas qualquer pessoa com acesso ao aparelho pode vê-la. Não use em aparelhos compartilhados e apague depois do teste (**Desligar IA**).

### Dentro do claude.ai

Aberto como artifact no claude.ai, o app usa o Claude da conta de quem abre, sem chave. Na primeira foto, o claude.ai pede permissão.

## Atualizar o app

Substitua o `index.html` no repositório. Se mudar outros arquivos, troque também o valor de `VERSAO` em `sw.js` (por exemplo, `elo-v5`) para os celulares baixarem a versão nova.

## Privacidade e ética

- Dados de saúde são sensíveis pela LGPD. Este protótipo guarda tudo só no navegador de quem usa e não tem servidor de dados.
- Na análise por IA, a foto é enviada à API da Anthropic. O app avisa antes da primeira foto e orienta a fotografar só a embalagem.
- Estudos com participantes exigem revisão ética aplicável antes do uso.

## Limites desta versão

- Reconhecimento de fala simulado (texto e falas de exemplo).
- Perfis, encaminhamentos e retornos do farmacêutico simulados no próprio aparelho.
- Os números da aba Pesquisa vêm de 40 cenários sintéticos com gabaritos definidos no próprio app. Servem para conferir as regras, não como resultado do estudo.
