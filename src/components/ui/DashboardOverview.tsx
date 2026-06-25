'use client';

import { Users, ClipboardList, BarChart3, Monitor, Clock, Activity } from 'lucide-react';
import MagicBento, { BentoCardData } from './MagicBento';

interface DashboardOverviewProps {
  totalCandidates: number;
  activeAssessments: number;
  completedTests: number;
  avgScore: number | string;
  pendingAssignments: number;
  recentAttemptsCount: number;
}

export function DashboardOverview({
  totalCandidates,
  activeAssessments,
  completedTests,
  avgScore,
  pendingAssignments,
  recentAttemptsCount,
}: DashboardOverviewProps) {
  const cards: BentoCardData[] = [
    {
      variant: 'white',
      label: 'People',
      value: totalCandidates,
      title: 'Total Candidates',
      glowColor: '37, 99, 235',
      icon: (
        <div style={{ background: '#EFF6FF', borderRadius: 10, padding: 8, display: 'flex' }}>
          <Users size={18} color="#2563EB" />
        </div>
      ),
    },
    {
      variant: 'blue',
      label: 'Published & active',
      value: activeAssessments,
      title: 'Active Assessments',
      glowColor: '37, 99, 235',
      icon: (
        <div style={{ background: '#DBEAFE', borderRadius: 10, padding: 8, display: 'flex' }}>
          <ClipboardList size={18} color="#1D4ED8" />
        </div>
      ),
    },
    {
      variant: 'teal',
      label: 'Stored results',
      value: completedTests,
      title: 'Completed Tests',
      description: 'All-time assessment completions stored in the system.',
      glowColor: '15, 118, 110',
      isLarge: true,
      icon: (
        <div style={{ background: '#CCFBF1', borderRadius: 10, padding: 8, display: 'flex' }}>
          <BarChart3 size={20} color="#0F766E" />
        </div>
      ),
    },
    {
      variant: 'green',
      label: 'Across all results',
      value: `${avgScore}%`,
      title: 'Average Score',
      description: 'Mean score across every completed assessment in the workspace.',
      glowColor: '22, 163, 74',
      isLarge: true,
      icon: (
        <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 8, display: 'flex' }}>
          <Monitor size={20} color="#16A34A" />
        </div>
      ),
    },
    {
      variant: 'slate',
      label: 'Awaiting start',
      value: pendingAssignments,
      title: 'Pending Assignments',
      glowColor: '100, 116, 139',
      icon: (
        <div style={{ background: '#F1F5F9', borderRadius: 10, padding: 8, display: 'flex' }}>
          <Clock size={18} color="#475569" />
        </div>
      ),
    },
    {
      variant: 'white',
      label: 'Submitted/scored · 7 days',
      value: recentAttemptsCount,
      title: 'Recent Attempts',
      glowColor: '15, 118, 110',
      icon: (
        <div style={{ background: '#F0FDFA', borderRadius: 10, padding: 8, display: 'flex' }}>
          <Activity size={18} color="#0F766E" />
        </div>
      ),
    },
  ];

  return (
    <MagicBento
      cards={cards}
      textAutoHide={false}
      enableStars={true}
      enableSpotlight={true}
      enableBorderGlow={true}
      enableTilt={false}
      enableMagnetism={true}
      clickEffect={true}
      spotlightRadius={280}
      particleCount={8}
    />
  );
}
