"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { TEMPLATES } from '@/components/invitation-templates';
import { InvitationData } from '@/components/invitation-templates/types';

function InvitationRenderer() {
  const searchParams = useSearchParams();

  const template = searchParams.get('template') || 'classic_rose';
  const TemplateComponent = TEMPLATES[template];

  if (!TemplateComponent) return <div>Şablon bulunamadı</div>;

  const data: InvitationData = {
    brideFirstName: searchParams.get('brideFirstName') || 'Ayşe',
    brideLastName: searchParams.get('brideLastName') || 'Yılmaz',
    groomFirstName: searchParams.get('groomFirstName') || 'Mehmet',
    groomLastName: searchParams.get('groomLastName') || 'Demir',
    brideFatherName: searchParams.get('brideFatherName') || '',
    brideMotherName: searchParams.get('brideMotherName') || '',
    groomFatherName: searchParams.get('groomFatherName') || '',
    groomMotherName: searchParams.get('groomMotherName') || '',
    eventDate: searchParams.get('eventDate') || '2026-06-15',
    eventTime: searchParams.get('eventTime') || '14:00',
    eventType: (searchParams.get('eventType') as 'nikah' | 'dugun') || 'nikah',
    venueName: searchParams.get('venueName') || '',
    venueAddress: searchParams.get('venueAddress') || '',
    venueCity: searchParams.get('venueCity') || '',
    eventLink: searchParams.get('eventLink') || 'ayse-mehmet-demir',
    couplePhotoUrl: searchParams.get('couplePhotoUrl') || undefined,
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f0f0' }}>
      <div style={{ transform: 'scale(0.5)', transformOrigin: 'center center' }}>
        <TemplateComponent data={data} />
      </div>
    </div>
  );
}

export default function InvitationPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <InvitationRenderer />
    </Suspense>
  );
}
