"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { TEMPLATES } from '@/components/invitation-templates';
import { InvitationData } from '@/components/invitation-templates/types';

function RenderContent() {
  const searchParams = useSearchParams();

  const template = searchParams.get('template') || 'classic_rose';
  const TemplateComponent = TEMPLATES[template];

  if (!TemplateComponent) return null;

  const data: InvitationData = {
    brideFirstName: searchParams.get('brideFirstName') || '',
    brideLastName: searchParams.get('brideLastName') || '',
    groomFirstName: searchParams.get('groomFirstName') || '',
    groomLastName: searchParams.get('groomLastName') || '',
    brideFatherName: searchParams.get('brideFatherName') || '',
    brideMotherName: searchParams.get('brideMotherName') || '',
    groomFatherName: searchParams.get('groomFatherName') || '',
    groomMotherName: searchParams.get('groomMotherName') || '',
    eventDate: searchParams.get('eventDate') || '',
    eventTime: searchParams.get('eventTime') || '',
    eventType: (searchParams.get('eventType') as 'nikah' | 'dugun') || 'nikah',
    venueName: searchParams.get('venueName') || '',
    venueAddress: searchParams.get('venueAddress') || '',
    venueCity: searchParams.get('venueCity') || '',
    eventLink: searchParams.get('eventLink') || '',
    couplePhotoUrl: searchParams.get('couplePhotoUrl') || undefined,
  };

  return <TemplateComponent data={data} />;
}

export default function RenderPage() {
  return (
    <Suspense fallback={null}>
      <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        </head>
        <body style={{ margin: 0, padding: 0 }}>
          <RenderContent />
        </body>
      </html>
    </Suspense>
  );
}
