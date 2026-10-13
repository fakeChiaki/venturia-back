import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { NaturalPersonProfile } from '../users/entities/natural-person-profile.entity';
import { MailService } from './mail.service';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NaturalPersonProfile)
    private readonly profileRepo: Repository<NaturalPersonProfile>,
    private readonly mailService: MailService,
  ) {}

  async notifyAccountCreated(
    userId: string,
    name: string,
    email: string,
  ): Promise<void> {
    await this.createAndSend(
      userId,
      NotificationType.ACCOUNT_CREATED,
      null,
      email,
      'Bienvenido a Venturia',
      this.templateAccountCreated(name),
    );
  }

  async notifyApplicationSubmitted(
    applicantProfileId: string,
    projectName: string,
  ): Promise<void> {
    const profile = await this.loadProfileWithUser(applicantProfileId);
    if (!profile) return;

    await this.createAndSend(
      profile.userId,
      NotificationType.APPLICATION_SUBMITTED,
      { projectName },
      profile.user.email,
      `Postulación recibida — ${projectName}`,
      this.templateApplicationSubmitted(profile.fullName, projectName),
    );
  }

  async notifyApplicationAccepted(
    applicantProfileId: string,
    projectName: string,
  ): Promise<void> {
    const profile = await this.loadProfileWithUser(applicantProfileId);
    if (!profile) return;

    await this.createAndSend(
      profile.userId,
      NotificationType.APPLICATION_ACCEPTED,
      { projectName },
      profile.user.email,
      `Tu postulación fue aceptada — ${projectName}`,
      this.templateApplicationAccepted(profile.fullName, projectName),
    );
  }

  async notifyApplicationRejected(
    applicantProfileId: string,
    projectName: string,
  ): Promise<void> {
    const profile = await this.loadProfileWithUser(applicantProfileId);
    if (!profile) return;

    await this.createAndSend(
      profile.userId,
      NotificationType.APPLICATION_REJECTED,
      { projectName },
      profile.user.email,
      `Tu postulación fue rechazada — ${projectName}`,
      this.templateApplicationRejected(profile.fullName, projectName),
    );
  }

  async notifyTeamCompleted(
    memberProfileIds: string[],
    projectName: string,
  ): Promise<void> {
    const profiles = await this.profileRepo.find({
      where: { id: In(memberProfileIds) },
      relations: { user: true },
    });

    await Promise.all(
      profiles.map((profile) =>
        this.createAndSend(
          profile.userId,
          NotificationType.TEAM_COMPLETED,
          { projectName },
          profile.user.email,
          `Equipo completo — ${projectName}`,
          this.templateTeamCompleted(profile.fullName, projectName),
        ),
      ),
    );
  }

  // ── Helpers privados ──────────────────────────────────────────────────────────

  private async createAndSend(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown> | null,
    email: string,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      await this.mailService.send(email, subject, html);
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId,
          type,
          payload,
          emailSentAt: new Date(),
        }),
      );
    } catch (err) {
      this.logger.error(
        `Error al procesar notificación ${type} para ${userId}: ${(err as Error).message}`,
      );
    }
  }

  private async loadProfileWithUser(profileId: string) {
    return this.profileRepo.findOne({
      where: { id: profileId },
      relations: { user: true },
    });
  }

  // ── Templates HTML ────────────────────────────────────────────────────────────

  private templateAccountCreated(name: string): string {
    return `
      <h2>¡Bienvenido a Venturia, ${name}!</h2>
      <p>Tu cuenta ha sido creada exitosamente.</p>
      <p>Ya puedes iniciar sesión y explorar los proyectos disponibles.</p>
    `;
  }

  private templateApplicationSubmitted(name: string, projectName: string): string {
    return `
      <h2>¡Postulación recibida, ${name}!</h2>
      <p>Tu postulación al proyecto <strong>${projectName}</strong> ha sido recibida exitosamente.</p>
      <p>La empresa revisará tu perfil y te notificaremos sobre el resultado.</p>
    `;
  }

  private templateApplicationAccepted(name: string, projectName: string): string {
    return `
      <h2>¡Felicitaciones, ${name}!</h2>
      <p>Tu postulación al proyecto <strong>${projectName}</strong> ha sido <strong>aceptada</strong>.</p>
      <p>Pronto recibirás más información sobre los próximos pasos.</p>
    `;
  }

  private templateApplicationRejected(name: string, projectName: string): string {
    return `
      <h2>Hola, ${name}</h2>
      <p>Lamentablemente, tu postulación al proyecto <strong>${projectName}</strong> no fue seleccionada en esta oportunidad.</p>
      <p>Te invitamos a seguir explorando otros proyectos en Venturia.</p>
    `;
  }

  private templateTeamCompleted(name: string, projectName: string): string {
    return `
      <h2>¡Equipo completo, ${name}!</h2>
      <p>El proyecto <strong>${projectName}</strong> ya tiene su equipo completo.</p>
      <p>Pronto se pondrán en contacto contigo para coordinar los próximos pasos.</p>
    `;
  }
}
