import { analyzeSentence } from '$lib/server/openrouter';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
    analyze: async ({ request }) => {
        const formData = await request.formData();
        const sentence = formData.get('sentence')?.toString().trim();
        const context = formData.get('context')?.toString().trim();

        if (!sentence) {
            return fail(400, {
                success: false,
                message: 'No sentence provided'
            });
        }

        try {
            const analysis = await analyzeSentence(sentence, context);
            return {
                success: true,
                data: analysis
            };
        } catch (error) {
            console.error('Analysis error:', error);
            return fail(500, {
                success: false,
                message:
                    error instanceof Error ? error.message : 'Analysis failed'
            });
        }
    }
};
