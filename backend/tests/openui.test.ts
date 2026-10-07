import { describe, it, expect, vi } from 'vitest';
import { parseOpenUi, OPENUI_INSTRUCTIONS, OPENUI_LIBRARY, TEXT_STYLE_INSTRUCTIONS, OPENUI_SOURCE_LIMIT } from '../../types/openui.ts';
import { chatHandler } from '../runtime/handler.ts';
import type { Context } from '../runtime/provider.ts';
import { rpcQuery } from '../runtime/database.ts';
import { reservedFormatInstructions } from '../runtime/format-binding.ts';
const source = 'root = Answer([Text("**Antrag** prüfen."), Facts("Bekannt", ["Pflegegrad 3", "Fiktive Kasse"]), Steps("Weiter", ["Unterlagen prüfen", "Rückfrage stellen"]), Notice("Hinweis", "*Keine bestätigte Frist.*")])';
const projected = '**Antrag** prüfen.\n\nBekannt\n\n- Pflegegrad 3\n- Fiktive Kasse\n\nWeiter\n\n1. Unterlagen prüfen\n2. Rückfrage stellen\n\nHinweis\n\n*Keine bestätigte Frist.*';
describe('actual OpenUI SDK behind the strict read-only literal gate', () => {
  it('projects every component in order without a second independent answer', () => {
    const result = parseOpenUi(source); expect(result.state).toBe('valid'); expect(result.text).toBe(projected);
    expect(result.sections.map(x => x.typeName)).toEqual(['Text','Facts','Steps','Notice']);
  });
  it('uses the bounded server catalogue prompt without conflicting SDK reference/hoisting instructions', () => {
    expect(OPENUI_INSTRUCTIONS).toContain('Answer'); expect(OPENUI_INSTRUCTIONS).toContain('keine zusätzlichen Statements');
    expect(TEXT_STYLE_INSTRUCTIONS).toContain('**fett**'); expect(TEXT_STYLE_INSTRUCTIONS).toContain('*kursiv*');
    expect(OPENUI_INSTRUCTIONS).not.toContain('Use references');expect(OPENUI_INSTRUCTIONS).not.toContain('prefer references');
    expect(OPENUI_INSTRUCTIONS).not.toContain('Hoisting');expect(OPENUI_INSTRUCTIONS).not.toContain('Query(');
  });
  it('every source prefix is bounded and cannot be a final successful truncated answer', () => {
    for (let i = 0; i < source.length; i++) {
      const prefix = source.slice(0,i); expect(() => parseOpenUi(prefix,true)).not.toThrow();
      expect(parseOpenUi(prefix,true).state, `prefix ${i}: ${prefix}`).not.toBe('invalid');
      expect(parseOpenUi(prefix).state).not.toBe('valid');
    }
  });
  it.each([
    'root = Answer([Unknown("hidden fact")])',
    'root = Answer([Text("visible"),Unknown("hidden warning")])',
    'root = Answer([Text("visible")])\nother = Text("omitted warning")',
    'root = Answer([Text("visible")]);x=Query("write",{},null)',
    'root = Answer([Text(Query("read",{},null))])',
    'root = Answer([Text($secret)])',
    'root = Answer([Text("a" + "b")])',
    'root = Answer([Text(@Run("write"))])',
    'root = Answer([Text("a"),Notice("warning", null)])',
    'root = Answer([Text("a", "hidden")])',
    'root = Answer([Text("bad\\q")])',
    'root = Answer([Text("a")]) garbage',
    'prose\nroot = Answer([Text("a")])',
    'root = Answer([Text("a")])\n```',
    'root = Answer([])',
    'root = Answer([Text("")])',
  ])('rejects malformed/unsupported output: %s', input => {
    expect(parseOpenUi(input).state).toBe('invalid');
  });
  it('accepts a complete sole fence, rejects an unclosed final fence', () => {
    expect(parseOpenUi('```openui-lang\n'+source+'\n```').state).toBe('valid');
    expect(parseOpenUi('```openui-lang\n'+source).state).toBe('invalid');
  });
  it('unescapes JSON exactly, retaining emphasis, Unicode, newlines and warnings', () => {
    const text = 'ÄÖ漢字 "quoted" \\ path\n*Hinweis*';
    expect(parseOpenUi(`root = Answer([Text(${JSON.stringify(text)})])`).text).toBe(text);
  });
  it('cannot render arbitrary HTML, scripts, URLs, images or tools as components', () => {
    for(const name of ['HTML','Script','Image','Action','Mutation','Query'])
      expect(parseOpenUi(`root = Answer([${name}("x")])`,true).state).toBe('invalid');
    // Markdown remains plain data, and the existing SafeMarkdown owns link/HTML safety.
    expect(parseOpenUi('root = Answer([Text("<script>x</script>")])').text).toBe('<script>x</script>');
  });
  it('does not perform fetches while parsing or generating the already built prompt', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch',fetcher);
    try { OPENUI_LIBRARY.prompt({toolCalls:false,bindings:false}); parseOpenUi(source); parseOpenUi(source.slice(0,-5),true); expect(fetcher).not.toHaveBeenCalled(); }
    finally { vi.unstubAllGlobals(); }
  });
  it('rejects source and collection growth beyond the bounded existing answer size', () => {
    expect(parseOpenUi('x'.repeat(OPENUI_SOURCE_LIMIT+1)).reason).toBe('limit');
    expect(parseOpenUi('root = Answer(['+Array(25).fill('Text("x")').join(',')+'])').reason).toBe('limit');
    expect(parseOpenUi('root = Answer([Facts("x",['+Array(41).fill('"x"').join(',')+'])])').reason).toBe('limit');
  });
});
const id='86000000-0000-4000-8000-000000000001';
const context: Context = { model:{registryId:id,provider:'opencode',providerModelId:'deepseek-v4.1-flash',displayName:'DeepSeek',region:'unverified'},
  promptVersionId:id,instructions:'Trusted DB snapshot',responseFormat:'openui',catalogVersion:'pflege-openui-v1',
  input:[{role:'user',content:'Test'}],maxOutputTokens:1024,inputTokenBound:1048576,maximumCostMicrousd:1 };
const request=(extra:Record<string,unknown>={},signal?:AbortSignal)=>new Request('https://example.invalid/api/chat-stream',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspaceId:id,conversationId:id,clientRequestId:id,content:'Test',attachmentIds:[],responseFormat:'openui',...extra}),signal });
function fixture(parts:string[]= [source], replay=false) {
  const rpc=vi.fn(async(name:string,_args:Record<string,unknown>)=> name==='edge_chat_replay'
    ? replay ? {replayed:true,messageId:id,context,content:projected,presentation:{format:'openui',catalogVersion:'pflege-openui-v1',source,state:'valid'},inputTokens:34,outputTokens:90,costMicrousd:0}:null
    : name==='edge_chat_prepare'? {replayed:false,messageId:id,context}:name==='edge_chat_finish'? {status:'completed',costMicrousd:0}:true);
  const stream=vi.fn(async function*(){for(const text of parts) yield {text};yield {usage:{inputTokens:34,outputTokens:90,model:'deepseek-v4.1-flash'}};});
  const deps={env:()=>undefined,platform:{authenticate:vi.fn(async()=>({userId:id,sessionId:id})),rpc},provider:{stream}};
  return {deps,rpc,stream};
}
function events(s:string){return s.split('\n').filter(x=>x.startsWith('data: ')).map(x=>JSON.parse(x.slice(6)));}
describe('presentation handler retains authenticated chat and accounting flow',()=>{
  it('streams real DSL chunks, emits a single exact canonical projection and persists before completion',async()=>{
    const x=fixture([source.slice(0,48),source.slice(48)]);const e=events(await (await chatHandler(x.deps)(request())).text());
    expect(e[0].data).toMatchObject({responseFormat:'openui',catalogVersion:'pflege-openui-v1'});
    expect(e.filter(x=>x.type==='message.presentation.delta').map(x=>x.data.text).join('')).toBe(source);
    expect(e.filter(x=>x.type==='message.delta').map(x=>x.data.text)).toEqual([projected]);
    expect(e.at(-1).type).toBe('message.completed');
    const finish=x.rpc.mock.calls.find(x=>x[0]==='edge_chat_finish')![1];
    expect(finish).toMatchObject({p_content:projected,p_status:'completed',p_input_tokens:34,p_output_tokens:90,p_presentation:{source,state:'valid'}});
    const prep=x.rpc.mock.calls.find(x=>x[0]==='edge_chat_prepare')![1];
    expect(prep.p_format_instructions).toBe(reservedFormatInstructions('openui')); expect(prep.p_response_format).toBe('openui');
  });
  it.each(['root = Answer([Text("incomplete','root = Answer([Text("visible"),Unknown("warning")])'])('format failure never becomes completed and retains usage (%s)',async malformed=>{
    const x=fixture([malformed]);const e=events(await (await chatHandler(x.deps)(request())).text());
    expect(e.some(x=>x.type==='message.completed')).toBe(false);expect(e.at(-1).type).toBe('error');
    expect(x.rpc.mock.calls.find(x=>x[0]==='edge_chat_finish')![1]).toMatchObject({p_status:'failed',p_input_tokens:34,p_output_tokens:90,p_presentation:{source:malformed,state:'invalid'}});
  });
  it('replays stored format and source without a second provider call or reservation',async()=>{
    const x=fixture([],true);const e=events(await (await chatHandler(x.deps)(request())).text());
    expect(x.stream).not.toHaveBeenCalled();expect(e.find(x=>x.type==='message.presentation.final').data.presentation.source).toBe(source);
    expect(e.at(-1).data.replayed).toBe(true);expect(x.rpc.mock.calls.some(x=>x[0]==='edge_chat_prepare'||x[0]==='edge_chat_finish')).toBe(false);
  });
  it('validates format and refuses browser prompts before reservation',async()=>{
    for(const extra of [{responseFormat:'html'},{serverPrompt:'unsafe'},{catalogVersion:'other'}]) {
      const x=fixture();expect((await chatHandler(x.deps)(request(extra))).status).toBe(400);
      expect(x.rpc).not.toHaveBeenCalled();expect(x.stream).not.toHaveBeenCalled();
    }
  });
  it('keeps clearly normal Markdown returned instead of the requested UI as a failed readable answer',async()=>{
    const answer='**Antrag** prüfen.\n\n*Eine Frist ist nicht bestätigt.*';
    const x=fixture([answer]);const e=events(await (await chatHandler(x.deps)(request())).text());
    expect(e.at(-1).data.code).toBe('PRESENTATION_INVALID');expect(e.some(x=>x.type==='message.completed')).toBe(false);
    expect(e.find(x=>x.type==='message.delta').data.text).toBe(answer);
    expect(x.rpc.mock.calls.find(x=>x[0]==='edge_chat_finish')![1]).toMatchObject({p_content:answer,p_status:'failed',p_presentation:{source:answer,state:'invalid'}});
  });
  it('never sends partial JSON escapes as canonical append-only text',async()=>{
    const expected='Ärztlicher Hinweis: "prüfen".\n*Unbestätigt.*';
    const full='root = Answer([Text('+JSON.stringify(expected).replace('Ä','\\u00c4')+')])';
    const x=fixture([...full]);const e=events(await (await chatHandler(x.deps)(request())).text());
    expect(e.filter(x=>x.type==='message.delta').map(x=>x.data.text)).toEqual([expected]);
    expect(x.rpc.mock.calls.find(x=>x[0]==='edge_chat_finish')![1].p_content).toBe(expected);
  });
  it('on abort retains the safe partial text and raw source with interrupted state',async()=>{
    const x=fixture();const aborter=new AbortController();
    x.deps.provider.stream=vi.fn(async function*(){yield {text:'root = Answer([Text("Partial warning'};aborter.abort();});
    const e=events(await (await chatHandler(x.deps)(request({},aborter.signal))).text());
    expect(e.some(x=>x.type==='message.completed')).toBe(false);
    expect(x.rpc.mock.calls.find(x=>x[0]==='edge_chat_finish')![1]).toMatchObject({p_status:'interrupted',p_content:'Partial warning',p_presentation:{state:'interrupted'}});
  });
  it('fixed SQL query contracts parameterize format, prompt and JSON presentation',()=>{
    const args={p_workspace_id:id,p_user_id:id,p_session_id:id,p_conversation_id:id,p_request_id:id,p_content:'x',p_response_format:'openui',p_format_instructions:OPENUI_INSTRUCTIONS};
    expect(rpcQuery('edge_chat_prepare',args).values.at(-1)).toBe(OPENUI_INSTRUCTIONS);
    expect(()=>rpcQuery('edge_chat_prepare',{...args,p_response_format:'unsafe'})).toThrow();
  });
});
