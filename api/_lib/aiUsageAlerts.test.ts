import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordAIUsageAlert } from './aiUsageAlerts.js';
vi.mock('./auth.js', () => ({authServiceHeaders:()=>({}),authSupabaseUrl:()=> 'https://example.test'}));
describe('recordAIUsageAlert', () => { beforeEach(()=>{vi.unstubAllEnvs();vi.stubGlobal('fetch',vi.fn())}); it('does nothing until explicitly enabled', async()=>{await recordAIUsageAlert({kind:'volume_anomaly',severity:'warning'});expect(fetch).not.toHaveBeenCalled()}); it('writes only minimised fields when enabled', async()=>{vi.stubEnv('AI_ANOMALY_ALERTS_ENABLED','true');vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true}));await recordAIUsageAlert({kind:'cost_anomaly',severity:'warning',evidence:{requests:4}});expect(fetch).toHaveBeenCalledTimes(1)}); });
