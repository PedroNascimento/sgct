/**
 * Despachador de Eventos para a Fila de Notificações (Spec 008 / T008.7).
 * Integra os eventos das specs 004-007 com enqueueNotification.
 */

import type {
  PositionChangeEvent,
  PositionChangeEventDispatcher,
} from "@/domain/events/position-change";
import type { NotificationQueueRepository } from "@/domain/interfaces/notification-queue-repository";
import type { ProfileRepository } from "@/domain/interfaces/profile-repository";
import { enqueueNotification } from "@/use-cases/notifications/enqueue-notification";

export interface NotificationEventDispatcherConfig {
  queueRepository: NotificationQueueRepository;
  profileRepository: ProfileRepository;
  findUserEmail?: (userId: string) => Promise<string | null>;
}

export class NotificationEventDispatcher
  implements PositionChangeEventDispatcher
{
  private readonly queueRepository: NotificationQueueRepository;
  private readonly profileRepository: ProfileRepository;
  private readonly findUserEmail?: (userId: string) => Promise<string | null>;

  constructor(config: NotificationEventDispatcherConfig) {
    this.queueRepository = config.queueRepository;
    this.profileRepository = config.profileRepository;
    this.findUserEmail = config.findUserEmail;
  }

  /**
   * Consome evento de recálculo de posição (Spec 004 / T004.9).
   */
  async dispatch(event: PositionChangeEvent): Promise<void> {
    const profile = await this.profileRepository.findById(event.userId);
    if (!profile || !profile.stake_id) {
      return;
    }

    const email = this.findUserEmail
      ? await this.findUserEmail(event.userId)
      : null;

    if (!email) {
      return;
    }

    if (event.reason === "confirmed_within_capacity") {
      await enqueueNotification(
        {
          stakeId: profile.stake_id,
          eventType: "RESERVATION_CONFIRMED_QR",
          recipientId: event.userId,
          recipientEmail: email,
          recipientName: profile.full_name,
          payload: {
            reservationId: event.reservationId,
            caravanId: event.caravanId,
            newRank: event.newRank,
            previousRank: event.previousRank,
          },
        },
        { repository: this.queueRepository }
      );
    } else if (event.reason === "exceeded_capacity_waitlisted") {
      await enqueueNotification(
        {
          stakeId: profile.stake_id,
          eventType: "WAITLIST_PROMOTED",
          recipientId: event.userId,
          recipientEmail: email,
          recipientName: profile.full_name,
          payload: {
            reservationId: event.reservationId,
            caravanId: event.caravanId,
            newRank: event.newRank,
          },
        },
        { repository: this.queueRepository }
      );
    }
  }

  async notifyPaymentConfirmedWard(params: {
    stakeId: string;
    recipientId?: string | null;
    recipientEmail: string;
    recipientName?: string | null;
    wardName?: string;
    reservationId?: string;
  }): Promise<void> {
    await enqueueNotification(
      {
        stakeId: params.stakeId,
        eventType: "PAYMENT_CONFIRMED_WARD",
        recipientId: params.recipientId ?? null,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName ?? null,
        payload: {
          wardName: params.wardName,
          reservationId: params.reservationId,
        },
      },
      { repository: this.queueRepository }
    );
  }

  async notifyWaitlistPromoted(params: {
    stakeId: string;
    recipientId?: string | null;
    recipientEmail: string;
    recipientName?: string | null;
    assignedSeat?: number;
    caravanDepartureDate?: string;
    reservationId?: string;
  }): Promise<void> {
    await enqueueNotification(
      {
        stakeId: params.stakeId,
        eventType: "WAITLIST_PROMOTED",
        recipientId: params.recipientId ?? null,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName ?? null,
        payload: {
          assignedSeat: params.assignedSeat,
          caravanDepartureDate: params.caravanDepartureDate,
          reservationId: params.reservationId,
        },
      },
      { repository: this.queueRepository }
    );
  }

  async notifyMinorDecision(params: {
    stakeId: string;
    recipientId?: string | null;
    recipientEmail: string;
    recipientName?: string | null;
    status: "approved" | "rejected";
    rejectionReason?: string;
    reservationId?: string;
  }): Promise<void> {
    await enqueueNotification(
      {
        stakeId: params.stakeId,
        eventType: "MINOR_APPROVAL_DECISION",
        recipientId: params.recipientId ?? null,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName ?? null,
        payload: {
          status: params.status,
          rejectionReason: params.rejectionReason,
          reservationId: params.reservationId,
        },
      },
      { repository: this.queueRepository }
    );
  }

  async notifyCaravanCancelledQuorum(params: {
    stakeId: string;
    recipientId?: string | null;
    recipientEmail: string;
    recipientName?: string | null;
    caravanDepartureDate: string;
    reservationId?: string;
  }): Promise<void> {
    await enqueueNotification(
      {
        stakeId: params.stakeId,
        eventType: "CARAVAN_CANCELLED_QUORUM",
        recipientId: params.recipientId ?? null,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName ?? null,
        payload: {
          caravanDepartureDate: params.caravanDepartureDate,
          reservationId: params.reservationId,
        },
      },
      { repository: this.queueRepository }
    );
  }

  async notifyCreditExpiration(params: {
    stakeId: string;
    recipientId?: string | null;
    recipientEmail: string;
    recipientName?: string | null;
    creditAmount: number;
    expiresAt: string;
  }): Promise<void> {
    await enqueueNotification(
      {
        stakeId: params.stakeId,
        eventType: "CREDIT_EXPIRATION_ALERT",
        recipientId: params.recipientId ?? null,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName ?? null,
        payload: {
          creditAmount: params.creditAmount,
          expiresAt: params.expiresAt,
        },
      },
      { repository: this.queueRepository }
    );
  }
}
