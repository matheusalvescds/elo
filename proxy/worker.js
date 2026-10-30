// Servidor de análise de fotos do ELO (Cloudflare Worker).
// Guarda a chave da API da Anthropic fora do navegador e aceita só o formato que o app envia:
// uma foto + o medicamento esperado. O texto da instrução é montado aqui, não no navegador,
// para que o endereço não sirva como acesso livre à API.
//
// Variáveis (wrangler.toml e segredos):
//   ANTHROPIC_API_KEY  segredo  -> wrangler secret put ANTHROPIC_API_KEY
//   ALLOWED_ORIGINS    texto    -> ex.: "https://seu-usuario.github.io"
//   MODELO             texto    -> ex.: "claude-sonnet-5-5"

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64 = 6_000_000; // cerca de 4,5 MB de imagem

function prompt(modo, esp) {
  return `Você é o módulo de análise visual do ELO, um protótipo acadêmico de acompanhamento de medicamentos (sem uso clínico).
${modo === 'comprovacao' ? 'A pessoa enviou uma foto para acompanhar o registro de que tomou um medicamento. Descreva apenas os indícios visuais.' : 'A pessoa quer conferir qual medicamento aparece na embalagem da foto.'}
${esp ? `Medicamento que a pessoa está registrando: ${esp.nome} ${esp.concentracao}, ${esp.forma}.` : ''}
Regras:
1. Transcreva só o que está legível na foto. Se não conseguir ler, use null e confiança baixa. Não complete nomes nem doses por suposição, nem a partir do medicamento informado acima.
2. Dê uma confiança de 0 a 1 para cada campo lido.
3. Não identifique nem descreva pessoas.
4. Não dê orientação clínica nem sobre dose.
5. Uma foto não comprova que o remédio foi engolido; descreva somente o que aparece.
Responda apenas com um objeto JSON neste formato, sem texto antes ou depois:
{"tipo_imagem":"caixa"|"blister"|"comprimido_solto"|"outro"|"ilegivel","nome_lido":string|null,"nome_confianca":number,"concentracao_lida":string|null,"concentracao_confianca":number,"forma_lida":string|null,"forma_confianca":number,"alveolo_vazio_visivel":boolean|null,"multiplas_embalagens":boolean,"observacao":"uma frase curta, em português simples, dirigida à pessoa","pedir_nova_foto":boolean}`;
}

const texto = (v) => (typeof v === 'string' ? v.slice(0, 80) : '');

export default {
  async fetch(req, env) {
    const origem = req.headers.get('Origin') || '';
    const permitidas = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const ok = permitidas.includes(origem);
    const cors = {
      'Access-Control-Allow-Origin': ok ? origem : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin'
    };
    const resposta = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (!ok) return resposta({ erro: 'Origem não permitida' }, 403);
    if (req.method !== 'POST') return resposta({ erro: 'Use POST' }, 405);
    if (!env.ANTHROPIC_API_KEY) return resposta({ erro: 'Chave da API não configurada no servidor' }, 500);

    let corpo;
    try { corpo = await req.json(); } catch { return resposta({ erro: 'JSON inválido' }, 400); }
    const { imagem, media_type, modo, esperado } = corpo || {};
    if (typeof imagem !== 'string' || !imagem || imagem.length > MAX_BASE64) return resposta({ erro: 'Imagem ausente ou grande demais' }, 400);
    if (!TIPOS.includes(media_type)) return resposta({ erro: 'Tipo de imagem não aceito' }, 400);
    if (!['comprovacao', 'conferencia'].includes(modo)) return resposta({ erro: 'Modo inválido' }, 400);
    const esp = esperado && typeof esperado === 'object'
      ? { nome: texto(esperado.nome), concentracao: texto(esperado.concentracao), forma: texto(esperado.forma) }
      : null;

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: env.MODELO || 'claude-sonnet-5-5',
        max_tokens: 700,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type, data: imagem } },
            { type: 'text', text: prompt(modo, esp) }
          ]
        }]
      })
    });
    if (!r.ok) return resposta({ erro: 'A API respondeu ' + r.status }, 502);

    const dados = await r.json();
    const t = (dados.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('');
    try {
      const a = t.indexOf('{'), b = t.lastIndexOf('}');
      return resposta(JSON.parse(a >= 0 && b > a ? t.slice(a, b + 1) : t));
    } catch {
      return resposta({ erro: 'Resposta da IA em formato inesperado' }, 502);
    }
  }
};
