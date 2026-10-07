import { describe, expect, it, vi } from 'vitest';
import { boundGeminiInstructions, boundProviderInput, reservedFormatInstructions, responseFormatBinding } from '../runtime/format-binding.ts';
import { OpenAIProvider, OpenCodeProvider, type Context, type Provider, type ProviderPart } from '../runtime/provider.ts';
import { GeminiProvider } from '../runtime/gemini.ts';
import { chatHandler } from '../runtime/handler.ts';
import { OPENUI_INSTRUCTIONS, parseOpenUi, type ResponseFormat } from '../../types/openui.ts';

const id = '87000000-0000-4000-8000-000000000001';
const model = 'deepseek-v4.1-flash';
const source = 'root = Answer([Text("**Unterlagen** prüfen."), Notice("Einordnung", "*Keine bestätigte Frist.*")])';
// Exactly the live failure shape: UI answer, normal answer, then a short UI follow-up.
const history: Context['input'] = [
  { role: 'user', content: 'Was steht zum fiktiven Antrag fest?' },
  { role: 'assistant', content: '**Pflegegrad 3**\n\nEinordnung\n\n*Frist nicht bestätigt.*' },
  { role: 'user', content: 'Bitte als normalen kurzen Text.' },
  { role: 'assistant', content: '**Unterlagen** prüfen.\n\n*Keine bestätigte Frist.*' },
  { role: 'user', content: 'Und jetzt kurz, in einem Satz: Was sollte ich tun?' },
];
function context(format: ResponseFormat = 'openui'): Context {
  return {
    model: { registryId: id, provider: 'opencode', providerModelId: model, displayName: 'DeepSeek', region: 'unverified' },
    acceptedResponseModelIds: [model], promptVersionId: id, responseFormat: format,
    catalogVersion: 'pflege-openui-v1', instructions: 'Trusted persona/facts/safety snapshot\n'+reservedFormatInstructions(format),
    input: history.map(row => ({...row})), maxOutputTokens: 1024, inputTokenBound: 1048576, maximumCostMicrousd: 0,
  };
}
const frame = (event: unknown) => `data: ${JSON.stringify(event)}\n\n`;
const response = (payload: string) => new Response(payload, { headers: { 'Content-Type': 'text/event-stream' } });
function opencodeFetch(text = source) {
  return vi.fn().mockResolvedValue(response(frame({model, choices:[{index:0,delta:{content:text},finish_reason:null}]})+
    frame({model,choices:[{index:0,delta:{},finish_reason:'stop'}],usage:{prompt_tokens:123,completion_tokens:122,total_tokens:245}})+'data: [DONE]\n\n'));
}
async function consume(provider: Provider, c: Context) {
  const parts: ProviderPart[] = [];
  for await (const part of provider.stream(c,new AbortController().signal)) parts.push(part);
  return parts;
}
function assertLateBinding(messages: {role:string;content:string}[], c: Context) {
  expect(messages.map(row => row.role)).toEqual(['user','assistant','user','assistant','system','user']);
  expect(messages.filter(row => row.role !== 'system')).toEqual(history);
  expect(messages.at(-2)).toEqual({role:'system',content:responseFormatBinding(c.responseFormat)});
  expect(messages.at(-1)).toEqual(history.at(-1));
}

describe('trusted current-turn format binding across existing history', () => {
  it.each(['openui','text'] as const)('selects %s independently of historical canonical answer styles and preserves every row', format => {
    const c = context(format), original = structuredClone(c);
    assertLateBinding(boundProviderInput(c),c);
    expect(c).toEqual(original);
    expect(c.instructions).toContain(responseFormatBinding(format));
    expect(responseFormatBinding(format)).toContain('kein Vorbild für das aktuelle Ausgabeformat');
    expect(responseFormatBinding(format)).toContain('Nutzerwünsche wie „kurz“ oder „ein Satz“');
  });
  it('keeps old snapshots unchanged and rejects malformed current-turn roles', () => {
    const c = context(); delete c.responseFormat;
    expect(boundProviderInput(c)).toEqual(history); expect(boundGeminiInstructions(c)).toBe(c.instructions);
    expect(() => boundProviderInput({...context(),input:[{role:'assistant',content:'invalid current turn'}]})).toThrow();
  });
  it.each(['openui','text'] as const)('the additional encoded %s binding copy fits the existing SQL 4096-byte transport allowance', format => {
    const c = context(format), binding = responseFormatBinding(format);
    // Count UTF-8 after JSON escaping, not character length or estimated model tokens.
    const wireCopyBytes = Buffer.byteLength(JSON.stringify({role:'system',content:binding}),'utf8');
    expect(wireCopyBytes).toBeLessThan(4096);
    const geminiExtraBytes = Buffer.byteLength(JSON.stringify(boundGeminiInstructions(c)),'utf8')-
      Buffer.byteLength(JSON.stringify(c.instructions),'utf8');
    expect(geminiExtraBytes).toBeLessThan(4096);
    expect(reservedFormatInstructions(format)).toContain(binding);
    expect(reservedFormatInstructions(format).length).toBeLessThan(40000);
  });
  it('the complete prompt has only literal inline examples accepted by the actual strict parser', () => {
    expect(OPENUI_INSTRUCTIONS).not.toMatch(/Use references|prefer references|Hoisting/);
    const examples = OPENUI_INSTRUCTIONS.split('\n').filter(line => line.includes('root = Answer([Text(')).map(line => line.slice(line.indexOf('root = ')));
    expect(examples.length).toBeGreaterThan(0);
    for (const example of examples) expect(parseOpenUi(example).state).toBe('valid');
    expect(parseOpenUi('item = Text("x")\nroot = Answer([item])').state).toBe('invalid');
  });
  it.each(['openui','text'] as const)('OpenCode sends one generation with a late trusted %s system binding and no fabricated history', async format => {
    const c = context(format), fetcher = opencodeFetch();
    await consume(new OpenCodeProvider('synthetic-key',fetcher),c);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetcher.mock.calls[0]![1].body);
    expect(body.messages[0]).toEqual({role:'system',content:c.instructions});
    assertLateBinding(body.messages.slice(1),c);
    expect(body.thinking).toEqual({type:'disabled'});
    expect(body).not.toHaveProperty('tools'); expect(body).not.toHaveProperty('tool_choice');
  });
  it('OpenAI counts exactly the late binding and history later used for generation', async () => {
    const c = context(); c.model = {...c.model,provider:'openai',providerModelId:'fixture-model'};
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({input_tokens:123})).mockResolvedValueOnce(response(
      frame({type:'response.output_text.delta',delta:source})+frame({type:'response.completed',response:{model:'fixture-model',usage:{input_tokens:123,output_tokens:122}}})));
    await consume(new OpenAIProvider('synthetic-key',fetcher),c);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const count = JSON.parse(fetcher.mock.calls[0]![1].body), generated = JSON.parse(fetcher.mock.calls[1]![1].body);
    expect(count.input).toEqual(generated.input); expect(count.instructions).toBe(generated.instructions);
    assertLateBinding(generated.input,c);
  });
  it('Gemini binds inside systemInstruction and counts the same body without system roles in contents', async () => {
    const c = context(), geminiModel = 'gemini-3.8-flash';
    c.model = {...c.model,provider:'gemini',providerModelId:geminiModel};c.acceptedResponseModelIds=[geminiModel];c.outputTokenBound=65536;
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({totalTokens:123})).mockResolvedValueOnce(response(frame({
      modelVersion:geminiModel,usageMetadata:{promptTokenCount:123,candidatesTokenCount:122,totalTokenCount:245},
      candidates:[{index:0,content:{role:'model',parts:[{text:source}]},finishReason:'STOP'}],
    })));
    await consume(new GeminiProvider('synthetic-key',fetcher),c);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const counted = JSON.parse(fetcher.mock.calls[0]![1].body).generateContentRequest, generated = JSON.parse(fetcher.mock.calls[1]![1].body);
    const {model: _countModel,...countBody} = counted; expect(countBody).toEqual(generated);
    expect(generated.contents).toEqual(history.map(row => ({role:row.role==='assistant'?'model':'user',parts:[{text:row.content}]})));
    expect(generated.systemInstruction.parts[0].text).toBe(boundGeminiInstructions(c));
    expect(generated.systemInstruction.parts[0].text).toMatch(/Beantworte damit die unmittelbar folgende aktuelle Nutzerfrage\.$/);
  });
});

describe('full handler-to-OpenCode regression with the five-message mixed-format history', () => {
  it.each([source,'**Unterlagen** prüfen.\n\n*Keine bestätigte Frist.*'])('reserves the trusted binding before the only generation and never retries a format failure (%s)', async answer => {
    const c = context(), fetcher = opencodeFetch(answer);
    const rpc = vi.fn(async(name:string,args:Record<string,unknown>) => name==='edge_chat_replay'?null:
      name==='edge_chat_prepare'?{replayed:false,messageId:id,context:c}:
      name==='edge_chat_finish'?{status:args.p_status,costMicrousd:0}:true);
    const handler = chatHandler({env:()=>undefined,platform:{authenticate:vi.fn(async()=>({userId:id,sessionId:id})),rpc},provider:new OpenCodeProvider('synthetic-key',fetcher)});
    const request = new Request('https://example.invalid/api/chat-stream',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({workspaceId:id,conversationId:id,clientRequestId:id,content:history.at(-1)!.content,attachmentIds:[],responseFormat:'openui'})});
    const events = (await (await handler(request)).text()).split('\n').filter(line=>line.startsWith('data: ')).map(line=>JSON.parse(line.slice(6)));
    const prep = rpc.mock.calls.find(row=>row[0]==='edge_chat_prepare')![1];
    expect(prep.p_format_instructions).toBe(reservedFormatInstructions('openui'));
    expect(prep.p_format_instructions).toContain(responseFormatBinding('openui'));
    expect(rpc.mock.invocationCallOrder[rpc.mock.calls.findIndex(row=>row[0]==='edge_chat_prepare')]).toBeLessThan(fetcher.mock.invocationCallOrder[0]!);
    expect(fetcher).toHaveBeenCalledTimes(1);assertLateBinding(JSON.parse(fetcher.mock.calls[0]![1].body).messages.slice(1),c);
    const finishes=rpc.mock.calls.filter(row=>row[0]==='edge_chat_finish');expect(finishes).toHaveLength(1);
    expect(finishes[0]![1]).toMatchObject({p_status:answer===source?'completed':'failed',p_input_tokens:123,p_output_tokens:122,
      p_content:answer===source?parseOpenUi(source).text:answer,p_presentation:{state:answer===source?'valid':'invalid',source:answer}});
    expect(events.at(-1).type).toBe(answer===source?'message.completed':'error');
    if(answer!==source) expect(events.at(-1).data.code).toBe('PRESENTATION_INVALID');
  });
});
