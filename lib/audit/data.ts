// lib/audit/data.ts

export interface AuditLogItem {
  id: string;
  timestamp: string; 
  action: 'officer reassigned' | 'simulation run' | 'why generated' | 'demo launched' | 'case created';
  description: string;
}

// Shuffled and varied initial dataset
export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: '1',
    timestamp: '12/08/2026, 14:22:10',
    action: 'officer reassigned',
    description: 'Reassigned step Finance Verification from 82f4bc90-11a2-4a0b-98bc-c1029384e112 to Officer C',
  },
  {
    id: '2',
    timestamp: '12/08/2026, 11:45:03',
    action: 'why generated',
    description: 'AI generated causal explanation for SLA risk bottleneck',
  },
  {
    id: '3',
    timestamp: '11/08/2026, 19:10:44',
    action: 'simulation run',
    description: 'Simulated Officer B unavailable',
  },
  {
    id: '4',
    timestamp: '11/08/2026, 16:05:12',
    action: 'case created',
    description: 'Created new case GF-1025 for applicant Rajesh Kumar',
  },
  {
    id: '5',
    timestamp: '11/08/2026, 12:30:55',
    action: 'simulation run',
    description: 'Simulated Officer A unavailable',
  },
  {
    id: '6',
    timestamp: '11/08/2026, 09:15:20',
    action: 'officer reassigned',
    description: 'Reassigned step Revenue Verification to Officer D',
  },
  {
    id: '7',
    timestamp: '10/08/2026, 22:11:08',
    action: 'why generated',
    description: 'AI generated causal explanation',
  },
  {
    id: '8',
    timestamp: '10/08/2026, 18:40:19',
    action: 'simulation run',
    description: 'Simulated queue overload scenario',
  },
  {
    id: '9',
    timestamp: '10/08/2026, 15:02:41',
    action: 'demo launched',
    description: 'One-click demo scenario created',
  },
  {
    id: '10',
    timestamp: '10/08/2026, 11:18:00',
    action: 'case created',
    description: 'Created new case GF-1024 for applicant Ram Kumar',
  }
];

export function getAuditLogs(): AuditLogItem[] {
  if (typeof window === 'undefined') return INITIAL_AUDIT_LOGS;
  
  const stored = localStorage.getItem('govflow_audit_logs');
  if (!stored) {
    localStorage.setItem('govflow_audit_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
    return INITIAL_AUDIT_LOGS;
  }
  
  return JSON.parse(stored);
}

export function logAction(action: AuditLogItem['action'], description: string) {
  if (typeof window === 'undefined') return;
  
  const logs = getAuditLogs();
  const newLog: AuditLogItem = {
    id: Date.now().toString(),
    timestamp: new Date().toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
    action,
    description,
  };
  
  const updated = [newLog, ...logs];
  localStorage.setItem('govflow_audit_logs', JSON.stringify(updated));
  return newLog;
}