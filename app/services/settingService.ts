import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { settings } from '../db/schema';
import { D1Database } from '@cloudflare/workers-types';

/**
 * 获取系统设置
 */
export async function getSettings(
    db: D1Database,
    key: string
): Promise<string | null> {
    const d1 = drizzle(db);
    const result = await d1.select()
        .from(settings)
        .where(eq(settings.key, key))
        .get();

    return result?.value || null;
}

/**
 * 更新系统设置
 */
export async function updateSettings(
    db: D1Database,
    key: string,
    value: string
): Promise<void> {
    const d1 = drizzle(db);
    await d1
        .insert(settings)
        .values({
            key,
            value,
        })
        .onConflictDoUpdate({
            target: settings.key,
            set: { value },
        });
}

/**
 * 获取所有系统设置
 */
export async function getAllSettings(
    db: D1Database
): Promise<Array<{ key: string, value: string | null }>> {
    const d1 = drizzle(db);
    const results = await d1.select()
        .from(settings)
        .all();

    return results;
}

/**
 * 删除系统设置
 */
export async function deleteSettings(
    db: D1Database,
    key: string
): Promise<void> {
    const d1 = drizzle(db);
    await d1.delete(settings)
        .where(eq(settings.key, key));
}
