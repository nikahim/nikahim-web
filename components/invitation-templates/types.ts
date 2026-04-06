export interface InvitationData {
  brideFirstName: string;
  brideLastName: string;
  groomFirstName: string;
  groomLastName: string;
  brideFatherName?: string;
  brideMotherName?: string;
  groomFatherName?: string;
  groomMotherName?: string;
  eventDate: string;
  eventTime: string;
  eventType: 'nikah' | 'dugun';
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
  eventLink: string;
  couplePhotoUrl?: string;
}

export interface TemplateInfo {
  id: string;
  name: string;
  preview: string;
}
