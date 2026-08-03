export interface DBNotificationPreference {
    user_id: string;
    email_security: boolean;
    email_marketing: boolean;
    login_alerts: boolean;
    product_updates: boolean;
}

export interface DBUserPreference {
    user_id: string;
    theme: "light" | "dark" | "system";
    language: string;
    timezone: string;
}