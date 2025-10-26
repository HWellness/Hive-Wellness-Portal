import Stripe from 'stripe';
import { createSecureStripeInstance } from './stripe-config';
import { db } from './db';
import { 
  subscriptionPackages, 
  userSubscriptions, 
  bulkBookingDiscounts, 
  bulkBookings,
  SubscriptionPackage,
  UserSubscription,
  BulkBooking
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const stripe = createSecureStripeInstance();

// Subscription package management
export async function createSubscriptionProduct(packageData: {
  name: string;
  description?: string;
  sessionCount: number;
  pricePerSession: number;
  discountPercentage?: number;
  billingInterval: 'one_time' | 'monthly' | 'quarterly' | 'annual';
  validityDays?: number;
  features?: any;
}) {
  try {
    // Calculate total price with discount
    const regularPrice = packageData.sessionCount * packageData.pricePerSession;
    const discountAmount = packageData.discountPercentage 
      ? regularPrice * (packageData.discountPercentage / 100)
      : 0;
    const totalPrice = regularPrice - discountAmount;

    // Create Stripe product
    const product = await stripe.products.create({
      name: packageData.name,
      description: packageData.description || `${packageData.sessionCount} therapy sessions package`,
      metadata: {
        sessionCount: packageData.sessionCount.toString(),
        pricePerSession: packageData.pricePerSession.toString(),
        discountPercentage: packageData.discountPercentage?.toString() || '0',
      }
    });

    // Create Stripe price
    const priceInPence = Math.round(totalPrice * 100);
    const stripePriceData: Stripe.PriceCreateParams = {
      product: product.id,
      currency: 'gbp',
      unit_amount: priceInPence,
    };

    // Add recurring billing if not one-time
    if (packageData.billingInterval !== 'one_time') {
      const intervalMap = {
        'monthly': 'month' as const,
        'quarterly': 'month' as const,
        'annual': 'year' as const,
      };
      stripePriceData.recurring = {
        interval: intervalMap[packageData.billingInterval],
        interval_count: packageData.billingInterval === 'quarterly' ? 3 : 1,
      };
    }

    const price = await stripe.prices.create(stripePriceData);

    // Store in database
    const packageId = nanoid();
    await db.insert(subscriptionPackages).values({
      id: packageId,
      name: packageData.name,
      description: packageData.description,
      sessionCount: packageData.sessionCount,
      pricePerSession: packageData.pricePerSession.toString(),
      discountPercentage: packageData.discountPercentage?.toString() || '0',
      totalPrice: totalPrice.toString(),
      billingInterval: packageData.billingInterval,
      stripeProductId: product.id,
      stripePriceId: price.id,
      isActive: true,
      features: packageData.features,
      validityDays: packageData.validityDays,
    });

    return {
      packageId,
      productId: product.id,
      priceId: price.id,
      totalPrice,
    };
  } catch (error) {
    console.error('Error creating subscription product:', error);
    throw new Error('Failed to create subscription product');
  }
}

// Create subscription for a user - PAYMENT INTENT ONLY (activation happens via webhook)
export async function createUserSubscription(
  userId: string,
  packageId: string,
  therapistId?: string,
  paymentMethodId?: string
) {
  try {
    // Get package details
    const [pkg] = await db
      .select()
      .from(subscriptionPackages)
      .where(eq(subscriptionPackages.id, packageId));

    if (!pkg) {
      throw new Error('Package not found');
    }

    // Get or create Stripe customer
    const users = await db.query.users.findMany({
      where: (u, { eq }) => eq(u.id, userId),
    });
    
    const user = users[0];
    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email || undefined,
        metadata: { userId },
      });
      customerId = customer.id;

      // Update user with customer ID
      const { users: usersTable } = await import('@shared/schema');
      await db.update(usersTable).set({
        stripeCustomerId: customerId,
      }).where(eq(usersTable.id, userId));
    }

    const subscriptionId = nanoid();
    let stripeSubscription: Stripe.Subscription | Stripe.PaymentIntent | null = null;

    // Get therapist Stripe Connect account from therapist_profiles if therapistId is provided
    let therapistStripeAccountId = '';
    if (therapistId) {
      const therapistProfiles = await db.query.therapistProfiles.findMany({
        where: (tp, { eq }) => eq(tp.userId, therapistId),
      });
      const therapistProfile = therapistProfiles[0];
      therapistStripeAccountId = therapistProfile?.stripeConnectAccountId || '';
      
      if (!therapistStripeAccountId) {
        console.warn(`⚠️ Therapist ${therapistId} does not have a Stripe Connect account configured`);
      }
    }

    // Create Stripe subscription or one-time payment
    if (pkg.billingInterval === 'one_time') {
      // One-time payment via payment intent with revenue split metadata
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(pkg.totalPrice) * 100),
        currency: 'gbp',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: paymentMethodId ? true : false,
        metadata: {
          userId,
          packageId,
          subscriptionId,
          type: 'package_purchase',
          therapistStripeAccountId,
          sessionFee: pkg.totalPrice,
          revenueSplit: '85/15',
        },
      });
      stripeSubscription = paymentIntent;
    } else {
      // Recurring subscription with revenue split metadata
      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: pkg.stripePriceId! }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
          packageId,
          subscriptionId,
          type: 'subscription',
          therapistStripeAccountId,
          sessionFee: pkg.totalPrice, // Use total billing amount for recurring subscriptions
          revenueSplit: '85/15',
        },
      };

      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      stripeSubscription = await stripe.subscriptions.create(subscriptionData);
    }

    // Calculate expiry date based on validity days
    let expiresAt: Date | null = null;
    if (pkg.validityDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);
    }

    // Store subscription in database with PENDING status - will be activated via webhook
    await db.insert(userSubscriptions).values({
      id: subscriptionId,
      userId,
      packageId,
      stripeSubscriptionId: stripeSubscription.id,
      status: 'pending', // CRITICAL: Only activate on payment confirmation
      sessionsTotal: pkg.sessionCount,
      sessionsUsed: 0,
      sessionsRemaining: 0, // CRITICAL: No sessions until payment confirmed
      currentPeriodStart: new Date(),
      currentPeriodEnd: pkg.billingInterval !== 'one_time' && 'current_period_end' in stripeSubscription
        ? new Date(stripeSubscription.current_period_end * 1000)
        : expiresAt,
      expiresAt,
      autoRenew: pkg.billingInterval !== 'one_time',
    });

    // Extract client secret for frontend
    let clientSecret: string | undefined;
    if (pkg.billingInterval === 'one_time') {
      clientSecret = (stripeSubscription as Stripe.PaymentIntent).client_secret || undefined;
    } else {
      const sub = stripeSubscription as Stripe.Subscription;
      const invoice = sub.latest_invoice as Stripe.Invoice;
      if (invoice && typeof invoice === 'object') {
        const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
        clientSecret = paymentIntent?.client_secret || undefined;
      }
    }

    return {
      subscriptionId,
      stripeSubscriptionId: stripeSubscription.id,
      clientSecret,
    };
  } catch (error) {
    console.error('Error creating user subscription:', error);
    throw new Error('Failed to create user subscription');
  }
}

// Cancel subscription
export async function cancelUserSubscription(subscriptionId: string, cancelAtPeriodEnd = true) {
  try {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.id, subscriptionId));

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Cancel in Stripe if recurring
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd,
      });
    }

    // Update database
    await db.update(userSubscriptions)
      .set({
        cancelAtPeriodEnd,
        cancelledAt: new Date(),
        status: cancelAtPeriodEnd ? 'active' : 'cancelled',
      })
      .where(eq(userSubscriptions.id, subscriptionId));

    return { success: true };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

// Bulk booking with discounts
export async function calculateBulkBookingDiscount(sessionCount: number) {
  try {
    const discounts = await db
      .select()
      .from(bulkBookingDiscounts)
      .where(eq(bulkBookingDiscounts.isActive, true));

    // Find applicable discount
    const applicableDiscount = discounts.find((d: any) => {
      const minMatch = sessionCount >= d.minSessions;
      const maxMatch = !d.maxSessions || sessionCount <= d.maxSessions;
      return minMatch && maxMatch;
    });

    if (!applicableDiscount) {
      return {
        discountPercentage: 0,
        discountAmount: 0,
        discountType: 'none' as const,
      };
    }

    return {
      discountId: applicableDiscount.id,
      discountPercentage: parseFloat(applicableDiscount.discountPercentage),
      discountType: applicableDiscount.discountType,
      fixedDiscountAmount: applicableDiscount.fixedDiscountAmount 
        ? parseFloat(applicableDiscount.fixedDiscountAmount)
        : 0,
    };
  } catch (error) {
    console.error('Error calculating bulk booking discount:', error);
    throw new Error('Failed to calculate bulk booking discount');
  }
}

export async function createBulkBooking(bookingData: {
  userId: string;
  therapistId: string;
  therapistStripeAccountId?: string;
  totalSessions: number;
  pricePerSession: number;
  bookingPattern?: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  recurringDay?: number;
  recurringTime?: string;
  startDate?: Date;
  paymentMethodId?: string;
}) {
  try {
    // Get therapist Stripe Connect account from therapist_profiles if not provided
    let therapistStripeAccountId = bookingData.therapistStripeAccountId;
    if (!therapistStripeAccountId) {
      const therapistProfiles = await db.query.therapistProfiles.findMany({
        where: (tp, { eq }) => eq(tp.userId, bookingData.therapistId),
      });
      const therapistProfile = therapistProfiles[0];
      therapistStripeAccountId = therapistProfile?.stripeConnectAccountId || '';
      
      if (!therapistStripeAccountId) {
        console.warn(`⚠️ Therapist ${bookingData.therapistId} does not have a Stripe Connect account configured`);
      }
    }
    
    // Calculate discount
    const discount = await calculateBulkBookingDiscount(bookingData.totalSessions);
    
    const regularTotal = bookingData.totalSessions * bookingData.pricePerSession;
    let discountAmount = 0;
    
    if (discount.discountType === 'percentage') {
      discountAmount = regularTotal * (discount.discountPercentage / 100);
    } else if (discount.discountType === 'fixed') {
      discountAmount = discount.fixedDiscountAmount;
    }
    
    const totalPrice = regularTotal - discountAmount;

    // Create payment intent for bulk booking with revenue split metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalPrice * 100),
      currency: 'gbp',
      payment_method: bookingData.paymentMethodId,
      confirm: bookingData.paymentMethodId ? true : false,
      metadata: {
        type: 'bulk_booking',
        userId: bookingData.userId,
        therapistId: bookingData.therapistId,
        therapistStripeAccountId: therapistStripeAccountId || '',
        totalSessions: bookingData.totalSessions.toString(),
        pricePerSession: bookingData.pricePerSession.toString(),
        discountAmount: discountAmount.toString(),
        sessionFee: totalPrice.toString(),
        revenueSplit: '85/15',
      },
    });

    // Create bulk booking record
    const bookingId = nanoid();
    await db.insert(bulkBookings).values({
      id: bookingId,
      userId: bookingData.userId,
      therapistId: bookingData.therapistId,
      totalSessions: bookingData.totalSessions,
      sessionsCompleted: 0,
      sessionsRemaining: bookingData.totalSessions,
      bookingPattern: bookingData.bookingPattern,
      recurringDay: bookingData.recurringDay || null,
      recurringTime: bookingData.recurringTime,
      startDate: bookingData.startDate,
      pricePerSession: bookingData.pricePerSession.toString(),
      discountApplied: discountAmount.toString(),
      totalPrice: totalPrice.toString(),
      stripePaymentIntentId: paymentIntent.id,
      status: 'pending',
      appointmentIds: [],
    });

    return {
      bookingId,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      totalPrice,
      discountAmount,
      sessionsIncluded: bookingData.totalSessions,
    };
  } catch (error) {
    console.error('Error creating bulk booking:', error);
    throw new Error('Failed to create bulk booking');
  }
}

// Webhook handler for subscription events
export async function handleSubscriptionWebhook(event: Stripe.Event) {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { subscriptionId, type, therapistStripeAccountId } = paymentIntent.metadata;

        // Handle package purchase activation
        if (type === 'package_purchase' && subscriptionId) {
          const [subscription] = await db
            .select()
            .from(userSubscriptions)
            .where(eq(userSubscriptions.id, subscriptionId));

          if (subscription) {
            const [pkg] = await db
              .select()
              .from(subscriptionPackages)
              .where(eq(subscriptionPackages.id, subscription.packageId));

            // ACTIVATE subscription and credit sessions ONLY on payment success
            await db.update(userSubscriptions)
              .set({
                status: 'active',
                sessionsRemaining: pkg?.sessionCount || 0,
              })
              .where(eq(userSubscriptions.id, subscriptionId));

            console.log(`✅ Subscription ${subscriptionId} activated with ${pkg?.sessionCount} sessions`);
          }
        }

        // Handle bulk booking activation
        if (type === 'bulk_booking') {
          const { userId, therapistId } = paymentIntent.metadata;
          const [booking] = await db
            .select()
            .from(bulkBookings)
            .where(eq(bulkBookings.stripePaymentIntentId, paymentIntent.id));

          if (booking) {
            await db.update(bulkBookings)
              .set({
                status: 'active',
              })
              .where(eq(bulkBookings.id, booking.id));

            console.log(`✅ Bulk booking ${booking.id} activated`);
          }
        }

        // Process revenue split if therapist account ID is provided
        if (therapistStripeAccountId) {
          const { createTransfer } = await import('./stripe-revenue-split');
          const sessionFee = paymentIntent.amount / 100; // Convert pence to pounds
          const therapistAmount = Math.round(sessionFee * 0.85 * 100); // 85% in pence

          await createTransfer({
            amount: therapistAmount,
            currency: 'gbp',
            destination: therapistStripeAccountId,
            source_transaction: paymentIntent.charges?.data[0]?.id,
            metadata: {
              paymentIntentId: paymentIntent.id,
              sessionFee: sessionFee.toString(),
              therapistPercentage: '85',
            },
          });

          console.log(`✅ Revenue split transfer created: £${therapistAmount / 100} to therapist`);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update subscription in database
        const status = subscription.status === 'active' ? 'active' : 
                      subscription.status === 'canceled' ? 'cancelled' : 
                      subscription.status === 'past_due' ? 'paused' : 'pending';
        
        const updateData: any = {
          status,
        };
        
        if ('current_period_start' in subscription) {
          updateData.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        }
        
        if ('current_period_end' in subscription) {
          updateData.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        }
        
        await db.update(userSubscriptions)
          .set(updateData)
          .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;
          
        if (subscriptionId) {
          // Activate or renew subscription on successful payment
          const [subscription] = await db
            .select()
            .from(userSubscriptions)
            .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));

          if (subscription) {
            const [pkg] = await db
              .select()
              .from(subscriptionPackages)
              .where(eq(subscriptionPackages.id, subscription.packageId));

            if (pkg) {
              // Activate pending subscriptions or renew active ones
              const updateData: any = {
                status: 'active',
                sessionsRemaining: pkg.sessionCount,
                sessionsUsed: 0,
              };

              await db.update(userSubscriptions)
                .set(updateData)
                .where(eq(userSubscriptions.id, subscription.id));

              console.log(`✅ Subscription ${subscription.id} ${subscription.status === 'pending' ? 'activated' : 'renewed'} with ${pkg.sessionCount} sessions`);
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id;
          
        if (subscriptionId) {
          await db.update(userSubscriptions)
            .set({
              status: 'paused',
            })
            .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));

          console.log(`❌ Subscription payment failed, status set to paused`);
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error handling subscription webhook:', error);
    throw error;
  }
}

// Decrement subscription session count
export async function useSubscriptionSession(userId: string) {
  try {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, 'active')
        )
      );

    if (!subscription || subscription.sessionsRemaining <= 0) {
      return null;
    }

    await db.update(userSubscriptions)
      .set({
        sessionsUsed: subscription.sessionsUsed + 1,
        sessionsRemaining: subscription.sessionsRemaining - 1,
      })
      .where(eq(userSubscriptions.id, subscription.id));

    return subscription;
  } catch (error) {
    console.error('Error using subscription session:', error);
    throw error;
  }
}
