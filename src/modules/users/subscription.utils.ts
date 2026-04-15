import { UserDocument } from './schemas/user.schema';

export const FREE_TRIAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionStage = 'trial' | 'active' | 'expired';

export type SubscriptionSummary = {
  stage: SubscriptionStage;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  subscriptionStartedAt: Date | null;
  subscriptionEndsAt: Date | null;
  subscriptionMonths: number | null;
  subscriptionPlanLabel: string | null;
  daysRemaining: number;
  showExpiryWarning: boolean;
  isExpired: boolean;
};

type SubscriptionUserShape = Pick<
  UserDocument,
  | 'trialStartedAt'
  | 'trialEndsAt'
  | 'subscriptionStartedAt'
  | 'subscriptionEndsAt'
  | 'subscriptionMonths'
  | 'subscriptionPlanLabel'
>;

export function getTrialEndsAt(from = new Date()) {
  return new Date(from.getTime() + FREE_TRIAL_DAYS * DAY_MS);
}

export function addMonths(from: Date, months: number) {
  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function getDaysRemaining(endAt?: Date | null, now = new Date()) {
  if (!endAt) return 0;
  const diff = endAt.getTime() - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / DAY_MS);
}

export function buildSubscriptionSummary(
  user: SubscriptionUserShape,
  now = new Date(),
): SubscriptionSummary {
  const subscriptionEndsAt = user.subscriptionEndsAt ?? null;
  const trialEndsAt = user.trialEndsAt ?? null;

  if (subscriptionEndsAt && subscriptionEndsAt.getTime() > now.getTime()) {
    return {
      stage: 'active',
      trialStartedAt: user.trialStartedAt ?? null,
      trialEndsAt,
      subscriptionStartedAt: user.subscriptionStartedAt ?? null,
      subscriptionEndsAt,
      subscriptionMonths: user.subscriptionMonths ?? null,
      subscriptionPlanLabel: user.subscriptionPlanLabel ?? null,
      daysRemaining: getDaysRemaining(subscriptionEndsAt, now),
      showExpiryWarning: false,
      isExpired: false,
    };
  }

  if (trialEndsAt && trialEndsAt.getTime() > now.getTime()) {
    const daysRemaining = getDaysRemaining(trialEndsAt, now);
    return {
      stage: 'trial',
      trialStartedAt: user.trialStartedAt ?? null,
      trialEndsAt,
      subscriptionStartedAt: user.subscriptionStartedAt ?? null,
      subscriptionEndsAt,
      subscriptionMonths: user.subscriptionMonths ?? null,
      subscriptionPlanLabel: user.subscriptionPlanLabel ?? null,
      daysRemaining,
      showExpiryWarning: daysRemaining <= 1,
      isExpired: false,
    };
  }

  return {
    stage: 'expired',
    trialStartedAt: user.trialStartedAt ?? null,
    trialEndsAt,
    subscriptionStartedAt: user.subscriptionStartedAt ?? null,
    subscriptionEndsAt,
    subscriptionMonths: user.subscriptionMonths ?? null,
    subscriptionPlanLabel: user.subscriptionPlanLabel ?? null,
    daysRemaining: 0,
    showExpiryWarning: false,
    isExpired: true,
  };
}

