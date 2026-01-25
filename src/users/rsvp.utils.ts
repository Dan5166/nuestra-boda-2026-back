import { ForbiddenException } from '@nestjs/common';
import { RSVP_DEADLINE } from './rsvp.config';

export function assertRsvpOpen() {
  const now = new Date();

  if (now > RSVP_DEADLINE) {
    throw new ForbiddenException(
      'El plazo para confirmar asistencia ha finalizado',
    );
  }
}
