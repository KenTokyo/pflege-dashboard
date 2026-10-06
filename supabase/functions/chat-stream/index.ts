import { chatHandler } from "../_shared/handler.ts";
import { platform } from "../_shared/platform.ts";
const env = (name: string) => Deno.env.get(name);
Deno.serve(chatHandler({ env, platform: platform(env) }));
