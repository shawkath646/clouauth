export interface DBUser {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar: string;
    bio?: string | null;
    date_of_birth?: string | null;
    pronouns?: string | null;
    username_last_changed?: Date | null;
    account_status?: {
        is_active: boolean;
        self_enable: boolean;
        reason: string | null;
    } | null;
    created_on: Date;
    updated_on: Date;
}

export interface DBUserEmail {
    id: string;
    user_id: string;
    address: string;
    verified: boolean;
    is_primary: boolean;
    added_on: Date;
    verified_on?: Date | null;
}

export interface DBAddress {
    id: string;
    user_id: string;
    type: string;
    address_1: string;
    address_2?: string | null;
    city: string;
    state?: string | null;
    zip_code: string;
    country: string;
    is_default: boolean;
}
