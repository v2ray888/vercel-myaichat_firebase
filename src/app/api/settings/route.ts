
import { NextResponse, NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/lib/db';
import { settings as settingsTable } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Zod schema for validating incoming settings data for updates
const settingsUpdateSchema = z.object({
    welcomeMessage: z.string().optional(),
    offlineMessage: z.string().optional(),
    autoOpenWidget: z.boolean().optional(),
    allowCustomerImageUpload: z.boolean().optional(),
    allowAgentImageUpload: z.boolean().optional(),
    enableAiFeatures: z.boolean().optional(),
    brandLogoUrl: z.string().url().optional().or(z.literal('')),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    workspaceName: z.string().optional(),
    workspaceDomain: z.string().optional(),
});


export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('appId');

    // Scenario 1: Public request with an appId (for the widget)
    if (appId) {
        try {
            const publicSettings = await db.query.settings.findFirst({
                columns: {
                    id: true,
                    welcomeMessage: true,
                    offlineMessage: true,
                    autoOpenWidget: true,
                    brandLogoUrl: true,
                    primaryColor: true,
                    backgroundColor: true,
                    workspaceName: true,
                    allowCustomerImageUpload: true,
                },
                where: eq(settingsTable.id, appId),
            });

            if (!publicSettings) {
                return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
            }
            return NextResponse.json(publicSettings);

        } catch (error) {
            console.error('Failed to get public settings by appId:', error);
            return NextResponse.json({ error: 'Failed to retrieve settings' }, { status: 500 });
        }
    }

    // Scenario 2: Authenticated request from the dashboard
    const session = await getSession();
    if (session?.userId) {
        try {
            let userSettings = await db.query.settings.findFirst({
                where: eq(settingsTable.userId, session.userId),
            });

            // If no settings exist for the user, create a default entry
            if (!userSettings) {
                const newSettings = await db.insert(settingsTable).values({
                    userId: session.userId,
                    workspaceName: session.name || '我的公司',
                }).returning();
                userSettings = newSettings[0];
            }

            return NextResponse.json(userSettings);

        } catch (error) {
            console.error('Failed to get user settings:', error);
            return NextResponse.json({ error: 'Failed to retrieve settings' }, { status: 500 });
        }
    }

    // Scenario 3: Unauthenticated request (e.g., from homepage for guest user)
    // Try to return a default/first setting available.
    try {
        const defaultSettings = await db.query.settings.findFirst();
        if (defaultSettings) {
            return NextResponse.json(defaultSettings);
        } else {
             // If there are absolutely no settings in the DB, return a hardcoded default
            const fallbackSettings = {
                id: 'default-fallback-id',
                userId: 'default-fallback-user',
                welcomeMessage: '您好！我是智能客服，很高兴为您服务。',
                offlineMessage: '我们当前不在线，但您可以留言，我们会尽快回复您。',
                autoOpenWidget: true,
                allowCustomerImageUpload: true,
                allowAgentImageUpload: true,
                enableAiFeatures: true,
                brandLogoUrl: '',
                primaryColor: '#3F51B5',
                backgroundColor: '#F0F2F5',
                workspaceName: '智聊通',
            };
            return NextResponse.json(fallbackSettings);
        }
    } catch (error) {
        console.error('Failed to get default settings:', error);
        return NextResponse.json({ error: 'Failed to retrieve settings' }, { status: 500 });
    }
}


export async function POST(req: Request) {
    const session = await getSession();

    if (!session?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validation = settingsUpdateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid data', details: validation.error.flatten() }, { status: 400 });
        }
        
        const validatedData = validation.data;

        const updatedSettings = await db.update(settingsTable)
            .set({
                ...validatedData,
                updatedAt: new Date(),
            })
            .where(eq(settingsTable.userId, session.userId))
            .returning();
            
        if (updatedSettings.length === 0) {
            return NextResponse.json({ error: 'Settings not found for user' }, { status: 404 });
        }

        return NextResponse.json(updatedSettings[0]);

    } catch (error) {
        console.error('Failed to update settings:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
