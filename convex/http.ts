import type { WebhookEvent } from '@clerk/backend';
import { httpRouter } from 'convex/server';
import { Webhook } from 'svix';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';

const http = httpRouter();

http.route({
  path: '/user',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response('Error occured', { status: 400 });
    }
    switch (event.type) {
      case 'user.created':
        await ctx.runMutation(internal.users.createUser, {
          clerkId: event.data.id!,
          username: event.data.username || '',
          fullName:
            event.data.first_name || '' + ' ' + event.data.last_name || '',
          email: event.data.email_addresses![0].email_address!,
          profileImage: event.data.image_url!,
          level: 1,
          experience: 0,
          coins: 0,
          streak: 0,
          settings: {
            notifications: true,
            sound: true,
            vibration: true,
            darkMode: false,
            language: 'kr',
          },
        });
        break;

      //   case "user.updated":
      // await ctx.runMutation(internal.users.upsertFromClerk, {
      //   data: event.data,
      // });
      // break;

      //   case "user.deleted": {
      //     const clerkUserId = event.data.id!;
      //     await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
      //     break;
      //   }

      default:
        console.log('Ignored Clerk webhook event', event.type);
    }

    return new Response(null, { status: 200 });
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    'svix-id': req.headers.get('svix-id')!,
    'svix-timestamp': req.headers.get('svix-timestamp')!,
    'svix-signature': req.headers.get('svix-signature')!,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error('Error verifying webhook event', error);
    return null;
  }
}

export default http;
