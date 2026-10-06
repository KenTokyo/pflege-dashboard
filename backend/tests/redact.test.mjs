import { describe, expect, it } from 'vitest';
import { redact } from '../scripts/redact.mjs';
describe('Secret-safe local logs',()=>{
  it('removes full JWTs',()=>{
    const token='eyJmaXh0dXJlIjoxfQ.eyJzeW50aGV0aWMiOnRydWV9.c3ludGhldGljc2ln';
    expect(redact(`value ${token} end`)).not.toContain(token);
  });
  it('removes both Supabase key forms',()=>{
    const s='sb_secret_synthetic_fixture sb_publishable_synthetic_fixture';
    expect(redact(s)).not.toContain('synthetic_fixture');
  });
  it('removes provider/API access keys',()=>{
    expect(redact('sk-ant-syntheticfixture sbp_syntheticfixture')).not.toContain('syntheticfixture');
  });
  it('redacts database password while keeping enough context',()=>{
    const out=redact('postgresql://postgres:synthetic-db-password@127.0.0.1:56422/postgres');
    expect(out).not.toContain('synthetic-db-password');expect(out).toContain('127.0.0.1:56422');
  });
  it('redacts labelled credentials and strips ANSI',()=>{
    const out=redact('\x1b[31mPassword: synthetic-password\x1b[0m\nResult: PASS');
    expect(out).not.toContain('synthetic-password');expect(out).not.toContain('\x1b');expect(out).toContain('Result: PASS');
  });
  it('preserves non-secret errors and test summaries',()=>{
    expect(redact('must be owner of table objects (SQLSTATE 42501)\nResult: FAIL')).toContain('42501');
    expect(redact('Files=1, Tests=200')).toBe('Files=1, Tests=200');
  });
  it('removes JSON and dotenv credential labels even with opaque values',()=>{
    for(const label of ['SECRET_KEY','SERVICE_ROLE_KEY','ANON_KEY','JWT_SECRET','API_KEY']) {
      expect(redact(`"${label}": "opaque-synthetic-value"`)).not.toContain('opaque-synthetic-value');
      expect(redact(`${label}=opaque-synthetic-value`)).not.toContain('opaque-synthetic-value');
    }
  });
  it('removes table-style publishable and service key output',()=>{
    expect(redact('│ Publishable │ opaque-synthetic-value │')).not.toContain('opaque-synthetic-value');
    expect(redact('│ Service role │ opaque-synthetic-value │')).not.toContain('opaque-synthetic-value');
  });
});
