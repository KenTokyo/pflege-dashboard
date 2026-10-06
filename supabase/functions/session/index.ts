import { sessionHandler } from "../_shared/handler.ts";
import { platform } from "../_shared/platform.ts";
const env = (name: string) => Deno.env.get(name);
Deno.serve(sessionHandler({ env, platform: platform(env) }));
