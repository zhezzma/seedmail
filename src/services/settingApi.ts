import { API_BASE_URL, getHeaders, handleResponse } from './util';
import type { SystemSettings } from '../types/setting';

export const settingApi = {
    async update(settings: SystemSettings) {
        const response = await fetch(
            `${API_BASE_URL}/api/setting`,
            {
                headers: getHeaders(),
                method: 'POST',
                body: JSON.stringify(settings)
            }
        );
        handleResponse(response);
        return await response.json();
    },

    async get(): Promise<Record<string, any>> {
        const response = await fetch(
            `${API_BASE_URL}/api/setting`,
            {
                headers: getHeaders()
            }
        );

        handleResponse(response);
        return await response.json();
    },
}