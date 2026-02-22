import { limiter } from '$lib/server/limiter';
import { analyzeSentence } from '$lib/server/openrouter';
import { toKana } from '$lib/utils';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
    analyze: async (event) => {
        try {
            // Rate limiting logic
            if (await limiter.isLimited(event)) {
                return fail(429, {
                    message:
                        "Whoa there fast fingers! The AI needs a coffee break. You've hit your limit of 30 generations per hour. Please come back later!"
                });
            }

            const { request } = event;
            const formData = await request.formData();
            const sentence = formData.get('sentence')?.toString().trim();
            const context = formData.get('context')?.toString().trim();

            if (!sentence) {
                return fail(400, { message: 'Sentence is required' });
            }

            if (sentence.length > 500) {
                return fail(400, { message: 'Sentence is too long' });
            }

            const kanaSentence = toKana(sentence);
            const analysis = await analyzeSentence(kanaSentence, context);

            return {
                success: true,
                inputSentence: sentence,
                displayedSentence: kanaSentence,
                context,
                data: analysis
            };
        } catch (e) {
            console.error('Analysis error:', e);
            const message = e instanceof Error ? e.message : 'Unknown error';
            return fail(500, { message });
        }
    }
} satisfies Actions;
