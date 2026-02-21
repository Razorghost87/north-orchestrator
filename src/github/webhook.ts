import type { Request, Response } from 'express';
import { createRunContext, withContext } from '../core/context';
import { supabaseTools } from '../tools/supabase';

export async function handleGithubWebhook(req: Request, res: Response) {
    const deliveryId = req.headers['x-github-delivery'];

    if (!deliveryId || typeof deliveryId !== 'string') {
        return res.status(400).send('Missing x-github-delivery header');
    }

    const ctx = createRunContext('github', deliveryId);

    return withContext(ctx, 'Handle Webhook Dedupe', async () => {
        // Dedupe check
        const client = supabaseTools.getClient();

        const { data } = await client
            .from('webhook_dedupe')
            .select('id')
            .eq('id', deliveryId)
            .single();

        if (data) {
            console.log(`[GitHub Webhook] Ignoring duplicate delivery: ${deliveryId}`);
            return res.status(200).send('Duplicate delivery ignored');
        }

        // Insert delivery ID to mark as processed
        const { error: insertError } = await client
            .from('webhook_dedupe')
            .insert({ id: deliveryId });

        if (insertError) {
            console.error(`[GitHub Webhook] Failed to record delivery ID: ${insertError.message}`);
        }

        console.log(`[GitHub Webhook] Processing new delivery: ${deliveryId}`);
        // TODO: Processing logic
        return res.status(200).send('Webhook processed');
    });
}
