import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// TODO: replace these with your real Supabase project values.
// It is safe to expose the anon key in a frontend app.
const SUPABASE_URL = 'https://pnpwqcgetrzgnsmwrjng.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ww3Ye9DPzf55vsQY5JGBAA_5SCJQtmO';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private client: SupabaseClient | null = null;

    private readonly _user = signal<User | null>(null);
    readonly user = this._user.asReadonly();
    readonly isLoggedIn = computed(() => !!this._user());

    constructor() {
        if (SUPABASE_URL && SUPABASE_ANON_KEY) {
            this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            this.initAuth();
        } else {
            console.warn('Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in supabase.service.ts');
        }
    }

    private async initAuth() {
        if (!this.client) return;
        const {
            data: { session }
        } = await this.client.auth.getSession();
        this._user.set(session?.user ?? null);

        this.client.auth.onAuthStateChange((_event: string, session: { user: User | null } | null) => {
            this._user.set(session?.user ?? null);
        });
    }

    getClient(): SupabaseClient | null {
        return this.client;
    }

    async signInWithEmail(email: string) {
        if (!this.client) throw new Error('Supabase not configured (no client). Check SUPABASE_URL / ANON key.');
        return this.client.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
    }

    async signOut() {
        if (!this.client) return;
        await this.client.auth.signOut();
    }
}

